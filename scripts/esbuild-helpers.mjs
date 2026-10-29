import { stat } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * The source tree uses TypeScript's `.js` import extension. esbuild looks for
 * the literal file, so fall back to the matching `.ts`.
 */
export const tsFromJs = {
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
