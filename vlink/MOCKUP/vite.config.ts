// Port comes from ui.config.json so a generated project cannot collide with this one.
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const cfg = JSON.parse(readFileSync(new URL("./ui.config.json", import.meta.url), "utf8"));
export default defineConfig({
  server: { host: "127.0.0.1", port: cfg.port },
});
