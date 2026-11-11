/**
 * Persistent Matter node registry (aliases + last-known metadata).
 *
 * The file is small JSON written atomically (temp file + rename) with mode
 * 0600. A missing or corrupt file means "no known nodes" — never a crash.
 */

import { chmod, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";

import { VLinkError } from "./errors.ts";
import type { MatterNodeInfo } from "./types.ts";

const STATE_VERSION = 1;

interface RegistryFile {
  v: 1;
  nodes: MatterNodeInfo[];
}

/** Validate an untrusted persisted node; returns `undefined` when unusable. */
function sanitizeNode(value: unknown): MatterNodeInfo | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;

  const raw = value as Record<string, unknown>;
  if (typeof raw.fabricId !== "string" || raw.fabricId.length === 0) return undefined;
  if (typeof raw.nodeId !== "string" || raw.nodeId.length === 0) return undefined;

  const node: MatterNodeInfo = {
    fabricId: raw.fabricId,
    nodeId: raw.nodeId,
    endpointIds: Array.isArray(raw.endpointIds)
      ? raw.endpointIds.filter(
          (id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id >= 0,
        )
      : [],
    connected: raw.connected === true,
  };

  if (typeof raw.nodeName === "string") node.nodeName = raw.nodeName;
  if (typeof raw.vendorName === "string") node.vendorName = raw.vendorName;
  if (typeof raw.productName === "string") node.productName = raw.productName;
  if (typeof raw.commissionedAt === "number" && Number.isFinite(raw.commissionedAt)) {
    node.commissionedAt = raw.commissionedAt;
  }

  return node;
}

function copyNode(node: MatterNodeInfo): MatterNodeInfo {
  return { ...node, endpointIds: [...node.endpointIds] };
}

export class NodeRegistry {
  readonly file: string;
  private readonly nodes = new Map<string, MatterNodeInfo>();
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(file: string) {
    this.file = file;
  }

  /** Load from disk, replacing in-memory state. Missing/corrupt files are empty. */
  async load(): Promise<void> {
    this.nodes.clear();

    let text: string;
    try {
      text = await readFile(this.file, "utf8");
    } catch {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return;

    const candidate = parsed as { v?: unknown; nodes?: unknown };
    if (candidate.v !== STATE_VERSION || !Array.isArray(candidate.nodes)) return;

    for (const entry of candidate.nodes) {
      const node = sanitizeNode(entry);
      if (node) this.nodes.set(node.nodeId, node);
    }
  }

  /** Snapshot of all known nodes, in insertion order. */
  list(): MatterNodeInfo[] {
    return [...this.nodes.values()].map(copyNode);
  }

  get(nodeId: string): MatterNodeInfo | undefined {
    const node = this.nodes.get(nodeId);
    return node ? copyNode(node) : undefined;
  }

  /** Insert or replace by `nodeId` (last write wins) and persist. */
  async upsert(node: MatterNodeInfo): Promise<void> {
    const sanitized = sanitizeNode(node);
    if (!sanitized) {
      throw new VLinkError("PAYLOAD_INVALID", "invalid Matter node record", {
        nodeId: typeof node?.nodeId === "string" ? node.nodeId : null,
      });
    }
    this.nodes.set(sanitized.nodeId, sanitized);
    await this.enqueuePersist();
  }

  /** Remove by `nodeId`; a no-op for unknown ids. */
  async remove(nodeId: string): Promise<void> {
    if (!this.nodes.delete(nodeId)) return;
    await this.enqueuePersist();
  }

  private enqueuePersist(): Promise<void> {
    const run = this.writeQueue.then(() => this.persist());
    this.writeQueue = run.catch(() => undefined);
    return run;
  }

  private async persist(): Promise<void> {
    const snapshot: RegistryFile = { v: STATE_VERSION, nodes: [...this.nodes.values()] };
    const directory = dirname(this.file);
    await mkdir(directory, { recursive: true, mode: 0o700 });

    const temp = `${this.file}.${process.pid}.${Date.now().toString(36)}.${Math.random()
      .toString(36)
      .slice(2, 8)}.tmp`;

    const handle = await open(temp, "w", 0o600);
    try {
      await handle.writeFile(JSON.stringify(snapshot), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }

    try {
      await rename(temp, this.file);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
    // Rename preserves the temp file's mode, but be explicit for umask quirks.
    await chmod(this.file, 0o600);
  }
}
