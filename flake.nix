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
            shellcheck
            statix
          ];
          JAVA_HOME = "${pkgs.jdk21.home}";
          shellHook = ''
            export PATH="$PWD/node_modules/.bin:$PATH"
            echo "covertone dev shell"
            echo "  pnpm dev            - start dev server"
            echo "  pnpm test           - run tests"
            echo "  pnpm build          - production build"
            echo "  pnpm lint           - lint all"
            echo "  pnpm format         - auto-format"
            echo "  pnpm typecheck      - Svelte type check"
            echo "  pnpm android:build  - Android debug APK"
            echo "  pnpm android:release- Android release APK"
            echo "  pnpm docker:build   - Docker image"
            echo "  sh build-apk.sh     - APK (NixOS patched)"
          '';
        };
      }
    );
}
