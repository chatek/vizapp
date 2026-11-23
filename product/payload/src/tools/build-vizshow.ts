import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';

import type { CustomTool, CustomToolFactory } from '@oh-my-pi/pi-coding-agent';

/* ------------------------------------------------------------------ *
 * Per-prompt VizShow builds
 *
 * The three render* tools write a lesson into `src/lessons/` — a source file
 * that appears in the running dev server. `buildVizShow` is the SNAPSHOT step:
 * it bundles exactly one lesson into a self-contained artefact under
 * `~/.vizmaster/vizshow/<build-id>/`, which the desktop's loopback static
 * server mounts for the Browser pane. One directory per prompt; a re-prompt
 * makes a NEW directory and never mutates an old one.
 * ------------------------------------------------------------------ */

const OUTPUT_ENV = 'VIZMASTER_VIZSHOW_DIR';
const BUILD_CONFIG = 'vite.vizshow.config.ts';
/** Where the entry shim lives inside the project (gitignored, per-build). */
const ENTRY_DIR = '.vizshow';
/** Lessons may only be built from the source trees that hold tutorials. */
const BUILDABLE_ROOTS = [join('src', 'lessons'), join('src', 'tutorials')];

function zodParameters(schema: unknown): CustomTool['parameters'] {
  return schema as CustomTool['parameters'];
}

/** Root that holds one directory per prompt-built VizShow. */
function vizshowRoot(): string {
  const override = process.env[OUTPUT_ENV];
  return override !== undefined && override.trim() !== '' ? resolve(override) : join(homedir(), '.vizmaster', 'vizshow');
}

/** `YYYYMMDDTHHmmssZ` — UTC, so builds sort lexically across machines. */
function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/g, '');
  return slug.length > 0 ? slug : fallback;
}

/**
 * Build identity: UTC stamp + slug + 4 random hex.
 *
 * The stamp makes builds orderable and human-readable; the slug makes them
 * recognisable in a directory listing; the 4 hex are collision insurance when
 * two prompts land in the same second (the stamp alone is only second-granular,
 * and a re-prompt that shares a second must still produce a DISTINCT directory).
 */
function makeBuildId(prompt: string, entryId: string, now: Date): string {
  const slug = slugify(prompt, slugify(entryId, 'vizshow'));
  return `${utcStamp(now)}-${slug}-${randomBytes(2).toString('hex')}`;
}

/** Resolve a lesson path and refuse anything outside the buildable trees. */
function resolveEntry(cwd: string, entry: string): { absolute: string; relativePath: string } {
  if (entry.trim() === '') throw new Error('entry must name a lesson file');
  if (isAbsolute(entry)) throw new Error('entry must be a project-relative path, not absolute');
  if (entry.includes('..')) throw new Error('entry must not contain ".."');

  const absolute = resolve(cwd, entry);
  const inside = BUILDABLE_ROOTS.some((root) => {
    const base = resolve(cwd, root);
    return absolute === base || absolute.startsWith(`${base}${sep}`);
  });
  if (!inside) {
    throw new Error(`entry must live under ${BUILDABLE_ROOTS.join(' or ')}`);
  }
  if (!existsSync(absolute)) throw new Error(`entry does not exist: ${entry}`);
  if (!absolute.endsWith('.tsx')) throw new Error('entry must be a .tsx lesson');
  return { absolute, relativePath: relative(cwd, absolute) };
}

/** Locate the project's vite CLI, tolerating a hoisted install (monorepo/workspaces). */
function resolveViteBin(cwd: string): string | null {
  const direct = join(cwd, 'node_modules', 'vite', 'bin', 'vite.js');
  if (existsSync(direct)) return direct;
  try {
    // `vite/package.json` is the only path vite's exports map admits; resolve it
    // (Node walks parent node_modules, so a workspace hoist is found) and derive
    // the CLI next to it.
    const manifest = createRequire(join(cwd, 'package.json')).resolve('vite/package.json');
    const bin = join(dirname(manifest), 'bin', 'vite.js');
    return existsSync(bin) ? bin : null;
  } catch {
    return null;
  }
}

