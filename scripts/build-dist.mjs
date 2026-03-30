import { glob, rm } from "node:fs/promises";
import { build } from "esbuild";

function parsePlugins(argv) {
  const plugins = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--plugin" || argument === "--plugins") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing plugin name after --plugin.");
      }

      plugins.push(
        ...value
          .split(",")
          .map((plugin) => plugin.trim())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }

    if (argument.startsWith("--plugin=") || argument.startsWith("--plugins=")) {
      const [, rawValue = ""] = argument.split("=", 2);
      plugins.push(
        ...rawValue
          .split(",")
          .map((plugin) => plugin.trim())
          .filter(Boolean),
      );
    }
  }

  return [...new Set(plugins)].sort();
}

async function getEntryPoints(plugins) {
  const entryPoints = [];

  for await (const file of glob("src/plugins/**/index.ts")) {
    if (
      plugins.length > 0 &&
      !plugins.some((plugin) => file === `src/plugins/${plugin}/index.ts`)
    ) {
      continue;
    }

    entryPoints.push(file);
  }

  entryPoints.sort();
  return entryPoints;
}

async function cleanDist(plugins) {
  if (plugins.length === 0) {
    await rm("dist", { recursive: true, force: true });
    return;
  }

  await Promise.all(
    plugins.map((plugin) =>
      rm(`dist/${plugin}`, {
        recursive: true,
        force: true,
      }),
    ),
  );
}

export async function buildDist(options = {}) {
  const plugins = [...new Set(options.plugins ?? [])].sort();
  const entryPoints = await getEntryPoints(plugins);

  if (entryPoints.length === 0) {
    const label =
      plugins.length > 0 ? ` for plugin(s): ${plugins.join(", ")}` : "";
    throw new Error(`No entry points found${label}.`);
  }

  await cleanDist(plugins);

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

  return entryPoints;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const plugins = parsePlugins(process.argv.slice(2));
    const entryPoints = await buildDist({ plugins });
    console.log(
      `Built ${entryPoints.length} plugin entr${
        entryPoints.length === 1 ? "y" : "ies"
      }.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
