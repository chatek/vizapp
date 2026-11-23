import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import type { CustomTool, CustomToolFactory } from '@oh-my-pi/pi-coding-agent';

import { startAssertionPusher } from './agent-assertion';

/** The session-scoped assertion pusher; null while no payload session is open. */
let assertionPusher: { stop(): void } | undefined;

/* ------------------------------------------------------------------ *
 * shareVizShowDraft — the agent half of the C1 auto-draft affordance.
 *
 * The tool creates a PRIVATE, consent-free draft in the VizRegistry via
 * the desktop's loopback vizshare broker. Everything that must stay
 * human — consent, the poster, the submit tap — is structurally absent
 * from this tool: the schema has no field for it, the wire body cannot
 * carry it, and the agent capability cannot reach any submit surface
 * (SHARE_DRAFT_SPEC.md §3, §6). The human completes the draft from the
 * ShareSheet's draft-review mode (POST /v1/drafts/:id/submit).
 *
 * Imports are node builtins + @oh-my-pi/pi-coding-agent types only —
 * the payload standalone rule refuses @vizmaster/* and workspace: deps.
 * ------------------------------------------------------------------ */

const CAP_ENV = 'VIZMASTER_VIZSHARE_CAP';
/** The broker chains up to two 30 s registry requests (api.ts REQUEST_TIMEOUT_MS). */
const DRAFT_TIMEOUT_MS = 90_000;

interface ShareVizShowDraftInput {
  buildId: string;
  tutorialId: string;
  kind: 'elucim' | 'vectorplay' | 'three';
  params: Record<string, number | boolean | string>;
  frame?: number;
  reproducible: boolean;
  title: string;
  blurb: string;
  tags: string[];
  subject: string;
  grade?: number;
  lang: string;
}

/** The broker's file-delivered capability (vizshare/index.ts writeAgentCapability). */
interface AgentCap {
  version: number;
  pid: number;
  port: number;
  cap: string;
}

interface DraftReply {
  draftId: string;
  state: 'draft';
  poster: 'attached' | 'pending-review';
  revision: number;
}

function zodParameters(schema: unknown): CustomTool['parameters'] {
  return schema as CustomTool['parameters'];
}

/** Same override pattern as VIZMASTER_VIZSHOW_DIR in build-vizshow.ts. */
function capPath(): string {
  const override = process.env[CAP_ENV];
  if (override !== undefined && override.length > 0) return override;
  return join(homedir(), '.vizmaster', 'vizshare-agent-cap');
}

/** Read and shape-validate the capability file; the message explains every refusal. */
async function readAgentCap(): Promise<{ cap: AgentCap } | { error: string }> {
  let text: string;
  try {
    text = await readFile(capPath(), 'utf8');
  } catch {
    return {
      error:
        `No vizshare agent capability found at ${capPath()}. The VClaw desktop app writes it when the ` +
        'share broker starts; tell the user to open the desktop app (and sign in) first. No draft was created.',
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: `The vizshare agent capability at ${capPath()} is not valid JSON. No draft was created.` };
  }
  const raw = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    typeof raw.pid !== 'number' ||
    !Number.isInteger(raw.pid) ||
    typeof raw.port !== 'number' ||
    !Number.isInteger(raw.port) ||
    raw.port < 1 ||
    raw.port > 65535 ||
    typeof raw.cap !== 'string' ||
    raw.cap.length === 0
  ) {
    return { error: `The vizshare agent capability at ${capPath()} has an unexpected shape. No draft was created.` };
  }
  const pid = raw.pid;
  const port = raw.port;
  // Optional liveness pre-check (spec §3.2): detect a stale file before dialling.
  try {
    process.kill(pid, 0);
  } catch {
    return {
      error:
        `The vizshare broker (pid ${pid}) behind the capability at ${capPath()} is not running. ` +
        'Tell the user to restart the VClaw desktop app; no draft was created.',
    };
  }
  return { cap: { version: 1, pid, port, cap: raw.cap } };
}

