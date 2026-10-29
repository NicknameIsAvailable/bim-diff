import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
const ifcDiffWasm = readFileSync(resolve(root, "public/wasm/ifc-diff.wasm"));

/** `publicDir: false` keeps the historical runner out of the UI build. */
function ifcWasmAsset(): Plugin {
  return {
    name: "ifc-wasm-asset",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/wasm/ifc-diff.wasm") return next();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/wasm");
        res.end(ifcDiffWasm);
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "wasm/ifc-diff.wasm",
        source: ifcDiffWasm,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    ifcWasmAsset(),
    {
      name: "benchmark-ui-boundary",
      generateBundle() {
        for (const id of this.getModuleIds()) {
          if (/[/\\](?:document-preview|public)[/\\]|@graf[/\\]/.test(id)) {
            this.error(
              "UI build must not include commercial modules or historical public assets.",
            );
          }
        }
      },
    },
  ],
  publicDir: false, // Never copy the historical runtime in public/ into the UI build.
  base: "./",
  server: { host: "127.0.0.1", port: 4180, strictPort: true },
  preview: { host: "127.0.0.1", port: 4180, strictPort: true },
  build: { outDir: "dist-ui", emptyOutDir: true },
  worker: { format: "es" },
});
