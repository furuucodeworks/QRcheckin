#!/bin/bash
# デスクトップに置くときは「コピー」ではなく「エイリアス」または「シンボリックリンク」推奨。
# （コピーするとこの Mac 上の server フォルダの場所が分からず失敗します）
# 停止: このターミナルウィンドウを閉じる / または Ctrl+C

set -euo pipefail

# シンボリックリンクを解決して、このファイルの実体があるフォルダへ
if command -v python3 >/dev/null 2>&1; then
  _SELF="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$0")"
else
  _SELF="$0"
fi
SCRIPT_DIR="$(cd "$(dirname "$_SELF")" && pwd)"

SERVER_ROOT=""
if [[ -f "$SCRIPT_DIR/run-checkin-server.sh" ]]; then
  SERVER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  d="$SCRIPT_DIR"
  for _ in {1..12}; do
    if [[ -f "$d/scripts/run-checkin-server.sh" ]]; then
      SERVER_ROOT="$d"
      break
    fi
    [[ "$d" == "/" ]] && break
    d="$(cd "$d/.." && pwd)"
  done
fi

if [[ -z "$SERVER_ROOT" ]]; then
  echo ""
  echo "【エラー】チェックイン用の server フォルダが見つかりません。"
  echo "このファイルをデスクトップへ「コピー」した場合は動きません。"
  echo "Finder でこのファイルのエイリアス（⌥ドラッグ）をデスクトップに置いてください。"
  echo ""
  read -r -p "Enter で閉じます " _
  exit 1
fi

cd "$SERVER_ROOT" || exit 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  チェックイン用サーバーを起動します"
echo "  停止: このウィンドウを閉じる / Ctrl+C"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec bash "$SERVER_ROOT/scripts/run-checkin-server.sh"
