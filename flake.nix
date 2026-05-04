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
            caddy
            jdk21
          ];
          JAVA_HOME = "${pkgs.jdk21.home}";
          shellHook = ''
            echo "covertone dev shell"
            echo "  pnpm dev   - start dev server"
            echo "  pnpm test  - run tests"
            echo "  pnpm build - production build"
            echo "  pnpm apk   - build Android APK"
          '';
        };
      }
    );
}
