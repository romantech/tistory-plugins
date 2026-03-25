import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, statSync } from "node:fs";

const {
  BASE_SHA: baseSha,
  HEAD_SHA: headSha,
  GITHUB_OUTPUT: githubOutput,
} = process.env;

if (!baseSha || !headSha || !githubOutput) {
  console.error(
    "Missing required environment variables: BASE_SHA, HEAD_SHA, GITHUB_OUTPUT.",
  );
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

function getFileSizeAtRef(ref, file) {
  try {
    return Number(git(["cat-file", "-s", `${ref}:${file}`]));
  } catch {
    return 0;
  }
}

function getWorkingTreeFileSize(file) {
  try {
    if (!existsSync(file)) return 0;
    return statSync(file).size;
  } catch {
    return 0;
  }
}

function formatSizeDiff(diffBytes) {
  if (diffBytes === 0) return "no change";

  if (Math.abs(diffBytes) < 1024) {
    return diffBytes > 0 ? `+${diffBytes} B` : `-${Math.abs(diffBytes)} B`;
  }

  const absKb = (Math.abs(diffBytes) / 1024).toFixed(1);
  return diffBytes > 0 ? `+${absKb} KB` : `-${absKb} KB`;
}

function writeMultilineOutput(name, value) {
  const delimiter = `EOF_${randomUUID().replaceAll("-", "")}`;
  appendFileSync(
    githubOutput,
    `${name}<<${delimiter}\n${value}\n${delimiter}\n`,
  );
}

let changedFiles = [];

try {
  const raw = git(["diff", "--name-only", baseSha, headSha]);
  changedFiles = raw
    ? raw
        .split("\n")
        .map((file) => file.trim())
        .filter(Boolean)
    : [];
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to get changed files: ${message}`);
  process.exit(1);
}

const pluginNames = [
  ...new Set(
    changedFiles
      .map((file) => file.match(/^src\/plugins\/([^/]+)\//)?.[1] ?? null)
      .filter(Boolean),
  ),
].sort();

const pluginsMd =
  pluginNames.length > 0
    ? pluginNames.map((name) => `- ${name}`).join("\n")
    : "- none";

const distEntries = [
  ...new Set([
    ...pluginNames.flatMap((name) => [
      `dist/${name}/index.min.js`,
      `dist/${name}/index.min.css`,
    ]),
    ...changedFiles.filter((file) =>
      /^dist\/.*\/index\.min\.(js|css)$/.test(file),
    ),
  ]),
]
  .map((file) => {
    const baseSize = getFileSizeAtRef(baseSha, file);
    const currentSize = getWorkingTreeFileSize(file);

    return {
      file,
      baseSize,
      currentSize,
      diff: currentSize - baseSize,
    };
  })
  .filter(({ baseSize, currentSize }) => baseSize > 0 || currentSize > 0)
  .sort((a, b) => a.file.localeCompare(b.file));

const distMdItems = distEntries
  .filter(({ diff }) => diff !== 0)
  .map(({ file, diff }) => `- \`${file}\`: ${formatSizeDiff(diff)}`);

const distMd = distMdItems.length > 0 ? distMdItems.join("\n") : "- none";

writeMultilineOutput("plugins", pluginsMd);
writeMultilineOutput("dist", distMd);
