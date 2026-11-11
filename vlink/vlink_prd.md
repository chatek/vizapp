---
description: >
  System specification and AI scaffolding prompt for the VLink plugin in omp.sh.
ai_scaffold_instructions: |
  You are an expert IoT and Systems Architect. Use this document as the source of truth to scaffold the `vlink` plugin for `omp.sh`.
  
  Tasks to perform:
  1. Generate the core TypeScript plugin implementation for `VLink` adhering to the lifecycle hooks (init, start, stop).
  2. Implement NATS connectivity using `@nats-io/nats-core` (or `nats`), sharing the local NATS server instance (`nats://127.0.0.1:4222`) alongside `pi-a2a`.
  3. Map Matter clusters/attributes to NATS subject namespaces (`iot.matter.>`) and implement NATS Request-Reply handling for incoming commands (`iot.cmd.matter.>`).
  4. Create integration test suites targeting actual hardware or simulated ESP32 Matter endpoints (e.g., ESP32-C3/ESP32-S3 running `esp-matter` or `matter.js` simulated device nodes).
  5. Include tests for inter-plugin actuation (simulating `pi-a2a` issuing actuation requests over local NATS and verifying Matter state changes and ACK payloads).
---

# Product Requirement Document (PRD): VLink Plugin for omp.sh

**Version:** 1.2.0  
**Status:** Draft  
**Author:** Edge Engineering Team  
**System Scope:** Open Modular Platform (`omp.sh`) Plugin Architecture  

---

## 1. Executive Summary

**VLink** is a lightweight, high-performance edge bridge plugin designed for the Open Modular Platform (`omp.sh`). It bridges local **Matter** protocol fabrics with an in-process or local **NATS.io** messaging bus. 

Within the `omp.sh` ecosystem, VLink operates alongside co-located plugins—specifically the **`pi-a2a` (Agent-to-Agent)** plugin—sharing a single, embedded local NATS server instance (`nats://127.0.0.1:4222`). By using TypeScript runtimes, VLink normalizes Matter Cluster attributes, commands, and events into structured NATS subject spaces. This enables zero-trust, local-first inter-plugin orchestration (e.g., AI agents from `pi-a2a` directly actuating Matter devices via VLink) as well as seamless multi-tenant cloud synchronization via NATS Leaf Node topology.

---

## 2. Core Capabilities & Use Cases

* **Shared Local Messaging Bus:** Communicates with co-located `omp.sh` plugins (such as `pi-a2a`) over a zero-latency local NATS loopback without network overhead.
* **Agent-to-Matter Orchestration:** Allows autonomous agents in `pi-a2a` to discover, read telemetry from, and issue actuation requests to Matter devices using standard NATS Request-Reply.
* **Bidirectional Protocol Translation:** Translates Matter Interaction Model events to NATS subjects, and NATS command invocations to Matter cluster actions.
* **Request-Reply Actuation:** Supports synchronous command execution with cryptographic/execution feedback via NATS `msg.reply`.
* **Zero-Trust Multi-Tenancy:** Map Matter Fabric IDs cleanly into partitioned NATS account and subject hierarchies.
* **Offline-Resilient Edge Buffering:** Leverages the shared local NATS Leaf Node to store telemetry locally when WAN connectivity drops, syncing automatically upon connection re-establishment.

---

## 3. System Architecture & Component Flow

