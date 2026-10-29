// Bundle the 3D preview separately from the Zig build. `prepack` uses this so
// the published tarball contains the generated bundle even though it is not
// committed (it is large and entirely derived from `src/ifc-preview-*.ts`).
//
//   npm run build:preview
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { tsFromJs } from "./esbuild-helpers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const bimDir = resolve(here, "..");

export async function buildPreview() {
  const outfile = resolve(bimDir, "public/ifc-preview-app.js");
  await build({
    entryPoints: [resolve(bimDir, "src/ifc-preview-app.ts")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    plugins: [tsFromJs],
  });
  console.log(`bundled src/ifc-preview-app.ts -> ${outfile}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  await buildPreview();
