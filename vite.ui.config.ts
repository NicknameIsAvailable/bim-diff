import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL(".", import.meta.url));
const webIfcWasm = readFileSync(require.resolve("web-ifc/web-ifc.wasm"));
const ifcDiffWasm = readFileSync(resolve(root, "public/wasm/ifc-diff.wasm"));

// The production runner already ships a web-ifc based IFC -> FRAG worker.
// Reuse that exact worker instead of bundling a second converter.
const importWorkerDir = resolve(root, "public/assets");
const importWorkerName = readdirSync(importWorkerDir).find((name) =>
  /^import\.worker-.*\.js$/.test(name),
);
if (!importWorkerName)
  throw new Error("public/assets/import.worker-*.js is missing");
const importWorker = readFileSync(resolve(importWorkerDir, importWorkerName));

/**
 * The UI keeps `publicDir: false` so the historical runner is never copied
 * into the new build. These files still have to be reachable in development
 * and in `dist-ui`; this plugin serves them in dev and emits them on build.
 */
function servedAsset(options: {
  route: string;
  fileName: string;
  source: Buffer;
  contentType: string;
}): Plugin {
  return {
    name: `served-asset-${options.fileName}`,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== options.route) return next();
        res.statusCode = 200;
        res.setHeader("Content-Type", options.contentType);
        res.end(options.source);
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: options.fileName,
        source: options.source,
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    servedAsset({
      route: "/web-ifc/web-ifc.wasm",
      fileName: "web-ifc/web-ifc.wasm",
      source: webIfcWasm,
      contentType: "application/wasm",
    }),
    servedAsset({
      route: "/wasm/ifc-diff.wasm",
      fileName: "wasm/ifc-diff.wasm",
      source: ifcDiffWasm,
      contentType: "application/wasm",
    }),
    servedAsset({
      route: `/assets/${importWorkerName}`,
      fileName: `assets/${importWorkerName}`,
      source: importWorker,
      contentType: "text/javascript",
    }),
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
