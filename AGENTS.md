# AGENTS.md

For coding agents working in this repo. Keep changes practical, source-first, and aligned with the existing plugin structure.

## Defaults

- Edit `src/`; treat `dist/` as generated output. Do not hand-edit, inspect, build, commit, or stage `dist/` for source-only work unless explicitly asked.
- Prefer minimal, plugin-local changes. Avoid cross-plugin refactors unless required by the task.
- Plugins should work without skin HTML changes beyond adding `<script>` and optional `<link>` tags.

## Stack

- Package manager: `pnpm`
- Node.js: `>=22`
- Main checks: `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`

## Git And PR

- Never stage unrelated files. Check `git status --short` before staging and `git diff --cached` before commit or PR work.
- Commit messages and PR titles: Use Conventional Commits in English. Keep subjects concise; for commits, add a body only when extra context is necessary.

## Source Of Truth

- If the worktree is already dirty, leave unrelated changes alone. Do not clean up, restage, or fold them into the current task unless the user asks.
- Build entries follow `src/plugins/**/index.ts`. Shared test helpers live under `test/`.
- Avoid inspecting `dist/` contents for source work; use `git diff --stat`, `git diff --name-only`, or targeted snippets only when generated output must be verified.

## Plugin Rules

- Each plugin lives in `src/plugins/<plugin-name>/`; keep changes self-contained. Typical files are `index.ts`, optional entry CSS, and `index.test.ts`. Update that plugin's `README.md` only when behavior, configuration, or installation docs change.
- Initialize plugins with `runOnDocumentReady()` from `src/shared/dom-ready.ts`. Avoid eager DOM mutation at module load time. Initialization should be idempotent if the script runs more than once.
- Plugins should no-op cleanly when the article container or target elements are missing.
- Avoid duplicate DOM injection. Reuse the existing `data-*` marker pattern when needed.
- When adding selectors or markers, preserve backward compatibility with published plugin behavior unless the task explicitly changes behavior.
- Plugin runtime code targets the browser. Do not add Node-only APIs to plugin entry files.
- Reuse helpers in `src/shared/` before adding new utilities.
- New plugin options should flow through `window.RPPlugins` via `src/shared/plugin-config.ts`, not ad-hoc globals.
- When runtime JS computes placement or size for CSS-driven UI, keep shared dimensions in CSS custom properties or a single explicit constant. Update related tests when those values change.

## Tests And Validation

- For behavior changes, add or update tests. During iteration, prefer plugin-scoped validation first, such as `pnpm test src/plugins/<plugin-name>/index.test.ts`. For non-trivial final validation, run `pnpm check`, `pnpm typecheck`, and `pnpm test`; run `pnpm build` only when the task explicitly includes generated output, release prep, or dist validation.
- Reuse `test/load-plugin.ts` and `test/setup.ts` before adding new test helpers. If a plugin introduces new global state, update reset logic in `test/setup.ts`.
- The test environment uses `happy-dom`; do not assume a real browser network or layout engine.
- For viewport-, drag-, resize-, or overlay-related UI changes, add automated tests and verify manually with `pnpm preview` on a real mobile-sized viewport when possible. If Playwright Chromium launch is sandbox-blocked, rerun with escalated permissions instead of skipping verification.
- Before commit, review for regressions, edge cases, and missing tests.
- Use `pnpm preview --plugin <name>` for plugin-scoped live verification when the target page already loads the plugin. If it does not, use `pnpm preview <url> --inject <plugin>` instead. Do not combine the two modes.

## Docs

- If behavior, configuration, selectors, or installation steps change, update the relevant plugin `README.md`.
- Update the root `README.md` only when the plugin list, shared configuration, or top-level usage changes.
