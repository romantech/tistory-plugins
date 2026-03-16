import { glob } from "node:fs/promises";
import { build } from "esbuild";

const entryPoints = [];

for await (const file of glob("src/plugins/**/index.ts")) {
  entryPoints.push(file);
}

if (entryPoints.length === 0) {
  throw new Error("No entry points found in src/plugins/**/index.ts");
}

await build({
  entryPoints,
  bundle: true,
  minify: true,
  platform: "browser",
  target: "es2022",
  format: "iife",
  outbase: "src/plugins",
  outdir: "dist",
  entryNames: "[dir]/index.min",
});
