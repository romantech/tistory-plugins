import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const baseSha = process.env.BASE_SHA;
const githubOutput = process.env.GITHUB_OUTPUT;

if (!baseSha || !githubOutput) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

function gitRaw(args) {
  return execFileSync("git", args, {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function getFileSizeAtRef(ref, file) {
  try {
    return gitRaw(["show", `${ref}:${file}`]).byteLength;
  } catch {
    return 0;
  }
}

function getWorkingTreeFileSize(file) {
  try {
    if (!existsSync(file)) return 0;
    return readFileSync(file).byteLength;
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
  const raw = git(["diff", "--name-only", baseSha, process.env.HEAD_SHA]);
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

const distFiles = [
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
  .filter(
    (file) =>
      getFileSizeAtRef(baseSha, file) > 0 || getWorkingTreeFileSize(file) > 0,
  )
  .sort();

const distMdItems = distFiles
  .map((file) => ({
    file,
    diff: getWorkingTreeFileSize(file) - getFileSizeAtRef(baseSha, file),
  }))
  .filter(({ diff }) => diff !== 0)
  .map(({ file, diff }) => `- \`${file}\`: ${formatSizeDiff(diff)}`);

const distMd = distMdItems.length > 0 ? distMdItems.join("\n") : "- none";

writeMultilineOutput("plugins", pluginsMd);
writeMultilineOutput("dist", distMd);