/** True when `candidate` runs as Node: `node --version` prints vN.N.N. */
function isNodeRuntime(candidate: string): boolean {
  if (!candidate || !existsSync(candidate)) return false;
  try {
    const output = execFileSync(candidate, ['--version'], {
      encoding: 'utf8',
      timeout: 5_000,
      stdio: ['ignore', 'pipe', 'pipe'],
      // An Electron binary only speaks node when asked; without this the probe
      // would launch the desktop app instead of printing its node version.
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    }).trim();
    // The harness binary (omp) prints its own product version here, never `vN.N.N`.
    return /^v\d+\.\d+\.\d+/.test(output);
  } catch {
    return false;
  }
}

/**
 * Resolve a real Node.js runtime for the vite child process.
 *
 * `process.execPath` is NOT always node: inside an OMP/harness session it points
 * at the harness binary, which parses `--config vite.vizshow.config.ts` as its
 * own override and dies on it (the reported `buildVizShow` failure). Order:
 * explicit env override, the npm-provided node path, `process.execPath` when it
 * really is node, then PATH. Throws a named error instead of letting the child
 * fail with a confusing parse error.
 */
export function resolveJsRuntime(env: NodeJS.ProcessEnv = process.env): string {
  for (const name of ['VIZMASTER_NODE', 'VCLAW_NODE', 'npm_node_execpath', 'NODE']) {
    const candidate = env[name]?.trim();
    if (candidate && isNodeRuntime(candidate)) return candidate;
  }
  if (isNodeRuntime(process.execPath)) return process.execPath;
  const lookup = process.platform === 'win32' ? 'where' : 'which';
  try {
    for (const line of execFileSync(lookup, ['node'], { encoding: 'utf8', timeout: 5_000 }).split(/\r?\n/)) {
      const candidate = line.trim();
      if (candidate && isNodeRuntime(candidate)) return candidate;
    }
  } catch {
    // fall through to the named error
  }
  throw new Error(
    'no Node.js runtime for the VizShow build: process.execPath is the harness binary, not node, and no node was found on PATH. ' +
      'Set VIZMASTER_NODE=/absolute/path/to/node and retry.',
  );
}

/** Run the single-entry vite build; resolves with the tail of stderr on failure. */
async function runViteBuild(cwd: string, entryAbsolute: string, outDir: string): Promise<void> {
  const viteBin = resolveViteBin(cwd);
  if (viteBin === null) {
    throw new Error('vite is not installed in this project — run `npm ci --ignore-scripts` first');
  }
  const jsRuntime = resolveJsRuntime();

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(jsRuntime, [viteBin, 'build', '--config', BUILD_CONFIG, '--logLevel', 'warn'], {
      cwd,
      env: {
        ...process.env,
        // Harmless for a real node; required when the resolved runtime is Electron.
        ELECTRON_RUN_AS_NODE: '1',
        VIZSHOW_ENTRY: entryAbsolute,
        VIZSHOW_OUTDIR: outDir,
        // Without ROOT the config keeps the project root, so a nested entry page
        // (src/lessons/<build>/index.html) is emitted at its nested path and the
        // artefact never gets a top-level index.html — the exact smoke failure.
        VIZSHOW_ROOT: dirname(entryAbsolute),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.once('error', (error) => rejectPromise(new Error(`vite build could not start: ${error.message}`)));
    child.once('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      const tail = output.trim().split('\n').slice(-12).join('\n');
      rejectPromise(new Error(`vite build failed (exit ${String(code)}):\n${tail}`));
    });
  });
}

interface BuildVizShowInput {
  prompt: string;
  entry: string;
  toolsUsed?: string[];
}

interface BuildRecord {
  id: string;
  prompt: string;
  createdAt: string;
  toolsUsed: string[];
  /** The served page inside the build directory; the desktop mounts `/<id>/` on it. */
  entry: string;
  /** The lesson that was bundled, project-relative — provenance, NOT a served path. */
  lesson: string;
  status: 'done';
}

