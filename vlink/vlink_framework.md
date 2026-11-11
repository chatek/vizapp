description: >
System specification and AI scaffolding prompt for the VLink plugin in omp.sh.
ai_scaffold_instructions: |
  You are an expert Systems Architect, Embedded Engineer (ESP32 / LVGL), and AI Agent Developer.
  Your objective is to scaffold and implement the `VLink` module inside `omp.sh` on MacOS as the premier "vibe coding" hardware experience for young makers.

  ### Hardware Context & Constraints:
  - Target Board: Waveshare ESP32-C6-LCD (ST7789 display running 320x172 landscape, BOOT button on GPIO9, RGB LED on GPIO8).
  - Silicon: ESP32-C6FH8 (Wi-Fi 6, BLE 5, IEEE 802.15.4 / Thread, 8MB embedded flash, NO RTC, CDC USB).
  - Host System: MacOS running `omp.sh` runtime with co-located `pi-a2a` plugin.

  ### Core Tasks to Perform:
  1. **Scaffold TypeScript Bridge (`omp.sh` side):**
     - Build the `vlink` plugin using `@nats-io/nats-core` connecting to the shared local NATS server (`nats://127.0.0.1:4222`).
     - Subscribe to command subjects (`iot.cmd.matter.>`) and publish device states (`iot.matter.>`).
     - Ensure clean coexistence with the `pi-a2a` plugin's `a2a.*` subject space.

  2. **Scaffold ESP32-C6 Firmware App (LVGL + Matter / NATS Bridge):**
     - Create a C/C++ / ESP-IDF component that drives the ST7789 display using LVGL (phosphor green / retro hacker aesthetic).
     - Render 3 UI zones: (A) Connection Status (`pi-a2a` & NATS status), (B) Agent Avatar / Canvas, (C) Live Telemetry Ticker.
     - Map physical inputs: Pressing BOOT (GPIO9) emits a NATS event via CDC / Wi-Fi to trigger the `pi-a2a` agent on MacOS.
     - Drive RGB LED (GPIO8) to reflect incoming NATS state changes.

  3. **Vibe Coding Workflows:**
     - Provide `omp` CLI commands for MacOS to build, flash, and monitor the ESP32-C6 board seamlessly (`omp vlink flash`, `omp vlink stream`).

  4. **Integration Testing:**
     - Create automated test cases where `pi-a2a` issues an agentic instruction (e.g., "Set screen mode to Retro") over NATS, verifying LVGL UI render updates on the physical ESP32-C6 board within <50ms.

# Product Requirement Document (PRD): VLink Plugin & ESP32-C6 Maker Hardware for omp.sh

**Version:** 2.0.0 (Vibe Coding Edition)

**Status:** Approved for Implementation

**Author:** Edge Engineering & Maker Experience Team

**System Scope:** Open Modular Platform (`omp.sh`) Plugin Architecture & ESP32-C6 Hardware Binding

---

## 1. Executive Summary & Vibe Coding Vision

**VLink** is the flagship "first smart device / IoT board" experience for young makers entering the **`omp.sh`** ecosystem on MacOS. It bridges local **Matter** protocol fabrics and **ESP32-C6** hardware endpoints directly into an in-process **NATS.io** messaging bus shared with the **`pi-a2a` (Agent-to-Agent)** plugin.

By combining the **Waveshare ESP32-C6-LCD** display with natural-language agentic workflows, VLink replaces opaque, low-level micro-controller development with an **"Agentic Tamagotchi"** feedback loop. Young makers describe hardware behavior in plain English inside `omp.sh`, while VLink coordinates instant build/flash cycles, LVGL UI updates, and real-time NATS event routing.

---

## 2. System Architecture & Co-located NATS Bus

