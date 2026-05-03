#!/bin/bash
# ログイン時にチェックインサーバーを自動起動する LaunchAgent を入れる（macOS）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_LABEL="com.qrchekin.checkin-server"
LAUNCH_AGENTS="${HOME}/Library/LaunchAgents"
PLIST_PATH="${LAUNCH_AGENTS}/${PLIST_LABEL}.plist"
LOG_DIR="${SERVER_ROOT}/logs"
RUN_SCRIPT="${SERVER_ROOT}/scripts/run-checkin-server.sh"

mkdir -p "$LOG_DIR"
chmod +x "$RUN_SCRIPT"

cat >"$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${SERVER_ROOT}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${RUN_SCRIPT}</string>
  </array>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/launchd-out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/launchd-err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
EOF

UID_NUM="$(id -u)"
# 既に登録済みならいったん外す
launchctl bootout "gui/${UID_NUM}/${PLIST_LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/${UID_NUM}" "$PLIST_PATH"

echo "登録しました: ${PLIST_PATH}"
echo "ログ: ${LOG_DIR}/launchd-out.log / launchd-err.log"
echo ""
echo "【初回だけ】ビルドと .env:"
echo "  cd \"${SERVER_ROOT}\" && npm install && npm run build"
echo "  （.env に NOTION_TOKEN と DB ID を設定）"
echo ""
echo "【止め方】 launchctl bootout gui/${UID_NUM}/${PLIST_LABEL}"
echo "【再開】   launchctl bootstrap gui/${UID_NUM} \"${PLIST_PATH}\""
