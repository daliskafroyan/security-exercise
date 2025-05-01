{
  description = "E-commerce security simulation platform";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs-18_x
            pkgs.docker
            pkgs.docker-compose
          ];

          shellHook = ''
            echo "Node.js development environment ready!"
            echo "Use 'docker-compose up -d' to start the database"
          '';
        };
      }
    );
} 