#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/scripts/.tools/watchman"
VERSION="v2023.05.01.00"
ARCHIVE="watchman-${VERSION}-macos.zip"
URL="https://github.com/facebook/watchman/releases/download/${VERSION}/watchman-${VERSION}-macos.zip"
TARGET_DIR="$TOOLS_DIR/watchman-${VERSION}-macos"

mkdir -p "$TOOLS_DIR"
cd "$TOOLS_DIR"

if [[ -x "$TARGET_DIR/bin/watchman" ]]; then
  echo "Local watchman already installed at: $TARGET_DIR"
  exit 0
fi

echo "Downloading watchman ${VERSION}..."
curl -fL -o "$ARCHIVE" "$URL"
unzip -o "$ARCHIVE"
rm -f "$ARCHIVE"

echo "Installed local watchman at: $TARGET_DIR"
