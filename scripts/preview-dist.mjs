import { constants as fsConstants } from "node:fs";
import { access, glob, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, resolve } from "node:path";
import process from "node:process";
import { chromium } from "playwright";
import { buildDist } from "./build-dist.mjs";

const REPO_OVERRIDE_PATTERN =
  /^\/gh\/romantech\/tistory-plugins@[^/]+\/(dist\/.+)$/;
const DEFAULT_VIEWPORT = {
  width: 1600,
  height: 1200,
};
const LAST_PREVIEW_STATE_PATH = resolve(
  tmpdir(),
  "tistory-plugins-preview.json",
);
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
};
const BUILD_RELEVANT_EXTENSIONS = new Set([
  ".css",
  ".js",
  ".json",
  ".ts",
  ".tsx",
]);
const SYSTEM_CHROME_EXECUTABLE_PATHS = [
  process.env.RP_PREVIEW_BROWSER_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  process.env.PROGRAMFILES
    ? `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`
    : null,
  process.env["PROGRAMFILES(X86)"]
    ? `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`
    : null,
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    : null,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

async function readLastPreviewUrl() {
  try {
    const raw = await readFile(LAST_PREVIEW_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    if (typeof parsed?.url === "string" && parsed.url.length > 0) {
      return parsed.url;
    }
  } catch {
    // Ignore missing or invalid state and fall back to explicit usage guidance.
  }

  return null;
}

async function writeLastPreviewUrl(url) {
  await writeFile(
    LAST_PREVIEW_STATE_PATH,
    JSON.stringify({ url }, null, 2),
    "utf8",
  );
}

async function parseArgs(argv) {
  const options = {
    injectPlugins: [],
    plugins: [],
    headless: false,
    watch: false,
    closeAfterMs: null,
    viewport: { ...DEFAULT_VIEWPORT },
    viewportExplicit: false,
    url: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--plugin" || argument === "--plugins") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing plugin name after --plugin.");

      options.plugins.push(
        ...value
          .split(",")
          .map((plugin) => plugin.trim())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }

    if (argument === "--headless") {
      options.headless = true;
      continue;
    }

    if (argument === "--inject") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing plugin name after --inject.");

      options.injectPlugins.push(
        ...value
          .split(",")
          .map((plugin) => plugin.trim())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }

    if (argument === "--watch") {
      options.watch = true;
      continue;
    }

    if (argument === "--close-after-ms") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value after --close-after-ms.");

      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("--close-after-ms must be a non-negative integer.");
      }

      options.closeAfterMs = parsed;
      index += 1;
      continue;
    }

    if (argument === "--viewport") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value after --viewport.");

      const matched = value.match(/^(\d+)x(\d+)$/i);
      if (!matched) {
        throw new Error("--viewport must use WIDTHxHEIGHT format.");
      }

      options.viewport = {
        width: Number.parseInt(matched[1], 10),
        height: Number.parseInt(matched[2], 10),
      };
      options.viewportExplicit = true;
      index += 1;
      continue;
    }

    if (argument.startsWith("--plugin=") || argument.startsWith("--plugins=")) {
      const [, rawValue = ""] = argument.split("=", 2);
      options.plugins.push(
        ...rawValue
          .split(",")
          .map((plugin) => plugin.trim())
          .filter(Boolean),
      );
      continue;
    }

    if (argument.startsWith("--inject=")) {
      const [, rawValue = ""] = argument.split("=", 2);
      options.injectPlugins.push(
        ...rawValue
          .split(",")
          .map((plugin) => plugin.trim())
          .filter(Boolean),
      );
      continue;
    }

    if (argument.startsWith("--close-after-ms=")) {
      const [, rawValue = ""] = argument.split("=", 2);
      const parsed = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("--close-after-ms must be a non-negative integer.");
      }

      options.closeAfterMs = parsed;
      continue;
    }

    if (argument.startsWith("--viewport=")) {
      const [, rawValue = ""] = argument.split("=", 2);
      const matched = rawValue.match(/^(\d+)x(\d+)$/i);
      if (!matched) {
        throw new Error("--viewport must use WIDTHxHEIGHT format.");
      }

      options.viewport = {
        width: Number.parseInt(matched[1], 10),
        height: Number.parseInt(matched[2], 10),
      };
      options.viewportExplicit = true;
      continue;
    }

    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }

    if (options.url) {
      throw new Error(`Unexpected extra argument: ${argument}`);
    }

    options.url = argument;
  }

  if (!options.url) {
    options.url = await readLastPreviewUrl();
  }

  if (!options.url) {
    throw new Error(
      "Usage: pnpm preview <url> [--plugin <plugin>] [--inject <plugin>] [--watch] [--headless] [--close-after-ms 1000]\nTip: after the first run with a URL, you can reuse the last URL with just `pnpm preview`.",
    );
  }

  options.injectPlugins = [...new Set(options.injectPlugins)].sort();
  options.plugins = [...new Set(options.plugins)].sort();

  if (options.injectPlugins.length > 0 && options.plugins.length > 0) {
    throw new Error(
      "Do not combine --inject with --plugin. Use one mode only.",
    );
  }

  return options;
}

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findSystemChromeExecutablePath() {
  for (const executablePath of SYSTEM_CHROME_EXECUTABLE_PATHS) {
    try {
      await access(executablePath, fsConstants.X_OK);
      return executablePath;
    } catch {
      // Try the next browser candidate.
    }
  }

  return null;
}

