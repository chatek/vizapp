/**
 * THE FIRMWARE BOM, reviewed 2026-10-31 against the tree — the one panel that was unique to the
 * board team's review harness and now lives here, beside the SPEC that cites file:line for
 * every UI number.
 *
 * PROVENANCE RULE (same three buckets as the screens, SPEC §4):
 *   MEASURED  — read from the device or the build (esptool chip_id / flash_id / read_mac,
 *               main/CMakeLists REQUIRES, BUILD.md).
 *   DERIVED   — from a counted fact (0 includes = unused; the offsets from the vendor CSV).
 *   REVIEWED  — a defect found by comparing a document with the tree.
 *
 * ★ The repo's `vkey/BOM.md` is the C6 board's and is stale for this variant: wrong vendor
 * paths, C6 pins, stale pins, and two dependencies no code references. Its defects are listed
 * at the end of the panel so the next reader does not trust it by default.
 */
export interface BomSection { h: string; rows: Array<[string, string]> }
export interface Bom {
  title: string;
  subtitle: string;
  sections: BomSection[];
  defects: string[];
}

export const BOM: Bom = {
  title: "Firmware BOM",
  subtitle:
    "reviewed against the tree 2026-10-31 · vkey/BOM.md is the C6 board's and is stale for this variant",
  sections: [
    {
      h: "Hardware (measured on the device)",
      rows: [
        ["board", "Waveshare ESP32-S3-LCD-1.47"],
        ["SoC", "ESP32-S3 QFN56 v0.2 · 8 MB PSRAM · 240 MHz (esptool chip_id)"],
        ["flash", "16 MB · ef/4018 · dio/80 MHz (esptool flash_id)"],
        ["panel", "ST7789 172 × 320 native · run 320 × 172 landscape"],
        ["storage", "micro-SD · SDMMC 4-bit (CLK 14 · CMD 15 · D0 16 · D1 18 · D2 17 · D3 21)"],
        ["RGB LED", "GPIO38 (driver present, unused by the firmware)"],
        ["input", "BOOT = GPIO0 (the S3 strap pin) + RESET — one usable button"],
        ["USB", "USB-Serial/JTAG 303a:1001 (internal PHY, GPIO19/20)"],
      ],
    },
    {
      h: "Software (main/CMakeLists REQUIRES — the real link set)",
      rows: [
        ["ESP-IDF", "5.4 — build of record on danilab (the vendored 6.1 submodule is NOT what compiles)"],
        ["LVGL", "8.3.11-28 (vendors/lvgl, release/v8.3)"],
        ["esp_lvgl_port", "1.4.0 — ui/ calls lvgl_port_init / lvgl_port_add_disp"],
        ["espressif/button", "3.5.0 — the iot_button API"],
        ["mbedtls", "PSA · AES-GCM · CMAC · SHA-256 (the DGAuth/TOTP HMAC path)"],
        ["esp_lcd · fatfs · sdmmc · nvs_flash · efuse · esp_timer", "platform"],
      ],
    },
    {
      h: "Present but NOT referenced (0 includes each)",
      rows: [
        ["ArduinoJson 7.4.2-46", "0 references — cdc_proto parses JSON by hand"],
        ["PNGdec 1.1.7-4", "0 references — no artwork in this build"],
        ["TinyUSB 0.21.0-776", "0 references — reserved for the FIDO2 composite device"],
        ["vendors/esp-idf v6.1-dev-8894", "not the build's IDF (5.4 on danilab)"],
      ],
    },
    {
      h: "Artefact (BUILD.md of record)",
      rows: [
        ["VLink.bin (lineage: VKey.bin)", "652,624 B · sha256 06861a10e34a304e…bd4e817949"],
        ["offsets", "bootloader 0x0 · table 0x8000 · app 0x10000 (dio / 16 MB / 80m)"],
      ],
    },
  ],
  defects: [
    "BOM.md says `vendors/vkey/<pkg>` — the real path is `vkey/vendors/<pkg>`.",
    "BOM.md lists the C6-1.47 pins: LCD MOSI 6 / SCLK 7 / CS 14 / DC 15 / RST 21 / BL 22, TF over SPI, RGB GPIO8. This board: 45/40/42/41/39/48, SDMMC 4-bit, RGB 38.",
    "BOM.md pins LVGL at v8.3.10 (now 8.3.11-28) and esp-idf at c00874869b (now d445e947; the build uses system IDF 5.4).",
    "Two entries describe code that does not exist in this variant: PNGdec (no splash/logo) and ArduinoJson (the CDC JSON is hand-parsed).",
    "★ BUTTON: the firmware used GPIO9 (the C6-1.47's BOOT pin). Measured on this board: the wiki table never lists GPIO9, the vendor demo defines no button, and the S3 download-mode strap is GPIO0 — so the button was DEAD. Fixed in board_pins.h + app_main.cpp.",
  ],
};
