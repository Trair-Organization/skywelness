#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WATCHMAN_BIN="$ROOT_DIR/scripts/.tools/watchman/watchman-v2023.05.01.00-macos/bin/watchman"
WATCHMAN_LIB="$ROOT_DIR/scripts/.tools/watchman/watchman-v2023.05.01.00-macos/lib"
WATCHMAN_WRAPPER_DIR="$ROOT_DIR/scripts/.tools/bin"

if [[ "${OSTYPE:-}" == "darwin"* ]]; then
  if [[ -x "$WATCHMAN_BIN" ]]; then
    export PATH="$WATCHMAN_WRAPPER_DIR:$(dirname "$WATCHMAN_BIN"):$PATH"
    export DYLD_LIBRARY_PATH="$WATCHMAN_LIB:${DYLD_LIBRARY_PATH:-}"
  fi
fi

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # Keep Metro on Node 22.x for watcher stability.
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
  nvm use 22 >/dev/null || true
fi

exec npm run start -w mobile
