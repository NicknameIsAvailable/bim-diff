import { readFile, writeFile } from "node:fs/promises";

import { compareIndexes, stableStringify } from "./index.js";

const [left, right, output] = process.argv.slice(2);
if (!left || !right)
  throw new Error(
    "Usage: compare left-index.json right-index.json [diff.json]",
  );
const result = stableStringify(
  compareIndexes(
    JSON.parse(await readFile(left, "utf8")),
    JSON.parse(await readFile(right, "utf8")),
  ),
);
if (output) await writeFile(output, result + "\n");
else process.stdout.write(result + "\n");
