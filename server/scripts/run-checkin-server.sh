#!/bin/bash
# 受付Mac用: ビルド済みのサーバーを起動する（launchd から実行）
set -euo pipefail

SERVER_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SERVER_ROOT"
LOG_DIR="$SERVER_ROOT/logs"
mkdir -p "$LOG_DIR"
ERR_LOG="$LOG_DIR/checkin-server-error.log"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

log_err() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >>"$ERR_LOG"
}

if ! command -v node >/dev/null 2>&1; then
  log_err "node が見つかりません。Node.js（LTS）をインストールし、ターミナルで node と打って確認してください。"
  exit 1
fi

if [[ ! -f dist/index.js ]]; then
  if [[ -d node_modules ]] && [[ -f package.json ]]; then
    log_err "dist/index.js がありません。ビルドを試みます。"
    npm run build >>"$LOG_DIR/build.log" 2>>"$LOG_DIR/build.log" || {
      log_err "npm run build に失敗しました。ターミナルで cd して npm install && npm run build を実行してください。"
      exit 1
    }
  else
    log_err "dist/index.js がありません。ターミナルで server フォルダに移動し、npm install && npm run build を一度実行してください。"
    exit 1
  fi
fi

exec node dist/index.js
