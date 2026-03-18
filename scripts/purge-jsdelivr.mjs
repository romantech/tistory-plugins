import { glob } from "node:fs/promises";

const REPO = process.env.JSDELIVR_REPO || "romantech/tistory-plugins";
const refsInput = process.env.JSDELIVR_REFS || "latest";
const JSDELIVR_PURGE_BASE_URL = "https://purge.jsdelivr.net/gh";

const refs = refsInput
  .split(",")
  .map((ref) => ref.trim())
  .filter(Boolean);

const targets = await Array.fromAsync(glob("dist/**/index.min.js"), (file) =>
  file.replaceAll("\\", "/"),
);

targets.sort();

if (targets.length === 0) {
  console.log("No dist entry files found to purge.");
  process.exit(0);
}

console.log(
  `Starting purge for ${targets.length} file(s) across ${refs.length} ref(s)...`,
);

const purgeTasks = refs.flatMap((ref) =>
  targets.map(async (file) => {
    const purgeUrl = `${JSDELIVR_PURGE_BASE_URL}/${REPO}@${ref}/${file}`;

    const fail = (message) => {
      console.error(`❌ Failed: ${ref} -> ${file} - ${message}`);
      return { ref, file, success: false, error: message };
    };

    try {
      const response = await fetch(purgeUrl);
      const body = await response.text();

      if (!response.ok) {
        return fail(`${response.status} ${response.statusText}\n${body}`);
      }

      console.log(`✅ Success: ${ref} -> ${file}`);
      return { ref, file, success: true };
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  }),
);

const results = await Promise.all(purgeTasks);
const failed = results.filter((result) => !result.success);

console.log("\n----- Summary -----");
console.log(`Total: ${results.length}, Failed: ${failed.length}`);

if (failed.length > 0) process.exit(1);
