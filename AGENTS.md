# AGENTS.md

For coding agents working in this repo. Keep changes practical, source-first, and aligned with the existing plugin structure.

## Repo

- This repo contains small Tistory blog plugins distributed through jsDelivr.
- Plugins should work without changing the skin HTML beyond adding `<script>` and optional `<link>` tags.
- User-facing usage, installation, and CDN examples belong in `README.md` and each plugin README, not here.

## Stack

- Package manager: `pnpm`
- Node.js: `>=22`
- Main checks: `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`

## Git And PR

- Commit messages: Use Conventional Commits in English. Keep the subject to a single concise line, ideally under 50 characters. Add a body only when extra context is necessary.
- PR titles: Conventional Commit style such as `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `test: ...`, `chore: ...`.
- Do not prefix PR titles with `[codex]`.
- Before commit or PR work, verify scope with `git status --short` and `git diff --cached`. Do not include unrelated files or generated `dist/` output unless the user explicitly asks.

## Source Of Truth

- Edit source under `src/`.
- Treat `dist/` as generated output. Do not hand-edit it unless the user explicitly asks.
- For source-only work, do not stage or commit `dist/` by default. Same-repo PRs targeting `main` update version and `dist/` automatically. Include `dist/` only for explicit build/release sync work.
- If the worktree is already dirty, leave unrelated modified files alone. Do not clean up, restage, or fold them into the current task unless the user asks.
- Build entries follow `src/plugins/**/index.ts`.
- Shared test helpers live under `test/`, but plugin behavior tests are usually `src/plugins/<plugin-name>/index.test.ts`.
- Path aliases:
  - `@/*` -> `src/*`
  - `@test/*` -> `test/*`

## Plugin Rules

- Each plugin lives in `src/plugins/<plugin-name>/`.
- Keep changes self-contained when possible.
- A new or changed plugin will usually touch:
  - `index.ts`
  - optional CSS imported from the entry file
  - `README.md`
  - `index.test.ts`
- Initialize plugins with `runOnDocumentReady()` from `src/shared/dom-ready.ts`. Avoid eager DOM mutation at module load time.
- Plugins should no-op cleanly when the article container or target elements are missing.
- Avoid duplicate DOM injection. Reuse the existing `data-*` marker pattern when needed.
- Plugin runtime code targets the browser. Do not add Node-only APIs to plugin entry files.
- Reuse helpers in `src/shared/` before adding new utilities.
- New plugin options should flow through `window.RPPlugins` via `src/shared/plugin-config.ts`, not ad-hoc globals.
- When runtime JS computes placement or size for CSS-driven UI, keep shared dimensions in CSS custom properties or a single explicit constant. Update related tests when those values change.

## Tests And Validation

- Add or update tests for behavior changes.
- During iteration, prefer plugin-scoped validation first, such as `pnpm test src/plugins/<plugin-name>/index.test.ts` and targeted formatter or lint checks. Run full repo checks for non-trivial final validation.
- Reuse `test/load-plugin.ts` and `test/setup.ts` before adding new test helpers.
- If a plugin introduces new global state, update reset logic in `test/setup.ts`.
- The test environment uses `happy-dom`; do not assume a real browser network or layout engine.
- For non-trivial plugin changes, run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- For viewport-, drag-, resize-, or overlay-related UI changes, add automated tests but also verify manually with `pnpm preview` on a real mobile-sized viewport when feasible.
- For behavioral UI changes, do a review pass before commit. Prioritize regressions, edge cases, and missing tests over style commentary.
- For live visual verification, prefer `pnpm preview` over manual DevTools injection.
- `pnpm preview` runs in watch mode by default, remembers the last preview URL, and keeps overrides active while you continue navigating in the opened Playwright Chromium window.
- `pnpm preview --plugin toc` limits build and override scope to a specific plugin. Without `--plugin`, the initial run builds all plugins.
- Watch rebuild scope: `src/plugins/<name>/**` rebuilds that plugin only, while `src/shared/**` triggers a full rebuild.

## Docs

- If behavior, configuration, selectors, or installation steps change, update the relevant plugin `README.md`.
- Update the root `README.md` only when the plugin list, shared configuration, or top-level usage changes.
