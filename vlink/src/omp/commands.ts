/**
 * Slash commands mirror the tools: same operation helpers, concise
 * notifications, no thrown errors.
 */
import type { ExtensionAPI, ExtensionCommandContext } from "@oh-my-pi/pi-coding-agent";
import type { VLinkRuntime } from "../runtime.ts";
import {
  awaitRuntime,
  commandErrorText,
  commissionReport,
  discoverReport,
  nodesReport,
  statusReport,
  type CommissionToolParams,
} from "./tools.ts";

const COMMISSION_TRANSPORTS: readonly CommissionToolParams["transport"][] = [
  "ble-wifi",
  "ip",
  "ble-thread",
];

function notifyError(ctx: ExtensionCommandContext, error: unknown): void {
  ctx.ui.notify(commandErrorText(error), "error");
}

async function withRuntime<T>(
  getRuntime: () => VLinkRuntime | undefined,
  ctx: ExtensionCommandContext,
  operation: (runtime: VLinkRuntime) => Promise<T>,
): Promise<T | undefined> {
  try {
    const runtime = await awaitRuntime(getRuntime);
    return await operation(runtime);
  } catch (error) {
    notifyError(ctx, error);
    return undefined;
  }
}

export function registerVLinkCommands(
  pi: ExtensionAPI,
  getRuntime: () => VLinkRuntime | undefined,
): void {
  pi.registerCommand("vlink-status", {
    description: "Show VLink bridge state and health.",
    handler: async (_args, ctx) => {
      await withRuntime(getRuntime, ctx, async (runtime) => {
        const report = await statusReport(runtime);
        ctx.ui.notify(report.text, "info");
      });
    },
  });

  pi.registerCommand("vlink-nodes", {
    description: "List commissioned Matter nodes.",
    handler: async (_args, ctx) => {
      await withRuntime(getRuntime, ctx, async (runtime) => {
        const report = await nodesReport(runtime);
        ctx.ui.notify(report.text, "info");
      });
    },
  });

  pi.registerCommand("vlink-discover", {
    description: "Discover commissionable Matter devices: /vlink-discover [seconds]",
    handler: async (args, ctx) => {
      await withRuntime(getRuntime, ctx, async (runtime) => {
        const seconds = Number.parseFloat(args.trim());
        const timeoutMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 10_000;
        const report = await discoverReport(runtime, { timeoutMs });
        ctx.ui.notify(report.text, "info");
      });
    },
  });

  pi.registerCommand("vlink-commission", {
    description:
      "Commission a Matter device: /vlink-commission <pairingCode> [ble-wifi|ip|ble-thread] [nodeName]",
    handler: async (args, ctx) => {
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const pairingCode = tokens[0];
      if (!pairingCode) {
        ctx.ui.notify(
          "Usage: /vlink-commission <pairingCode> [ble-wifi|ip|ble-thread] [nodeName]",
          "warning",
        );
        return;
      }

      const transportToken = tokens[1];
      if (transportToken && !COMMISSION_TRANSPORTS.includes(transportToken as CommissionToolParams["transport"])) {
        ctx.ui.notify(
          `Unknown transport "${transportToken}". Use ble-wifi, ip, or ble-thread.`,
          "warning",
        );
        return;
      }

      const transport = (transportToken as CommissionToolParams["transport"] | undefined) ?? "ble-wifi";
      if (transport === "ble-thread") {
        ctx.ui.notify(
          "Thread commissioning needs an operational dataset; use the vlink_commission tool.",
          "warning",
        );
        return;
      }

      await withRuntime(getRuntime, ctx, async (runtime) => {
        const report = await commissionReport(
          runtime,
          { pairingCode, transport, nodeName: tokens[2] },
          (message) => ctx.ui.notify(message, "info"),
        );
        ctx.ui.notify(report.text, "info");
      });
    },
  });
}
