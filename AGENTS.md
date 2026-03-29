# AGENTS.md

This file is for coding agents working in this repository. Keep it short, practical, and aligned with the existing project structure.

## Project Summary

- This repository contains small Tistory blog plugins distributed through jsDelivr.
- Plugins are designed to work without modifying the skin HTML structure beyond adding `<script>` and optional `<link>` tags.
- User-facing usage and CDN examples belong in `README.md` and each plugin README, not here.

## Stack And Commands

- Package manager: `pnpm`
- Node.js: `>=22`
- Main checks:
  - `pnpm check`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Source Of Truth

- Edit source files under `src/`.
- Shared test utilities live under `test/`, but plugin behavior tests are usually colocated under `src/plugins/<plugin-name>/index.test.ts`.
- Treat `dist/` as generated output. Do not hand-edit files there unless the user explicitly asks for it.
- For source-only changes, do not stage or commit `dist/` by default. This repository updates version and `dist/` automatically for same-repo PRs targeting `main`; only include `dist/` when the user explicitly asks for it or the task is a manual build/release sync.
- `src/plugins/**/index.ts` is the build entry pattern. Esbuild discovers plugins from that file name.

## Plugin Conventions

- Each plugin lives in `src/plugins/<plugin-name>/`.
- Keep plugin changes self-contained when possible.
- A new or changed plugin should usually include:
  - `index.ts`
  - optional CSS imported from the entry file
  - `README.md`
  - `index.test.ts`
- Initialize plugins via `runOnDocumentReady()` from `src/shared/dom-ready.ts`; avoid eager DOM mutation at module load time.
- Prefer runtime-safe DOM enhancement. Plugins should no-op cleanly when the target article container or elements are missing.
- Avoid duplicate DOM injection. Follow the existing pattern of marking processed nodes with `data-*` flags when needed.
- Plugin runtime code targets the browser. Do not add Node-only APIs to plugin entry files.

## Shared Code

- Reuse helpers in `src/shared/` before adding new utilities.
- Keep article container detection and global config handling consistent with the existing shared helpers.
- New plugin options should flow through `window.RPPlugins` via `src/shared/plugin-config.ts`, not ad-hoc globals.
- Path aliases are configured:
  - `@/*` -> `src/*`
  - `@test/*` -> `test/*`

## Tests And Validation

- Add or update tests for behavior changes.
- Prefer plugin-level tests next to the plugin source, following the current structure.
- Reuse `test/load-plugin.ts` and `test/setup.ts` before adding new test helpers.
- If a plugin introduces new global state, update the reset logic in `test/setup.ts`.
- The test environment uses `happy-dom`; do not assume a real browser network or layout engine.
- For non-trivial plugin changes, run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Documentation Updates

- If behavior, configuration, selectors, or installation steps change, update the relevant plugin `README.md`.
- Update the root `README.md` only when the global plugin list, shared configuration, or top-level usage changes.
