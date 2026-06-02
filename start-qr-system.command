#!/bin/bash
# デスクトップに置くときは「コピー」ではなく「エイリアス」または「シンボリックリンク」推奨。
# （コピーするとこの Mac 上のフォルダの場所が分からず失敗します）
# 停止: このターミナルウィンドウを閉じる / または Ctrl+C

set -euo pipefail

# シンボリックリンクを解決して、このファイルの実体があるフォルダへ
if command -v python3 >/dev/null 2>&1; then
  _SELF="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$0")"
else
  _SELF="$0"
fi
SCRIPT_DIR="$(cd "$(dirname "$_SELF")" && pwd)"

PROJECT_ROOT=""
if [[ -f "$SCRIPT_DIR/server/scripts/run-qr-system.sh" ]]; then
  PROJECT_ROOT="$SCRIPT_DIR"
else
  d="$SCRIPT_DIR"
  for _ in {1..12}; do
    if [[ -f "$d/server/scripts/run-qr-system.sh" ]]; then
      PROJECT_ROOT="$d"
      break
    fi
    [[ "$d" == "/" ]] && break
    d="$(cd "$d/.." && pwd)"
  done
fi

if [[ -z "$PROJECT_ROOT" ]]; then
  echo ""
  echo "【エラー】QRチェックインシステムのフォルダが見つかりません。"
  echo "このファイルをデスクトップへ「コピー」した場合は動きません。"
  echo "Finder でこのファイルのエイリアス（⌥ドラッグ）をデスクトップに置いてください。"
  echo ""
  read -r -p "Enter で閉じます " _
  exit 1
fi

exec bash "$PROJECT_ROOT/server/scripts/run-qr-system.sh"
