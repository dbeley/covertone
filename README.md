# Covertone

A Subsonic/Navidrome music streaming client — Progressive Web App with Android/iOS support via Capacitor.

## Quick Start

```bash
# Enter the dev shell (Nix)
direnv allow     # or: nix develop

# Install dependencies
pnpm install

# Start dev server
pnpm dev          # → http://localhost:5173
```

Configure your Subsonic/Navidrome server URL, username, and password in **Settings**.

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Run all tests |
| `pnpm lint` | ESLint + Prettier + svelte-check |
| `pnpm format` | Auto-format all source files |
| `pnpm typecheck` | Svelte type checking |

## Platform Builds

### Web (PWA)

```bash
pnpm build       # output in dist/
pnpm preview     # preview at localhost:4173
```

The PWA uses `vite-plugin-pwa` with auto-updating service worker. Installable as a standalone app.

### Docker

```bash
pnpm docker:build   # build image tagged covertone:latest
pnpm docker:run     # serve at http://localhost:8080
```

Multi-stage build: Node 22 builds the app, nginx:alpine serves it with SPA fallback.

### Android

**Prerequisites:** Nix flake provides everything (JDK 21 + Android SDK 35).

```bash
nix develop      # or: direnv allow
pnpm android:build     # debug APK
pnpm android:release   # signed release APK
pnpm android:bundle    # AAB for Google Play
```

Without Nix, export `ANDROID_HOME` pointing to the Android SDK.

Release signing is controlled via environment variables:

| Variable | Description |
|---|---|
| `ANDROID_KEYSTORE_PATH` | Path to keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (default: `covertone`) |
| `ANDROID_KEY_PASSWORD` | Key password |

Without these, Gradle builds an unsigned release APK.

On NixOS, `aapt2` is patched automatically via `scripts/patch-aapt2.sh`.

### iOS

```bash
# Requires macOS with Xcode
pnpm ios:add      # initialize iOS project
pnpm ios:sync     # sync web assets
pnpm ios:open     # open in Xcode
pnpm ios:build    # command-line build
```

## Development

```bash
pnpm dev          # hot-reload dev server
pnpm test --watch # watch mode for tests
pnpm lint         # run all linters
```

The Nix flake provides: `nodejs_22`, `pnpm`, `jdk21`, `caddy`, `shellcheck`, `svelte-language-server`, `typescript-language-server`.

## Install with Obtainium

Add this repository to [Obtainium](https://github.com/ImranR98/Obtainium) to get automatic updates straight from the source:

```
https://github.com/dbeley/covertone
```

If Obtainium prompts you to filter APKs, use the regex `covertone-.*\.apk`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Svelte 5 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Mobile | Capacitor 8 (Android + iOS) |
| PWA | vite-plugin-pwa (Workbox) |
| Testing | Vitest + Testing Library |
| Linting | ESLint 9 + Prettier + svelte-check |
| Dev env | Nix flake |

## Continuous Integration

GitHub Actions on every push/PR to `main`:
1. ESLint → Prettier → svelte-check
2. Vitest (121 tests)
3. Vite production build
4. Docker build + smoke test
