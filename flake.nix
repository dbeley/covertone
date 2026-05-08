{
  description = "Covertone - Subsonic music client";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
            pnpm
            typescript-language-server
            svelte-language-server
            caddy
            jdk21
            patchelf
            shellcheck
            statix
            git
            gh
            python3
          ];

          JAVA_HOME = "${pkgs.jdk21.home}";

          shellHook = ''
            export PATH="$PWD/node_modules/.bin:$PATH"

            # Use a project-local Android SDK dir if not already set
            if [ -z "$ANDROID_HOME" ]; then
              export ANDROID_HOME="$PWD/android-sdk"
              export ANDROID_SDK_ROOT="$ANDROID_HOME"
            fi

            # Write local.properties so Gradle finds the SDK
            mkdir -p android
            cat > android/local.properties << EOF
            sdk.dir=$ANDROID_HOME
            EOF

            # Accept Android SDK licenses
            mkdir -p "$ANDROID_HOME/licenses"
            echo -e '\n24333f8a63b6825ea9c5514f83c2829b004d1fee' > "$ANDROID_HOME/licenses/android-sdk-license"

            echo "covertone dev shell"
            echo "  ANDROID_HOME = $ANDROID_HOME"
            if [ ! -d "$ANDROID_HOME/platforms" ]; then
              echo "  (SDK will be downloaded by Gradle on first build)"
            fi
            echo ""
            echo "  pnpm dev             - start dev server"
            echo "  pnpm test            - run tests"
            echo "  pnpm build           - production build"
            echo "  pnpm lint            - lint all"
            echo "  pnpm format          - auto-format"
            echo "  pnpm typecheck       - Svelte type check"
            echo "  pnpm android:build   - Android debug APK"
            echo "  pnpm android:release - Android release APK"
            echo "  pnpm docker:build    - Docker image"
          '';
        };
      }
    );
}
