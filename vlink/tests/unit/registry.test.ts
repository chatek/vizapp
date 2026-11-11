import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NodeRegistry } from "../../src/registry.ts";
import type { MatterNodeInfo } from "../../src/types.ts";

const tempDirs: string[] = [];

function tempStateFile(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), "vlink-registry-"));
  tempDirs.push(dir);
  return { dir, file: join(dir, "state.json") };
}

function node(nodeId: string, nodeName?: string): MatterNodeInfo {
  return {
    fabricId: "fabric-0000000000000001",
    nodeId,
    nodeName,
    vendorName: "Acme",
    productName: "Lamp",
    endpointIds: [0, 1],
    connected: true,
    commissionedAt: 1762819200000,
  };
}

function persisted(file: string): { v: number; nodes: MatterNodeInfo[] } {
  return JSON.parse(readFileSync(file, "utf8")) as { v: number; nodes: MatterNodeInfo[] };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("NodeRegistry", () => {
  test("upsert persists the alias atomically and reloads after restart", async () => {
    const { file } = tempStateFile();
    const registry = new NodeRegistry(file);
    await registry.load();
    await registry.upsert(node("node-000000000000002a", "desk-lamp"));

    const onDisk = persisted(file);
    expect(onDisk.v).toBe(1);
    expect(onDisk.nodes).toHaveLength(1);
    expect(onDisk.nodes[0].nodeName).toBe("desk-lamp");

    const restarted = new NodeRegistry(file);
    await restarted.load();
    expect(restarted.get("node-000000000000002a")?.nodeName).toBe("desk-lamp");
    expect(restarted.list()).toHaveLength(1);
  });

  test("duplicate upsert keeps one entry and the last alias wins", async () => {
    const { file } = tempStateFile();
    const registry = new NodeRegistry(file);
    await registry.upsert(node("node-000000000000002a", "first-name"));
    await registry.upsert(node("node-000000000000002a", "second-name"));

    const nodes = registry.list();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].nodeName).toBe("second-name");
    expect(persisted(file).nodes).toHaveLength(1);
  });

  test("a corrupt state file starts empty without crashing", async () => {
    const { file } = tempStateFile();
    writeFileSync(file, "{ this is not json");

    const registry = new NodeRegistry(file);
    await expect(registry.load()).resolves.toBeUndefined();
    expect(registry.list()).toEqual([]);
    expect(registry.get("node-000000000000002a")).toBeUndefined();

    await registry.upsert(node("node-000000000000002a", "desk-lamp"));
    expect(registry.list()).toHaveLength(1);
  });

  test("a missing state file starts empty", async () => {
    const { file } = tempStateFile();
    const registry = new NodeRegistry(file);
    await registry.load();
    expect(registry.list()).toEqual([]);
  });

  test("state file is written with mode 0600", async () => {
    const { file } = tempStateFile();
    const registry = new NodeRegistry(file);
    await registry.upsert(node("node-000000000000002a", "desk-lamp"));
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  test("remove deletes the node and persists the removal", async () => {
    const { file } = tempStateFile();
    const registry = new NodeRegistry(file);
    await registry.upsert(node("node-000000000000002a", "desk-lamp"));
    await registry.remove("node-000000000000002a");
    expect(registry.list()).toEqual([]);

    const restarted = new NodeRegistry(file);
    await restarted.load();
    expect(restarted.list()).toEqual([]);
    await expect(registry.remove("node-000000000000002a")).resolves.toBeUndefined();
  });

  test("returns copies so callers cannot mutate registry state", async () => {
    const { file } = tempStateFile();
    const registry = new NodeRegistry(file);
    await registry.upsert(node("node-000000000000002a", "desk-lamp"));

    const listed = registry.list()[0];
    listed.nodeName = "mutated";
    listed.endpointIds.push(99);

    expect(registry.get("node-000000000000002a")?.nodeName).toBe("desk-lamp");
    expect(registry.get("node-000000000000002a")?.endpointIds).toEqual([0, 1]);
  });

  test("drops invalid node records when loading", async () => {
    const { file } = tempStateFile();
    writeFileSync(
      file,
      JSON.stringify({
        v: 1,
        nodes: [
          node("node-000000000000002a", "desk-lamp"),
          { nodeId: "", fabricId: "fabric-0000000000000001" },
          { fabrication: "nope" },
        ],
      }),
    );

    const registry = new NodeRegistry(file);
    await registry.load();
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].nodeId).toBe("node-000000000000002a");
  });
});
