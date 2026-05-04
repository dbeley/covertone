#!/usr/bin/env sh
# Patch aapt2 for NixOS compatibility. No-op on non-NixOS.

[ -d /nix/store ] || exit 0
command -v patchelf >/dev/null 2>&1 || exit 0

LD_LINUX=$(find /nix/store -name 'ld-linux-x86-64.so.2' -path '*/lib/*' 2>/dev/null | head -1)
[ -n "$LD_LINUX" ] || exit 0

GLIBC_DIR=$(dirname "$LD_LINUX")

patch_aapt2() {
  if [ -f "$1" ] && [ -w "$1" ]; then
    echo "Patching aapt2: $1"
    patchelf --set-interpreter "$LD_LINUX" --set-rpath "$GLIBC_DIR" "$1" 2>/dev/null
  fi
}

# Patch every aapt2 we can find
for aapt2 in $(find "$HOME/.gradle/caches" "$ANDROID_HOME" -type f -name aapt2 2>/dev/null); do
  patch_aapt2 "$aapt2"
done

echo "aapt2 patch done"
