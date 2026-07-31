{
  description = "Covertone - Subsonic music client";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    let
      pkgVersion = (builtins.fromJSON (builtins.readFile ./package.json)).version;

      buildCovertone =
        { pkgs, baseUrl ? "/" }:
        pkgs.stdenv.mkDerivation {
          pname = "covertone";
          version = pkgVersion;
          src = self;

          pnpmDeps = pkgs.fetchPnpmDeps {
            src = ./.;
            pname = "covertone";
            version = pkgVersion;
            hash = "sha256-sJ/2e7RMDnJoHCT+aBYPuFaalPi7bY/nseTnmseFaF4=";
            fetcherVersion = 4;
          };

          nativeBuildInputs = [ pkgs.nodejs_22 pkgs.pnpm pkgs.pnpmConfigHook ];

          env = { inherit baseUrl; };

          buildPhase = ''
            pnpm build
          '';

          installPhase = ''
            cp -r dist $out
          '';
        };

      nixosModule =
        { config, lib, pkgs, ... }:
        let
          cfg = config.services.covertone;
          configJs = pkgs.writeText "config.js" ''
            window.__COVERTONE_CONFIG__ = ${
              builtins.toJSON (lib.filterAttrs (_: v: v != null) {
                inherit (cfg) server username password aiEndpoint aiKey aiModel;
              })
            };
          '';
        in
        {
          options.services.covertone = {
            enable = lib.mkEnableOption "Covertone SPA";
            server = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "Subsonic server URL";
            };
            username = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "Subsonic username";
            };
            password = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "Subsonic password";
            };
            aiEndpoint = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "AI endpoint URL";
            };
            aiKey = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "AI API key";
            };
            aiModel = lib.mkOption {
              type = lib.types.nullOr lib.types.str;
              default = null;
              description = "AI model name";
            };
            virtualHost = lib.mkOption {
              type = lib.types.str;
              default = "covertone.local";
              description = "nginx virtual host name";
            };
          };

          config = lib.mkIf cfg.enable {
            services.nginx.enable = true;
            services.nginx.virtualHosts.${cfg.virtualHost} = {
              root = toString (
                pkgs.runCommand "covertone-dist" { } ''
                  cp -r ${self.packages.${pkgs.system}.default} $out
                  chmod -R +w $out
                  cp ${configJs} $out/config.js
                ''
              );
              locations = {
                "/" = {
                  tryFiles = "$uri $uri/ /index.html";
                };
                "/assets/" = {
                  extraConfig = ''
                    expires 1y;
                    add_header Cache-Control "public, immutable";
                  '';
                };
                "= /sw.js" = {
                  extraConfig = ''
                    add_header Cache-Control "no-cache";
                  '';
                };
              };
            };
          };
        };
    in
    (flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = buildCovertone { inherit pkgs; };

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
          '';
        };
      }
    )) // {
      nixosModules.default = nixosModule;
    };
}