function getContentType(filePath) {
  if (filePath.endsWith(".css")) return MIME_TYPES[".css"];
  if (filePath.endsWith(".js")) return MIME_TYPES[".js"];
  return "application/octet-stream";
}

function resolveLocalDistPathFromUrl(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.hostname !== "cdn.jsdelivr.net") return null;

  const matched = parsedUrl.pathname.match(REPO_OVERRIDE_PATTERN);
  if (!matched) return null;

  return resolve(process.cwd(), matched[1]);
}

async function getInjectAssetEntries(plugins) {
  const assets = [];

  for (const plugin of plugins) {
    const cssPath = resolve(process.cwd(), `dist/${plugin}/index.min.css`);
    const jsPath = resolve(process.cwd(), `dist/${plugin}/index.min.js`);

    if (await fileExists(cssPath)) {
      assets.push({
        plugin,
        type: "css",
        localPath: cssPath,
      });
    }

    if (await fileExists(jsPath)) {
      assets.push({
        plugin,
        type: "js",
        localPath: jsPath,
      });
    }
  }

  if (assets.length === 0) {
    throw new Error(
      `No injectable dist assets were found for: ${plugins.join(", ")}`,
    );
  }

  return assets;
}

async function injectAssets(page, assets) {
  for (const asset of assets) {
    if (asset.type === "css") {
      await page.addStyleTag({ path: asset.localPath });
      continue;
    }

    await page.addScriptTag({ path: asset.localPath });
  }

  await page.waitForTimeout(50);
}

async function launchBrowser(headless, viewport, maximize) {
  const launchOptions = {
    headless,
    args: maximize
      ? ["--start-maximized"]
      : [`--window-size=${viewport.width},${viewport.height}`],
  };

  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Executable doesn't exist")
    ) {
      const executablePath = await findSystemChromeExecutablePath();
      if (executablePath) {
        console.warn(
          `Playwright Chromium is not installed. Falling back to ${executablePath}.`,
        );

        return chromium.launch({
          ...launchOptions,
          executablePath,
        });
      }

      throw new Error(
        `${error.message}\nNo compatible system Chrome/Chromium executable was found. Run \`pnpm exec playwright install\` or set \`RP_PREVIEW_BROWSER_PATH\`.`,
      );
    }

    throw error;
  }
}

async function getSourceSnapshot() {
  const snapshot = new Map();

  for await (const filePath of glob("src/**/*")) {
    const metadata = await stat(filePath).catch(() => null);
    if (!metadata?.isFile()) continue;

    snapshot.set(filePath, metadata.mtimeMs);
  }

  return snapshot;
}

