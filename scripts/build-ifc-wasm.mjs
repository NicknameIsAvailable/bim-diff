// Build the Zig differ and put the artifacts where the benchmark expects them.
//
//   npm run build:wasm
//
// IFC_DIR overrides the default sibling checkout at ../ifc.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { buildPreview } from "./build-preview.mjs";
import { tsFromJs } from "./esbuild-helpers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const bimDir = resolve(here, "..");
const ifcDir = resolve(process.env.IFC_DIR ?? resolve(bimDir, "..", "ifc"));

console.log(`Building ${resolve(ifcDir, "zig build wasm -Doptimize=ReleaseFast")}`);
execFileSync("zig", ["build", "wasm", "-Doptimize=ReleaseFast"], {
  cwd: ifcDir,
  stdio: "inherit",
});

const target = resolve(bimDir, "public/wasm/ifc-diff.wasm");
mkdirSync(dirname(target), { recursive: true });
copyFileSync(resolve(ifcDir, "zig-out/bin/ifc-diff.wasm"), target);
console.log(`copied ifc-diff.wasm -> ${target}`);

// `dev:ui` serves this wasm through a Vite plugin; `npm start` reads it from
// public/wasm. The remainder of the preview assets already ship with the
// prebuilt runner (import.worker-*.js, worker-*.mjs, web-ifc.wasm).
const webIfcTarget = resolve(bimDir, "public/wasm/web-ifc.wasm");
copyFileSync(
  resolve(bimDir, "node_modules/web-ifc/web-ifc.wasm"),
  webIfcTarget,
);
console.log(
  `copied node_modules/web-ifc/web-ifc.wasm -> ${webIfcTarget}`,
);

const bundles = [
  ["src/ifc-wasm-method.ts", "public/ifc-wasm-method.js"],
];

for (const [entry, output] of bundles) {
  const outfile = resolve(bimDir, output);
  await build({
    entryPoints: [resolve(bimDir, entry)],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    plugins: [tsFromJs],
  });
  console.log(`bundled ${entry} -> ${outfile}`);
}

await buildPreview();