```text
                      +-------------------------------------------------------+
                      |                    CLOUD / SUPERCLUSTER               |
                      |                                                       |
                      |   +---------------------+   +---------------------+   |
                      |   | Telemetry Ingestion |   | Control Dashboard   |   |
                      |   +----------+----------+   +----------+----------+   |
                      +--------------|-------------------------|--------------+
                                     |  NATS JetStream WAN     |
                                     v                         v
+-----------------------------------------------------------------------------------------+
| OMP.SH EDGE GATEWAY / RUNTIME                                                           |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | SHARED LOCAL NATS SERVER / LEAF NODE (nats://127.0.0.1:4222)                    |  |
|  +-------------------|---------------------------------------|-----------------------+  |
|                      ^                                       ^                          |
|         Local IPC    |                                       | Local IPC                |
|                      v                                       v                          |
|  +-----------------------------------+       +---------------------------------------+  |
|  | PI-A2A PLUGIN (omp.sh)            |       | VLINK PLUGIN (omp.sh / TypeScript)    |  |
|  |                                   |       |                                       |  |
|  |  +-----------------------------+  |       |  +---------------------------------+  |  |
|  |  | Autonomous Agent Core       |  |       |  | Telemetry Adapter                  |  |  |
|  |  +--------------+--------------+  |       |  +-----------------+---------------+  |  |
|  |                 |                 |       |                    ^                  |  |
|  |                 v NATS Pub/Sub    |       |                    | Internal Events  |  |
|  |  +-----------------------------+  |       |  +-----------------+---------------+  |  |
|  |  | Agent-to-Agent (A2A) Bus    |====== NATS Subjects =====>| Command Handler       |  |  |
|  |  +-----------------------------+  | (iot.cmd.matter)       +-----------+-----------+  |  |
|  +-----------------------------------+       |                            |             |  |
|                                              |                            v Matter API  |  |
|                                              |  +-------------------------------------+  |  |
|                                              |  | matter.js Core Stack                |  |  |
|                                              |  +------------------+------------------+  |  |
|                                              +---------------------|--------------------+  |
|                                                                    |                        |
|                                                                    v IPv6 / Thread / Wi-Fi  |
|  +-----------------------------------------------------------------------------------+  |
|  | LOCAL MATTER FABRIC (ESP32 Nodes / Endpoints)                                    |  |
|  |                                                                                   |  |
|  |   +-----------------------+     +-----------------------+                         |  |
|  |   | ESP32-C3 Thermostat   |     | ESP32-S3 Smart Plug   | ... (Sensory/Actuation) |  |
|  |   +-----------------------+     +-----------------------+                         |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Technical Requirements

### 4.1 Functional Requirements

| ID | Requirement | Description | Severity |
| :--- | :--- | :--- | :--- |
| **FR-01** | **Lifecycle Management** | Register as an `omp.sh` standard plugin with `init()`, `start()`, and `stop()` hooks. | Critical |
| **FR-02** | **Shared Bus Coexistence** | Connect to the shared local NATS server instance without interfering with `pi-a2a` or other plugin subject spaces. | Critical |
| **FR-03** | **Telemetry Ingestion** | Listen to Matter cluster attribute changes and emit JSON payloads to NATS subjects within $<10\text{ms}$ overhead. | High |
| **FR-04** | **Inter-Plugin Command Actuation** | Process actuation commands dispatched by `pi-a2a` agents over local NATS subjects (`iot.cmd.matter.>`). | Critical |
| **FR-05** | **Sync Acknowledgment** | Support NATS Request-Reply (`msg.reply`) pattern to return command execution status back to `pi-a2a` or cloud clients. | High |
| **FR-06** | **ESP32 Hardware Validation** | Include test cases for ESP32 target devices (ESP32-C3 / ESP32-S3) executing Matter over Wi-Fi/Thread. | High |

### 4.2 NATS Subject Taxonomy & Namespace Isolation

To ensure VLink and `pi-a2a` operate cleanly on the shared NATS instance without subject collision:

1. **VLink Telemetry & Attribute Updates (Publish):**
   ```text
   iot.matter.<fabric_id>.<node_id>.<cluster_name>.<attribute_name>
   ```
   *Example:* `iot.matter.fabric-001.esp32-node-32.thermostat.localTemperature`

2. **VLink Command Actuation (Subscribe & Request-Reply):**
   ```text
   iot.cmd.matter.<fabric_id>.<node_id>.<cluster_name>.<command_name>
   ```
   *Example:* `iot.cmd.matter.fabric-001.esp32-node-12.onOff.toggle`

3. **`pi-a2a` Co-existence Namespace (Reserved for Agent-to-Agent):**
   ```text
   a2a.agent.<agent_id>.<message_type>
   ```

---

## 5. Sequence Diagram: Inter-Plugin Actuation (`pi-a2a` $\rightarrow$ `VLink` $\rightarrow$ ESP32 Endpoint)

```text
[ pi-a2a Plugin ]         [ Shared NATS Bus ]         [ VLink Plugin ]        [ ESP32 Matter Endpoint ]
  (AI Agent)                (127.0.0.1:4222)              (Matter Bridge)             (ESP32-C3 / ESP32-S3)
      |                            |                         |                            |
      |--- Request Actuation ----->|                         |                            |
      |   (iot.cmd.matter.>)       |                         |                            |
      |                            |--- Deliver Msg -------->|                            |
      |                            |   (with reply-to inbox) |                            |
      |                            |                         |--- Invoke Cluster -------->|
      |                            |                         |    Command (e.g. On/Off)   |
      |                            |                         |<-- Exec Success (IPv6) ----|
      |                            |<-- Publish Response ----|                            |
      |                            |    (to reply inbox)     |                            |
      |<-- ACK / State Result -----|                         |                            |
```

---

## 6. Implementation Reference Interface (TypeScript)

```typescript
export interface VLinkConfig {
  natsUrl: string; // Shared with pi-a2a (defaults to nats://127.0.0.1:4222)
  fabricId: string;
  reconnectWaitMs: number;
}

export interface TelemetryPayload<T = unknown> {
  fabricId: string;
  nodeId: string;
  cluster: string;
  attribute: string;
  value: T;
  timestamp: number;
}

export interface CommandPayload<T = Record<string, unknown>> {
  fabricId: string;
  nodeId: string;
  cluster: string;
  command: string;
  args?: T;
}

export interface CommandResult {
  success: boolean;
  error?: string;
  data?: unknown;
}
```

---

## 7. ESP32 Hardware Integration Testing Requirements

1. **Test Environment:** Setup automated integration tests using simulated or physical ESP32 endpoints running `esp-matter` or `matter.js` node emulator profiles.
2. **Commissioning Test:** Verify commission handshakes between `VLink` controller instance and target ESP32 Wi-Fi/Thread nodes.
3. **Actuation Round-Trip:** Test end-to-end command round-trip latency ($\text{Agent} \rightarrow \text{NATS} \rightarrow \text{VLink} \rightarrow \text{ESP32}$) to ensure execution verification completes within $<100\text{ms}$.

---

## 8. Success Metrics & Roadmap

* **Inter-Plugin Latency:** Local NATS message handoff between `pi-a2a` and `VLink` under $2\text{ms}$.
* **Local Actuation Latency:** End-to-end `pi-a2a` request to physical ESP32 Matter execution under $50\text{ms}$.
* **Footprint:** RAM usage under $80\text{MB}$ in standard Node.js/Bun execution environments.
* **Phase 1 (v1.0):** Shared NATS connection, telemetry pub/sub, and `pi-a2a` command actuation against ESP32 endpoints.
* **Phase 2 (v1.1):** JetStream integration for agent memory replay of historical Matter device states.