function getChangedFiles(previousSnapshot, nextSnapshot) {
  const changedFiles = [];

  for (const [filePath, mtimeMs] of nextSnapshot) {
    if (previousSnapshot.get(filePath) !== mtimeMs) {
      changedFiles.push(filePath);
    }
  }

  for (const filePath of previousSnapshot.keys()) {
    if (!nextSnapshot.has(filePath)) {
      changedFiles.push(filePath);
    }
  }

  return [...new Set(changedFiles)].sort();
}

function formatChangedFiles(files) {
  if (files.length <= 3) {
    return files.join(", ");
  }

  return `${files.slice(0, 3).join(", ")} (+${files.length - 3} more)`;
}

function getPluginNameFromSourcePath(filePath) {
  const matched = filePath.match(/^src\/plugins\/([^/]+)\//);
  return matched?.[1] ?? null;
}

function isBuildRelevantPath(filePath) {
  if (filePath.endsWith(".md")) return false;
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath)) return false;

  return BUILD_RELEVANT_EXTENSIONS.has(extname(filePath));
}

function getRebuildPlan(changedFiles, selectedPlugins) {
  const relevantFiles = changedFiles.filter(isBuildRelevantPath);
  if (relevantFiles.length === 0) {
    return {
      plugins: [],
      reason: "no build-relevant files changed",
    };
  }

  const selectedSet = new Set(selectedPlugins);
  const affectedPlugins = new Set();
  let rebuildAll = false;

  for (const filePath of relevantFiles) {
    if (filePath.startsWith("src/shared/")) {
      rebuildAll = true;
      continue;
    }

    const plugin = getPluginNameFromSourcePath(filePath);
    if (plugin) {
      if (selectedSet.size === 0 || selectedSet.has(plugin)) {
        affectedPlugins.add(plugin);
      }
      continue;
    }

    rebuildAll = true;
  }

  if (selectedSet.size > 0) {
    if (rebuildAll) {
      return {
        plugins: [...selectedSet].sort(),
        reason: "shared or unknown source changed",
      };
    }

    if (affectedPlugins.size === 0) {
      return {
        plugins: [],
        reason: "changes were outside the selected plugins",
      };
    }
  } else if (rebuildAll) {
    return {
      plugins: null,
      reason: "shared or unknown source changed",
    };
  }

  return {
    plugins: [...affectedPlugins].sort(),
    reason: "plugin source changed",
  };
}

async function loadPreviewPage(page, options, mode, injectedAssets = []) {
  if (mode === "initial") {
    await page.goto(options.url, { waitUntil: "domcontentloaded" });
    await writeLastPreviewUrl(options.url);
  } else {
    await page.reload({ waitUntil: "domcontentloaded" });
  }

  await page.waitForLoadState("networkidle").catch(() => {});

  if (options.injectPlugins.length > 0) {
    await injectAssets(page, injectedAssets);
  }

  const title = await page.title();
  const diagnostics = await page.evaluate(() => {
    const toc = document.querySelector(".rp-toc");

    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      tocExists: toc instanceof HTMLElement,
      tocHidden: toc instanceof HTMLElement ? toc.hidden : null,
    };
  });

  return { diagnostics, title };
}

function logDiagnostics(title, diagnostics) {
  console.log(`Page title: ${title}`);
  console.log(
    `Viewport: ${diagnostics.viewportWidth}x${diagnostics.viewportHeight}`,
  );
  console.log(
    diagnostics.tocExists
      ? `TOC status: ${diagnostics.tocHidden ? "hidden" : "visible"}`
      : "TOC status: not found",
  );
}

