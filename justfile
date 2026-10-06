# covertone — task runner
# Everything is available through `just`; the dev shell provides the tools.

set shell := ["bash", "-euo", "pipefail", "-c"]
set dotenv-load := false

version := `node -p "require('./package.json').version"`

default:
    @just --list --unsorted

# ---------------------------------------------------------------- development

# Start the Vite dev server (http://localhost:5173)
dev:
    pnpm dev

# Production build into dist/
build:
    pnpm build

# Preview the production build (http://localhost:4173)
preview:
    pnpm build && pnpm preview

# Run the unit + component test suite
test:
    pnpm test

# Tests in watch mode
test-watch:
    pnpm test:watch

# Auto-format the sources with Prettier
format:
    pnpm format

# Type-check Svelte + TypeScript only
typecheck:
    pnpm typecheck

# Everything a reviewer cares about: Prettier + ESLint + svelte-check, tests, build
verify:
    pnpm lint
    pnpm test
    pnpm build

# ---------------------------------------------------------------- android / ios

# Build a debug APK
android-build:
    pnpm android:build

# Build a release APK (signed when the ANDROID_* env vars are set)
android-release:
    pnpm android:release

# Build an AAB for Google Play
android-bundle:
    pnpm android:bundle

# Open the generated Android project in Android Studio
android-open:
    pnpm android:open

# Generate the iOS project (macOS only)
ios-add:
    pnpm ios:add

# Sync web assets into the iOS project (macOS only)
ios-sync:
    pnpm ios:sync

# Open the iOS project in Xcode (macOS only)
ios-open:
    pnpm ios:open

# Build the iOS app (macOS only)
ios-build:
    pnpm ios:build

# ------------------------------------------------------------------------ nix

# Build the SPA with Nix
nix-build:
    nix build .#default

# Evaluate the flake (package + dev shell)
nix-check:
    nix flake check --keep-going --print-build-logs

# Recompute pnpmDeps.hash in flake.nix after dependency changes
nix-hash:
    #!/usr/bin/env bash
    set -uo pipefail
    flake=flake.nix
    # A fixed-output derivation is keyed by its *declared* hash: while the old
    # hash's output is still in the store, Nix reuses it and never notices the
    # lockfile changed. The build then fails much later, inside pnpmConfigHook,
    # with ERR_PNPM_NO_OFFLINE_TARBALL instead of the hash mismatch we are after.
    # Blanking the hash first forces a real fetch, so Nix prints the `got:` value.
    old=$(grep -oE 'hash = "sha256-[A-Za-z0-9+/=]+"' "$flake" | head -1 | sed 's/hash = "//; s/"$//')
    fake=sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
    sed -i "s|hash = \"sha256-[^\"]*\"|hash = \"$fake\"|" "$flake"
    out=$(nix build .#default --no-link --print-build-logs 2>&1)
    new=$(printf '%s\n' "$out" | grep -oE 'got: +sha256-[A-Za-z0-9+/=]+' | head -1 | sed 's/got: *//')
    if [ -z "$new" ]; then
      sed -i "s|hash = \"sha256-[^\"]*\"|hash = \"$old\"|" "$flake"
      echo "$out" >&2
      echo "could not determine a new pnpmDeps hash — the build failed for another reason" >&2
      exit 1
    fi
    if [ "$new" = "$old" ]; then
      sed -i "s|hash = \"sha256-[^\"]*\"|hash = \"$old\"|" "$flake"
      echo "pnpmDeps.hash is already up to date"
      exit 0
    fi
    sed -i "s|hash = \"sha256-[^\"]*\"|hash = \"$new\"|" "$flake"
    echo "pnpmDeps.hash: $old -> $new"

# Format all .nix files
nix-format:
    nixfmt $(git ls-files '*.nix')

# Lint the Nix code
nix-lint:
    statix check .
    deadnix --fail .

# ------------------------------------------------------------------ dependencies

# Update everything in one shot: npm deps (latest), flake inputs, pnpmDeps hash
deps-update:
    pnpm update --latest
    # typescript-eslint does not support TypeScript 7 yet, and `--latest` would
    # pull it in and kill `pnpm lint`; keep TypeScript on the 6.x line.
    pnpm add -D typescript@^6
    nix flake update
    @just nix-hash

# Show outdated npm packages and nix inputs
deps-outdated:
    pnpm outdated || true
    nix flake metadata --json | jq -r '.locks.nodes | to_entries[] | select(.value.locked) | "\(.key) \(.value.locked.lastModified|todate)"' 2>/dev/null || true

# ---------------------------------------------------------------------- docker

# Build the Docker image
docker-build:
    docker build -t covertone:latest .

# Run the stack with docker compose
docker-up:
    docker compose up -d --build

# Stop the stack
docker-down:
    docker compose down

# --------------------------------------------------------------------- release

# Bump the version in package.json (single source of truth for flake + Android)
bump v:
    node scripts/bump-version.mjs {{v}}

# Bump, commit, tag and push (CI then builds the APK and publishes the release)
release v:
    #!/usr/bin/env bash
    set -euo pipefail
    just bump {{v}}
    just verify
    git add package.json
    if git diff --cached --quiet; then
      echo "nothing to commit — is the version already {{v}}?" >&2
      exit 1
    fi
    git commit -m "chore(release): v{{v}}"
    git tag -a "v{{v}}" -m "covertone v{{v}}"
    git push origin HEAD
    git push origin "v{{v}}"

# -------------------------------------------------------------------- housekeeping

# Remove build outputs and caches
clean:
    rm -rf dist coverage node_modules/.vite .vite
    rm -rf android/app/build android/build

# Deep clean (including node_modules); run `pnpm install` afterwards
distclean: clean
    rm -rf node_modules

# Show the toolchain versions in use
doctor:
    node --version
    pnpm --version
    nix --version
    java -version 2>&1 | head -1 || true