```
+-----------------------------------------------------------------------------------------+
| MACOS HOST RUNTIME (omp.sh)                                                             |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | SHARED LOCAL NATS SERVER (nats://127.0.0.1:4222)                                 |  |
|  +-------------------|---------------------------------------|-----------------------+  |
|                      ^                                       ^                          |
|         Local IPC    |                                       | Local IPC                |
|                      v                                       v                          |
|  +-----------------------------------+       +---------------------------------------+  |
|  | PI-A2A PLUGIN                     |       | VLINK PLUGIN (TypeScript Bridge)      |  |
|  |                                   |       |                                       |  |
|  |  +-----------------------------+  |       |  +---------------------------------+  |  |
|  |  | Autonomous AI Agent         |  |       |  | Telemetry & Command Adapter        |  |  |
|  |  +--------------+--------------+  |       |  +-----------------+---------------+  |  |
|  |                 |                 |       |                    ^                  |  |
|  |                 v NATS Pub/Sub    |       |                    | Internal Events  |  |
|  |  +-----------------------------+  |       |  +-----------------+---------------+  |  |
|  |  | Agent Bus (a2a.agent.>)     |====== NATS Subjects =====>| Matter Controller Stack|  |  |
|  |  +-----------------------------+  | (iot.cmd.matter)       +-----------+-----------+  |  |
|  +-----------------------------------+       |                            |             |  |
|                                              +----------------------------|-------------+  |
|                                                                           |                |
|                                                            USB-CDC / Wi-Fi|                |
v                                                                           v                v
+-----------------------------------------------------------------------------------------+
| ESP32-C6-LCD HARDWARE ENDPOINT (Waveshare ST7789 320x172)                               |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | LVGL DISPLAY ENGINE (CRT Green Cyberpunk Aesthetic)                             |  |
|  |                                                                                   |  |
|  |  [ Zone A: Agent Status ]  [ Zone B: Interactive Avatar ]  [ Zone C: Event Ticker ] |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|  +---------------------------+    +--------------------------+   +-------------------+  |
|  | GPIO9 (BOOT Button Input) |    | GPIO8 (RGB LED Indicator)|   | Wi-Fi 6 / Thread  |  |
|  +---------------------------+    +--------------------------+   +-------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Maker Journey & UX Principles

1. **Zero-Friction Onboarding:** Plug ESP32-C6 into Mac USB-C $\rightarrow$ run `omp vlink attach` $\rightarrow$ auto-detect board over USB-Serial/JTAG (`303a:1001`).
2. **Instant Visual Gratification:** The LVGL screen powers on with a live agent avatar and system ticker connected to the local NATS bus.
3. **Vibe Actuation:**
   - Press **BOOT button (GPIO9)** $\rightarrow$ emits `iot.matter.event.button_press` on NATS.
   - `pi-a2a` Agent receives event $\rightarrow$ generates a friendly prompt response $\rightarrow$ publishes command to `iot.cmd.matter.lcd.draw`.
   - ESP32-C6 LCD updates LVGL canvas instantly; RGB LED flashes confirmation.

---

## 4. Subject Taxonomy & Namespace Isolation

To keep `VLink` and `pi-a2a` decoupled on the shared NATS instance (`nats://127.0.0.1:4222`):

| Purpose | Subject Pattern | Example |
| --- | --- | --- |
| **VLink Device State** | `iot.matter.<fabric_id>.<device_id>.<cluster>.<attr>` | `iot.matter.f1.c6-lcd.display.text` |
| **VLink Actuation** | `iot.cmd.matter.<fabric_id>.<device_id>.<cluster>.<cmd>` | `iot.cmd.matter.f1.c6-lcd.display.render` |
| **`pi-a2a` Namespace** | `a2a.agent.<agent_id>.<type>` | `a2a.agent.coder.response` |

---

## 5. Success Metrics & Target Latencies

* **Local NATS Message Handoff (`pi-a2a` $\leftrightarrow$ `VLink`):** $<2\text{ms}$
* **End-to-End Command Actuation (Agent $\rightarrow$ NATS $\rightarrow$ LVGL LCD Update):** $<50\text{ms}$ over USB-CDC; $<100\text{ms}$ over Wi-Fi 6.
* **Firmware Binary Size Budget:** $<1.5\text{MB}$ fitting into 8MB Flash partition table.