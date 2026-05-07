# Covertone — Agent Guide

A Subsonic/Navidrome music streaming PWA (Svelte 5 + TypeScript + Vite 6 + Tailwind CSS 4), wrapped with Capacitor 8 for Android/iOS.

## Commands

| Command | Action |
|---|---|
| `pnpm dev` | Vite dev server at `localhost:5173` |
| `pnpm build` | Production build → `dist/` |
| `pnpm test` | `vitest run` (NOT watch — use `pnpm test:watch` for watch) |
| `pnpm lint` | `prettier --check src/` → `eslint src/` → `svelte-check` (sequential, 3 stages) |
| `pnpm format` | `prettier --write src/` only (no eslint fix) |
| `pnpm typecheck` | `svelte-check` (same as `pnpm lint:svelte`) |
| `pnpm android:build` | build → cap sync → patch-aapt2 → gradle assembleDebug |
| `pnpm docker:build` | `docker build -t covertone:latest .` |

CI runs: `lint:eslint` → `lint:format` → `lint:svelte` → `test` → `build`. Docker job runs on main only.

## Architecture

- **No SvelteKit.** Plain Svelte 5 with `mount()` in `src/main.ts`. Hash-based routing in `src/lib/stores/router.ts` — links use `#/path` format. Routes defined in `src/lib/components/AppShell.svelte`: `/`, `/albums`, `/artists`, `/playlists`, `/album/:id`, `/artist/:id`, `/playlist/:id`, `/search`, `/game`, `/settings`.
- **`$lib`** path alias → `src/lib/`. Tests use `$lib` too (vitest config mirrors vite config alias).
- **All tests** in `tests/` mirror `src/lib/` structure. Pattern: `tests/**/*.test.ts`. Vitest uses jsdom + `passWithNoTests: true`.
- **`src/lib/api/SubsonicAPI.ts`** — Subsonic REST client. Auth: `md5(password + salt)` token. `globalThis.fetch` is mocked in tests via `vi.fn()`.
- **Stores** (`src/lib/stores/`) — plain `svelte/store` writables.
- **`tsconfig.json`** has `verbatimModuleSyntax: true` — use `import type` for type-only imports.

## Conventions

- **Style:** Tailwind CSS 4 with CSS custom properties for theming. Three themes via CSS class on `<html>`: `.dark` (default), `.amoled`, `.light`.
- **ESLint:** `no-explicit-any` and `no-unused-vars` disabled for config files, tests, `src/main.ts`, `src/vite-env.d.ts`. `consistent-type-imports` enforced with `prefer: type-imports`.

## Platform quirks

- **GitHub Pages:** `BASE_URL=/covertone/` must be set at build time. Overrides vite `base` and PWA `base`.
- **Android builds use `scripts/patch-aapt2.sh`** — auto-patches `aapt2` for NixOS compatibility. No-op on non-NixOS.
- **Release signing** via env vars: `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Without them, Gradle builds unsigned.
- **Nix flake** provides dev shell with Node 22, pnpm, JDK 21. `direnv allow` or `nix develop` to enter. Sets `ANDROID_HOME` to `$PWD/android-sdk` if unset. Writes `android/local.properties`.
