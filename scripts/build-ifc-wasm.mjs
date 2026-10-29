// Build the Zig differ and put the artifacts where the benchmark expects them.
//
//   npm run build:wasm
//
// IFC_DIR overrides the default sibling checkout at ../ifc.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

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

const tsFromJs = {
  // The source tree uses TypeScript's `.js` import extension. esbuild
  // looks for the literal file, so fall back to the matching `.ts`.
  name: "ts-from-js",
  setup(builder) {
    builder.onResolve({ filter: /^\.\.?\// }, async (args) => {
      if (!args.path.endsWith(".js") || !args.resolveDir) return;
      const literal = resolve(args.resolveDir, args.path);
      try {
        await stat(literal);
        return;
      } catch {
        /* try the TypeScript source */
      }
      const source = literal.replace(/\.js$/, ".ts");
      try {
        await stat(source);
        return { path: source };
      } catch {
        return;
      }
    });
  },
};

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