/** Accept both the broker's `{error:"code"}` and the registry-passed `{error:{code,message}}`. */
function failureOf(body: unknown, status: number): { code: string; message: string } {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as Record<string, unknown>).error;
    if (typeof error === 'string') {
      const message = typeof (body as Record<string, unknown>).message === 'string' ? ((body as Record<string, unknown>).message as string) : '';
      return { code: error, message };
    }
    if (typeof error === 'object' && error !== null) {
      const detail = error as Record<string, unknown>;
      return {
        code: typeof detail.code === 'string' ? detail.code : 'http_error',
        message: typeof detail.message === 'string' ? detail.message : `The broker replied ${status}.`,
      };
    }
  }
  return { code: 'http_error', message: `The broker replied ${status}.` };
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function draftBody(input: ShareVizShowDraftInput): Record<string, unknown> {
  // Exactly the §3.1 fields — no consent, no poster, no promptExcerpt,
  // no provenance, no handle. The absence is the design.
  return {
    buildId: input.buildId,
    tutorialId: input.tutorialId,
    kind: input.kind,
    params: input.params,
    ...(input.frame === undefined ? {} : { frame: input.frame }),
    reproducible: input.reproducible,
    title: input.title,
    blurb: input.blurb,
    tags: input.tags,
    subject: input.subject,
    ...(input.grade === undefined ? {} : { grade: input.grade }),
    lang: input.lang,
  };
}

/**
 * R1 duplicate check: after an ambiguous transport failure the registry may
 * already hold the draft, and createDraft has no Idempotency-Key. Look in
 * /v1/mine (agent-cap-allowed) for a draft with the same tutorialId + title
 * before any re-POST — never blind-retry.
 */