const factory: CustomToolFactory = (pi) => {
  const tool: CustomTool = {
    name: 'buildVizShow',
    label: 'Build VizShow',
    description:
      'VizMaster tool: bundles ONE lesson (src/lessons/*.tsx or src/tutorials/*.tsx) into a self-contained VizShow ' +
      'artefact at ~/.vizmaster/vizshow/<build-id>/ (standalone index.html + hashed assets + BUILD.json), which the ' +
      'VClaw desktop previews in its Browser pane. Call it AFTER the render* tools wrote the lesson. A re-prompt ' +
      'creates a NEW directory; existing builds are never modified. Returns {buildId, path, url}.',
    parameters: zodParameters(
      pi.zod.object({
        prompt: pi.zod
          .string()
          .min(1)
          .max(500)
          .describe('The user prompt this VizShow answers, verbatim — stored in BUILD.json and used in the build id.'),
        entry: pi.zod
          .string()
          .min(1)
          .describe('Project-relative path of the lesson to bundle, e.g. "src/lessons/quadratic-…​.tsx".'),
        toolsUsed: pi.zod
          .array(pi.zod.string())
          .optional()
          .describe('Names of the render tools that produced the lesson, recorded in BUILD.json for provenance.'),
      }),
    ),

    async execute(_toolCallId, params: BuildVizShowInput, _onUpdate, _ctx, _signal) {
      const cwd = pi.cwd;
      const now = new Date();
      const entry = resolveEntry(cwd, params.entry);
      const entryId = basename(entry.relativePath, '.tsx');
      const buildId = makeBuildId(params.prompt, entryId, now);

      const toolsUsed = params.toolsUsed ?? [];
      const record: BuildRecord = {
        id: buildId,
        prompt: params.prompt,
        createdAt: now.toISOString(),
        toolsUsed,
        // The desktop resolves `/<build-id>/` to this file inside the build
        // directory. It is ALWAYS index.html for our artefacts; the lesson that
        // was bundled is recorded separately so the two meanings cannot drift
        // (the server ignores `entry` when serving, but a future deep link
        // would not, and "src/lessons/x.tsx" is not a servable path).
        entry: 'index.html',
        lesson: entry.relativePath.split(sep).join('/'),
        status: 'done',
      };

      const root = vizshowRoot();
      const staging = join(root, `.staging-${buildId}`);
      const finalDir = join(root, buildId);
      const entryDir = join(cwd, ENTRY_DIR, buildId);
      const entryFile = join(entryDir, 'entry.tsx');
      const entryHtml = join(entryDir, 'index.html');

      // Cleanup is best-effort on every exit path: a half-written staging area
      // must never become visible to the desktop's fs.watch.
      try {
        await mkdir(entryDir, { recursive: true });
        await mkdir(staging, { recursive: true });

        const lessonImport = relative(entryDir, entry.absolute).split(sep).join('/');
        const mountImport = relative(entryDir, join(cwd, 'src', 'lib', 'vizshow-standalone')).split(sep).join('/');
        await writeFile(
          entryFile,
          [
            `import Component from '${lessonImport}';`,
            `import { mountVizShow } from '${mountImport}';`,
            '',
            'mountVizShow(Component);',
            '',
          ].join('\n'),
          'utf8',
        );
        // Vite emits an `index.html` only when the Rollup INPUT is HTML; a .tsx
        // input yields JS/CSS alone. The generated page is the artefact's root.
        await writeFile(
          entryHtml,
          [
            '<!doctype html>',
            '<html lang="en">',
            '  <head>',
            '    <meta charset="UTF-8" />',
            '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
            '    <title>VizShow</title>',
            '  </head>',
            '  <body>',
            '    <div id="root"></div>',
            '    <script type="module" src="./entry.tsx"></script>',
            '  </body>',
            '</html>',
            '',
          ].join('\n'),
          'utf8',
        );

        await runViteBuild(cwd, entryHtml, staging);

        await writeFile(join(staging, 'BUILD.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');

        // Atomic publish: the directory appears complete or not at all.
        await rm(finalDir, { recursive: true, force: true });
        await rename(staging, finalDir);
      } finally {
        await rm(entryDir, { recursive: true, force: true }).catch(() => {});
        await rm(staging, { recursive: true, force: true }).catch(() => {});
      }

      return {
        content: [
          {
            type: 'text',
            text:
              `${finalDir}\nStandalone VizShow built (${buildId}) — the desktop previews it at vizshow://${buildId} ` +
              `(served under /${buildId}/). BUILD.json records the prompt and tools used.`,
          },
        ],
        details: {
          buildId,
          path: finalDir,
          url: `vizshow://${buildId}`,
          relativePath: `/${buildId}/`,
          prompt: record.prompt,
          entry: record.entry,
          lesson: record.lesson,
          toolsUsed: record.toolsUsed,
          createdAt: record.createdAt,
        },
      };
    },
  };

  return [tool];
};

export default factory;
