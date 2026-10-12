import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), {
    name: "benchmark-ui-boundary",
    generateBundle() {
      for (const id of this.getModuleIds()) {
        if (/[/\\](?:document-preview|public)[/\\]|@graf[/\\]/.test(id)) {
          this.error("UI build must not include commercial modules or historical public assets.");
        }
      }
    },
  }],
  publicDir: false, // Never copy the historical runtime in public/ into the UI build.
  base: "./",
  server: { host: "127.0.0.1", port: 4180, strictPort: true },
  preview: { host: "127.0.0.1", port: 4180, strictPort: true },
  build: { outDir: "dist-ui", emptyOutDir: true },
});