async function findExistingDraft(port: number, cap: string, input: ShareVizShowDraftInput): Promise<DraftReply | null> {
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:${port}/v1/mine`, {
      headers: { 'x-vizshare-cap': cap },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const body = await readBody(response);
  const shows =
    Array.isArray(body)
      ? body
      : typeof body === 'object' && body !== null && Array.isArray((body as Record<string, unknown>).shows)
        ? ((body as Record<string, unknown>).shows as unknown[])
        : [];
  for (const show of shows) {
    if (typeof show !== 'object' || show === null) continue;
    const record = show as Record<string, unknown>;
    if (record.tutorialId !== input.tutorialId || record.title !== input.title || record.status !== 'draft') continue;
    return {
      draftId: typeof record.id === 'string' ? record.id : '',
      state: 'draft',
      poster:
        typeof (record.artifacts as Record<string, unknown> | undefined)?.poster === 'object' ? 'attached' : 'pending-review',
      revision: typeof record.revision === 'number' ? record.revision : 1,
    };
  }
  return null;
}

/** A structured error text — never a throw — so the agent can inform the user and continue. */
function errorResult(code: string, message: string): { content: [{ type: 'text'; text: string }]; details: Record<string, unknown> } {
  return {
    content: [{ type: 'text', text: `shareVizShowDraft did not create a draft (${code}): ${message}` }],
    details: { state: 'error', code },
  };
}

const RECOVERABLE_EXPLANATIONS: Record<string, string> = {
  reauth_required:
    'The user is not signed in to the VizRegistry. Ask them to sign in from the VClaw desktop app (there is no agent sign-in path), then call this tool again.',
  not_member: 'The signed-in account is not a vcc member, so the VizRegistry refuses drafts. No draft was created.',
  capability_unknown:
    'The lesson id is not in the shipped catalogue, so the registry refuses the draft. This is expected for freshly generated lessons; do not retry with the same tutorialId.',
  registry_unreachable:
    'The VizRegistry could not be reached (offline or down). Nothing is lost — builds are immutable; call this tool again later.',
};

const factory: CustomToolFactory = (pi) => {
  const tool: CustomTool = {
    name: 'shareVizShowDraft',
    label: 'Share VizShow Draft',
    description:
      'VizMaster tool: creates a PRIVATE draft of a built VizShow in the VizRegistry through the VClaw desktop share ' +
      'broker, using the buildId from buildVizShow. Call it ONCE per build, after buildVizShow succeeds. The draft has ' +
      'no consent and no poster on purpose: the user reviews it in the share sheet ("pending your review") and submits ' +
      'it themselves — consent, the poster and the submit tap are human-only steps. NEVER retry this or any other ' +
      'submit-shaped operation on ambiguous failure: report the outcome to the user instead.',
    parameters: zodParameters(
      pi.zod
        .object({
          buildId: pi.zod
            .string()
            .min(1)
            .max(64)
            .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/)
            .describe('The buildId from buildVizShow — joins the draft to the local build for poster capture.'),
          tutorialId: pi.zod
            .string()
            .min(1)
            .max(64)
            .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/)
            .describe('The lesson id that was bundled (filename stem). Must be in the shipped catalogue.'),
          kind: pi.zod.enum(['elucim', 'vectorplay', 'three']),
          params: pi.zod.record(pi.zod.union([pi.zod.number(), pi.zod.boolean(), pi.zod.string()])),
          frame: pi.zod
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Required for elucim; the frame the poster represents. Patchable at review.'),
          reproducible: pi.zod.boolean(),
          title: pi.zod.string().min(8).max(80),
          blurb: pi.zod.string().min(40).max(280),
          tags: pi.zod.array(pi.zod.string().min(1).max(24)).min(1).max(8),
          subject: pi.zod.string().min(1).max(64),
          grade: pi.zod.number().int().min(1).max(12).optional(),
          lang: pi.zod.string().min(2).max(12).regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/),
        })
        // The non-delegability is mechanical, not behavioural (spec §3.1/§4.7):
        // strict() refuses ANY unknown key, so a body carrying consent, poster,
        // promptExcerpt, provenance or handle fails zod before it can reach the wire.
        .strict(),
    ),

    async execute(_toolCallId, params: ShareVizShowDraftInput, _onUpdate, _ctx, _signal) {
      const found = await readAgentCap();
      if ('error' in found) return errorResult('no_capability', found.error);
      let { port, cap } = found.cap;

      const post = (): Promise<Response> =>
        fetch(`http://127.0.0.1:${port}/v1/draft`, {
          method: 'POST',
          // Never localhost: the broker enforces the exact Host authority.
          headers: { 'content-type': 'application/json', 'x-vizshare-cap': cap },
          body: JSON.stringify(draftBody(params)),
          signal: AbortSignal.timeout(DRAFT_TIMEOUT_MS),
        });

      let response: Response;
      try {
        response = await post();
      } catch (error) {
        // Ambiguous transport failure (timeout/abort after send): check for an
        // already-created draft before reporting — never blind-retry (§3.3, R1).
        const reread = await readAgentCap();
        if ('cap' in reread) ({ port, cap } = reread.cap);
        const existing = await findExistingDraft(port, cap, params);
        if (existing !== null && existing.draftId.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text:
                  `Private draft ${existing.draftId} already exists in the VizRegistry (poster: ` +
                  `${existing.poster === 'attached' ? 'attached' : 'pending review'}). The earlier attempt reached the ` +
                  'registry despite the network error. The user reviews and submits it from the share sheet.',
              },
            ],
            details: existing,
          };
        }
        return errorResult(
          'broker_unreachable',
          `The VClaw desktop share broker could not be reached: ${error instanceof Error ? error.message : String(error)}. ` +
            'Tell the user to make sure the desktop app is running; no duplicate was created.',
        );
      }

      if (response.status === 403) {
        const preliminary = failureOf(await readBody(response), 403);
        // R8 stale cap: a broker restart rebinds a new port; re-read the file once before failing.
        if (preliminary.code === 'invalid_cap') {
          const reread = await readAgentCap();
          if ('cap' in reread) {
            ({ port, cap } = reread.cap);
            try {
              response = await post();
            } catch (error) {
              return errorResult(
                'broker_unreachable',
                `The VClaw desktop share broker could not be reached after refreshing the capability: ${error instanceof Error ? error.message : String(error)}.`,
              );
            }
          }
        }
      }

      if (!response.ok) {
        const { code, message } = failureOf(await readBody(response), response.status);
        return errorResult(code, RECOVERABLE_EXPLANATIONS[code] ?? (message.length > 0 ? message : `The broker replied ${response.status}.`));
      }

      const body = (await readBody(response)) as Record<string, unknown> | null;
      const id = typeof body?.id === 'string' ? body.id : '';
      if (id.length === 0) {
        return errorResult('bad_response', 'The broker accepted the draft but did not return an id.');
      }
      const details: DraftReply = {
        draftId: id,
        state: 'draft',
        poster: body?.poster === 'attached' ? 'attached' : 'pending-review',
        revision: typeof body?.revision === 'number' ? body.revision : 1,
      };
      return {
        content: [
          {
            type: 'text',
            text:
              `Private draft ${id} created in the VizRegistry (poster: ${details.poster === 'attached' ? 'attached' : 'pending review'}). ` +
              'The user reviews and submits it from the share sheet.',
          },
        ],
        details,
      };
    },

    // Broker-retirement step 2 (spec §3.2 A): this tool's session lifecycle
    // also drives the REGISTRY-assertion pusher — the agent process owns the
    // seed, so it mints (aud vizmaster-registry-vcc) and pushes to the
    // broker's RAM cache while a session is open. No new tool surface; the
    // pusher is invisible to the model.
    onSession(event) {
      if (event.reason === 'start') assertionPusher ??= startAssertionPusher();
      else if (event.reason === 'shutdown') {
        assertionPusher?.stop();
        assertionPusher = undefined;
      }
    },
  };

  return [tool];
};

export default factory;
