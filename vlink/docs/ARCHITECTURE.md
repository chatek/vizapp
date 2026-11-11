# VLink Architecture

This is the internal design behind [`README.md`](../README.md). Read the README first for the
wire contract; this file records module boundaries and the decisions that are easy to break.

---

## 1. Module boundaries

```text
src/index.ts ──▶ src/plugin.ts ──▶ src/runtime.ts
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
       src/nats/*              src/matter/*            src/config.ts
       transport               adapter                 src/logger.ts
       command-router          matter-js               src/subjects.ts
       publisher               simulator               src/payloads.ts
                                                     src/registry.ts
```

| Module | Owns | Must not own |
|---|---|---|
| `plugin.ts` | OMP registration, session lifecycle, singleton | Matter/NATS protocol details |
| `runtime.ts` | Composition, state machine, bridge operations | OMP imports, raw timers |
| `nats/*` | NATS connection, subject router, telemetry publication | Matter cluster semantics |
| `matter/*` | Matter controller, commissioning, cluster mapping, simulator | NATS subjects |
| `config/logger/subjects/payloads/registry` | Pure, testable primitives | Sockets, timers, hardware |

The dependency direction is one-way: `plugin → runtime → {nats, matter} → primitives`.
`matter` and `nats` never import each other. `runtime` is the only place they meet.

---

## 2. State machine

```text
stopped ──start──▶ starting ──ok──▶ ready
   ▲                  │               │
   │                  ├─nats fail────▶ degraded
   │                  └─matter fail──▶ degraded
   │                                  │
   └────────────stop──────────────────┘
```

Invariants:

- `start()` and `stop()` are idempotent.
- A failed dependency moves to `degraded`; it never throws into the OMP session.
- `health()` is always callable, even when stopped.
- `stop()` closes in reverse start order: publisher → router → NATS → Matter.
- No raw `setInterval` in the runtime or plugin. The sidecar owns its own interval; the OMP
  extension uses `ctx.setInterval` so a callback throw cannot kill the session.

---

## 3. Single-controller rule

Matter.js binds mDNS UDP 5353 and owns a storage directory per controller node ID. Two
`MatterJsAdapter` instances on one host will contend for both. Therefore:

- one real VLink controller per host;
- simulator adapters may run in parallel (no mDNS, no storage);
- multiple VLink *NATS* instances are allowed only if they use different fabrics/controllers,
  which v1 does not support. The `vlink` queue group prevents duplicate command execution,
  but it does not make two controllers safe.

If a second OMP session starts, `plugin.ts` reuses the module-level runtime; it does not create
a second controller. Subagent sessions never start one.

---

## 4. Why the sidecar exists

The OMP extension host runs in-process with no isolation. A thrown exception in a raw callback
can tear down the session. Matter.js and noble/BLE do network I/O, native addon work, and
timers; a failure there must not be fatal to the editor.

The scaffold keeps `VLinkRuntime` free of OMP imports so `src/sidecar.ts` can run the same
composition in a plain Bun/Node process. The OMP extension can then be a thin client over NATS
in a future revision. v1 runs in-process for simulator tests and single-user development; the
sidecar entry point is the production escape hatch.

---

## 5. Matter.js mapping

- Controller: `ServerNode` + `ControllerBehavior`, not the deprecated `CommissioningController`.
- Fabric: `FabricAuthority.defaultFabric()` returns a rotated `Fabric`; keep the returned object.
- Peers: `node.peers.commissioned` is an iterable of `ClientNode`.
- Attributes: read from the Matter.js local cache (`stateOf(Client)`), populated by the
  commissioning subscription (`autoSubscribe: true`).
- Changes: `ChangeNotificationService.change` reports update/event/delete with endpoint,
  behavior, and property names; VLink reads values from endpoint state.
- Commands: `peer.parts.get(endpointId).commandsOf(Client)`; unsupported clusters return a
  named `UNSUPPORTED_CLUSTER` rather than a generic crash.
- BLE: import `@matter/nodejs-ble` and set `ble.enable` **before** `ServerNode.create`;
  `ControllerBehavior` records BLE availability at construction.

Verified on 2026-11-11 with `@matter/main@0.18.0` under Bun 1.4.4: controller create, fabric
creation, `ChangeNotificationService` retrieval, start, and close all succeeded without a device.

**Class identity must come from `@matter/main` (omp constraint, 2026-11-11).** omp's plugin
loader hands extension code a *duplicate* module instance for direct bare-specifier imports of
`@matter/*` packages: `import("@matter/node").ChangeNotificationService` is a different class
object from the one matter's own runtime registered, so `node.env.get(...)` throws
`Required dependency … is not available` and the bridge degrades on every session start. The
bindings re-exported by `@matter/main` are the native instance, so `#startOnce` takes every
class-identity lookup (`ChangeNotificationService` today) from `main`, never from a direct
`@matter/node` import. Same session also routes matter's `Logger` (default DEBUG → console,
which garbles the host TUI) into VLink's structured logger and intercepts `console.*` around
the dynamic imports for the module-evaluation window before that redirect is live. Re-adding a
direct `@matter/node` class import re-breaks the bridge under omp while still passing every
standalone test — that asymmetry is how the defect hides.

---

## 6. Failure containment

| Failure | Containment |
|---|---|
| NATS down at start | `degraded`; OMP tools explain; no throw |
| NATS drops later | transport reconnects; status listeners update health |
| Matter controller start fails | `degraded`; NATS status/bridge.status still answers |
| Matter command throws | `CommandResult { ok:false, error }`; no unhandled rejection |
| Malformed NATS payload | `PAYLOAD_INVALID` reply; subscription callback never throws |
| BLE unavailable | `bleAvailable:false`; IP commissioning remains |
| OMP shutdown | bounded stop; no orphaned subscriptions |
| Second controller instance | prevented by singleton/sidecar rule |

---

## 7. Test seams

- `VLinkRuntime` accepts injected `matter` and `transport` so integration tests do not touch
  hardware.
- `SimulatorAdapter` is deterministic and emits telemetry on commands.
- `FakeMatterAdapter` is a minimal router fixture with failure injection.
- `NatsTransport` is an interface; tests use a fake for unit tests and a real `nats-server`
  fixture for integration.
- Subject/payload/config/registry are pure functions/classes; no I/O except explicit file paths.

These seams are the reason the unit suite can run on a machine with no Bluetooth and no ESP32.
