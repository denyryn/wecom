#!/usr/bin/env bash
# Builds the store package from a clean checkout.
# Usage: ./build.sh [chrome|firefox|edge]   (default: chrome)
set -euo pipefail

browser="${1:-chrome}"
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22.12+ is required and was not found on PATH." >&2
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 22 ]; then
  echo "Node.js 22.12+ is required; found $(node -v)." >&2
  exit 1
fi

version="$(node -p "require('./package.json').version")"
manifest_version="$(node -p "require('./src/manifest.json').version")"
if [ "$version" != "$manifest_version" ]; then
  echo "Version mismatch: package.json ${version}, src/manifest.json ${manifest_version}." >&2
  exit 1
fi

npm ci
npm run "build:${browser}"

zip="dist/web-ui-commentator-${version}-${browser}.zip"

if [ -f "$zip" ]; then
  echo "Store upload: $zip"
else
  echo "Unpacked build: dist/${browser}"
fi
