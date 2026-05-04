#!/usr/bin/env sh
# Build the Covertone Android APK
# Usage: nix develop --command sh build-apk.sh

set -e

# Patch aapt2 for NixOS compatibility
LD=$(find /nix/store -name "ld-linux-x86-64.so.2" -path "*/lib/*" 2>/dev/null | head -1)
GLIBC_LIB=$(dirname "$LD")

for aapt2 in "$ANDROID_HOME/build-tools/"*/aapt2; do
  [ -f "$aapt2" ] && patchelf --set-interpreter "$LD" --set-rpath "$GLIBC_LIB" "$aapt2"
done

echo "=== Building web app ==="
pnpm build

echo "=== Syncing Capacitor ==="
pnpm exec cap sync

echo "=== Building Android APK ==="
cd android
AAPT2_OVERRIDE=$(ls "$ANDROID_HOME/build-tools/36.0.0/aapt2" 2>/dev/null || ls "$ANDROID_HOME/build-tools/"*/aapt2 2>/dev/null | head -1)
./gradlew assembleDebug --no-daemon \
  -Pandroid.aapt2FromMavenOverride="$AAPT2_OVERRIDE"

echo "=== APK built at ==="
ls -la app/build/outputs/apk/debug/app-debug.apk
