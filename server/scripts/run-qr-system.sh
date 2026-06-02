#!/bin/bash
# QRチェックインシステム起動スクリプト（ExpressサーバーとReactアプリ）
set -euo pipefail

SERVER_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$SERVER_ROOT/.." && pwd)"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

LOG_DIR="$SERVER_ROOT/logs"
mkdir -p "$LOG_DIR"
ERR_LOG="$LOG_DIR/qr-system-error.log"

log_err() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >>"$ERR_LOG"
}

if ! command -v node >/dev/null 2>&1; then
  log_err "node が見つかりません。Node.js をインストールしてください。"
  echo "【エラー】Node.js が見つかりません。"
  read -r -p "Enter で閉じます " _
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  log_err "npm が見つかりません。"
  echo "【エラー】npm が見つかりません。"
  read -r -p "Enter で閉じます " _
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  QRチェックインシステムを起動します"
echo "  停止: このウィンドウを閉じる / Ctrl+C"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ReactアプリをTerminalの別ウィンドウで起動
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT' && npm run dev\""

# Expressサーバーをこのウィンドウで起動
cd "$SERVER_ROOT"
exec npm run dev
