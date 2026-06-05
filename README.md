# Covertone

[![Get it on Obtainium](https://img.shields.io/badge/Get%20it%20on-Obtainium-1E90FF?style=for-the-badge&logo=android&logoColor=white)](http://apps.obtainium.imranr.dev/redirect.html?r=obtainium://add/https://github.com/dbeley/covertone)

A modern Subsonic/Navidrome music streaming client for Web / Android tailored to my needs.

**Covertone is focused on music discovery with features that can't be found in any other Subsonic client out there (see [Features](#features)).**

<p align="center">
  <img src="imgs/home-view-desktop.png" width="500" />
  <img src="imgs/home-view-mobile.png" width="145" />
  <img src="imgs/album-view-desktop.png" width="500" />
  <img src="imgs/album-view-mobile.png" width="145" />
</p>

## Features

- **Tabbed browsing** - Switch between up to 10 tabs, each allowing you to navigate to a different part of the library
- **Discovery panel** - Side panel with music recommendations (albums from similar artists and same genre) and AI-generated context for the currently playing song
- **Auto DJ** - When the queue ends, automatically fetches similar songs
- **Full keyboard navigation** - Vim-style bindings (`h`/`j`/`k`/`l`) and numerous shortcuts let you browse, play, and manage the entire UI without touching a mouse
- **Random album discovery** - Album views default to random sorting to help you discover music
- **Guess the Artist** - Trivia game with 3 difficulty levels (Easy/Medium/Hard) that plays a song and challenges you to pick the right artist
- **Cross-platform** - Installable PWA, Android app (via Capacitor), or Docker image
- **Custom accent color** - Personalize the UI with preset swatches or custom hex color

## Keyboard Shortcuts

Covertone can be fully controlled from the keyboard with vim-inspired bindings. The entire UI is keyboard-compatible — all interactive elements (album cards, track rows, tabs, sort controls, and tab close buttons) are part of the `h`/`j`/`k`/`l` navigation grid, so you never need to reach for the mouse.

### Playback

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `Shift+.` (`>`) | Next track |
| `Shift+,` (`<`) | Previous track |
| `s` | Toggle shuffle |
| `r` | Toggle repeat |
| `Shift+F` | Toggle favorite |
| `m` | Mute / Unmute |

### Seeking

| Key | Action |
|---|---|
| `b` | Seek backward 10s |
| `f` | Seek forward 10s |

### History Navigation

| Key | Action |
|---|---|
| `Shift+H` | Go back in browser history |
| `Shift+L` | Go forward in browser history |

### Volume

| Key | Action |
|---|---|
| `+` / `=` | Volume up (5%) |
| `-` | Volume down (5%) |

### Page Navigation

| Key | Action |
|---|---|
| `1` | Home |
| `2` | Albums |
| `3` | Artists |
| `4` | Playlists |
| `5` | Favorites |
| `6` | Search |
| `7` | Game |
| `8` | Settings |
| `/` | Search (quick) |

### Views

| Key | Action |
|---|---|
| `v` | Open now playing view |
| `q` | Toggle queue |
| `?` | Keyboard shortcuts reference |
| `Escape` | Close overlays / clear selection |

### Vim Movement (h/j/k/l)

Navigate between albums, tracks, and other interactive elements in the current view:

| Key | Action |
|---|---|
| `h` | Move left |
| `l` | Move right |
| `j` | Move down (next row in grid) |
| `k` | Move up (previous row in grid) |
| `Enter` | Activate selected element (open album, play track) |

Grid-aware: `j`/`k` skip by the number of columns in the current layout, so movement works correctly on album grids and track lists alike.

## Quick start

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

| Script           | Description                      |
|------------------|----------------------------------|
| `pnpm dev`       | Vite dev server                  |
| `pnpm build`     | Production build → `dist/`       |
| `pnpm preview`   | Preview production build locally |
| `pnpm test`      | Run all tests                    |
| `pnpm lint`      | ESLint + Prettier + svelte-check |
| `pnpm format`    | Auto-format all source files     |
| `pnpm typecheck` | Svelte type checking             |

## Platform Builds

### Web (PWA)

```bash
pnpm build       # output in dist/
pnpm preview     # preview at localhost:4173
```

The PWA uses `vite-plugin-pwa` with auto-updating service worker. Installable as a standalone app.

### Docker

```bash
docker build -t covertone:latest .
docker compose up -d
```

You can also create an `.env` file if you don't want to configure your server through the settings page:

```env
# .env file
COVERTONE_SERVER=https://demo.navidrome.org
COVERTONE_USERNAME=user
COVERTONE_PASSWORD=pass
```

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

| Variable                    | Description                      |
|-----------------------------|----------------------------------|
| `ANDROID_KEYSTORE_PATH`     | Path to keystore file            |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password                |
| `ANDROID_KEY_ALIAS`         | Key alias (default: `covertone`) |
| `ANDROID_KEY_PASSWORD`      | Key password                     |

Without these, Gradle builds an unsigned release APK.

On NixOS, `aapt2` is patched automatically via `scripts/patch-aapt2.sh`.

## Tech Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Framework | Svelte 5 + TypeScript              |
| Build     | Vite 6                             |
| Styling   | Tailwind CSS 4                     |
| Mobile    | Capacitor 8 (Android)              |
| PWA       | vite-plugin-pwa (Workbox)          |
| Testing   | Vitest + Testing Library           |
| Linting   | ESLint 9 + Prettier + svelte-check |
| Dev env   | Nix flake                          |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for bugs, features, or documentation improvements.

### Development Setup

1. Clone the repository
2. Run `direnv allow` or `nix develop` to enter the dev shell
3. Run `pnpm install` to install dependencies
4. Run `pnpm dev` to start the development server

### Code Style

- Follow the existing ESLint and Prettier configuration
- Run `pnpm lint` before committing
- Run `pnpm format` to auto-format code
