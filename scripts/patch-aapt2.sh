#!/usr/bin/env sh
# Patch aapt2 for NixOS compatibility. No-op on non-NixOS systems.
set -e

if [ ! -d /nix/store ]; then
  echo "Not on NixOS, skipping aapt2 patch"
  exit 0
fi

if ! command -v patchelf >/dev/null 2>&1; then
  echo "patchelf not found, skipping aapt2 patch"
  exit 0
fi

LD_LINUX=$(find /nix/store -name 'ld-linux-x86-64.so.2' -path '*/lib/*' 2>/dev/null | head -1)

if [ -z "$LD_LINUX" ]; then
  echo "Could not find NixOS dynamic linker, skipping aapt2 patch"
  exit 0
fi

GLIBC_DIR=$(dirname "$LD_LINUX")

for aapt2 in "$ANDROID_HOME/build-tools/"*/aapt2; do
  if [ -f "$aapt2" ]; then
    echo "Patching aapt2: $aapt2"
    patchelf --set-interpreter "$LD_LINUX" --set-rpath "$GLIBC_DIR" "$aapt2"
  fi
done

echo "aapt2 patching complete"
