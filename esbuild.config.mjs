import { glob } from "node:fs/promises";
import { build } from "esbuild";

const entryPoints = [];

for await (const file of glob("src/*/index.ts")) {
  entryPoints.push(file);
}

await build({
  entryPoints,
  bundle: true,
  minify: true,
  platform: "browser",
  target: "es2022",
  format: "iife",
  outbase: "src",
  outdir: "dist",
  entryNames: "[dir]/index.min",
});