async function main() {
  const options = await parseArgs(process.argv.slice(2));
  const selectedPlugins =
    options.injectPlugins.length > 0 ? options.injectPlugins : options.plugins;
  const overrideSet =
    options.plugins.length > 0 ? new Set(options.plugins) : null;

  await buildDist({ plugins: selectedPlugins });
  const injectedAssets =
    options.injectPlugins.length > 0
      ? await getInjectAssetEntries(options.injectPlugins)
      : [];

  const maximizeWindow = !options.headless && !options.viewportExplicit;
  const browser = await launchBrowser(
    options.headless,
    options.viewport,
    maximizeWindow,
  );
  const context = await browser.newContext(
    maximizeWindow
      ? {
          viewport: null,
        }
      : {
          viewport: options.viewport,
          screen: options.viewport,
        },
  );
  const page = await context.newPage();
  const fulfilledAssets = [];
  let stopWatching = () => {};

  if (options.injectPlugins.length === 0) {
    await page.route("https://cdn.jsdelivr.net/**", async (route) => {
      const requestUrl = route.request().url();
      const localPath = resolveLocalDistPathFromUrl(requestUrl);

      if (!localPath) {
        await route.continue();
        return;
      }

      const plugin = localPath.split("/dist/")[1]?.split("/")[0];

      if (overrideSet && (!plugin || !overrideSet.has(plugin))) {
        await route.continue();
        return;
      }

      if (!(await fileExists(localPath))) {
        await route.continue();
        return;
      }

      fulfilledAssets.push({
        url: requestUrl,
        localPath,
      });

      await route.fulfill({
        status: 200,
        contentType: getContentType(localPath),
        body: await readFile(localPath),
      });
    });
  }

  const { title, diagnostics } = await loadPreviewPage(
    page,
    options,
    "initial",
    injectedAssets,
  );

  console.log(`Preview ready: ${options.url}`);
  logDiagnostics(title, diagnostics);

  if (options.injectPlugins.length > 0) {
    console.log("Injected assets:");
    for (const asset of injectedAssets) {
      console.log(`- ${asset.plugin} ${asset.type}: ${asset.localPath}`);
    }
  } else if (fulfilledAssets.length > 0) {
    console.log("Overridden assets:");
    for (const asset of fulfilledAssets) {
      console.log(`- ${asset.url} -> ${asset.localPath}`);
    }
  } else {
    console.log("Overridden assets: none");
  }

  const closeBrowser = async () => {
    stopWatching();
    if (browser.isConnected()) {
      await browser.close();
    }
  };

  const handleSignal = async () => {
    await closeBrowser();
    process.exit(130);
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
  browser.on("disconnected", () => {
    stopWatching();
  });

  if (options.watch) {
    const srcRoot = resolve(process.cwd(), "src");
    let lastSnapshot = await getSourceSnapshot();
    let rebuilding = false;
    const intervalId = setInterval(() => {
      if (rebuilding) return;

      void (async () => {
        const nextSnapshot = await getSourceSnapshot();
        const changedFiles = getChangedFiles(lastSnapshot, nextSnapshot);
        if (changedFiles.length === 0) return;

        const rebuildPlan = getRebuildPlan(changedFiles, selectedPlugins);
        lastSnapshot = nextSnapshot;

        if (rebuildPlan.plugins !== null && rebuildPlan.plugins.length === 0) {
          console.log(
            `Source changed without rebuild: ${formatChangedFiles(changedFiles)} (${rebuildPlan.reason})`,
          );
          return;
        }

        rebuilding = true;

        try {
          const reason = formatChangedFiles(changedFiles);
          const rebuildLabel =
            rebuildPlan.plugins === null
              ? "all plugins"
              : rebuildPlan.plugins.join(", ");

          console.log(`Source changed: ${reason}`);
          console.log(`Rebuilding: ${rebuildLabel}`);
          await buildDist({ plugins: rebuildPlan.plugins ?? [] });
          const updated = await loadPreviewPage(
            page,
            options,
            "reload",
            injectedAssets,
          );
          console.log(`Preview reloaded: ${reason}`);
          logDiagnostics(updated.title, updated.diagnostics);
        } catch (error) {
          console.error(
            `Watch update failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        } finally {
          rebuilding = false;
        }
      })();
    }, 700);

    stopWatching = () => {
      clearInterval(intervalId);
      stopWatching = () => {};
    };

    console.log(`Watching ${srcRoot} for changes...`);
  }

  if (options.closeAfterMs !== null) {
    await page.waitForTimeout(options.closeAfterMs);
    await closeBrowser();
    return;
  }

  console.log("Close the browser window or press Ctrl+C to exit.");
  await new Promise((resolve) => browser.on("disconnected", resolve));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
