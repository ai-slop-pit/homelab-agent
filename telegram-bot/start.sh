#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "[*] Starting Telegram Bot..."
echo "[*] Working directory: $SCRIPT_DIR"

# Load environment
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(cat "$SCRIPT_DIR/.env" | xargs)
else
  echo "❌ .env file not found in $SCRIPT_DIR"
  exit 1
fi

# Start bot
nohup node src/bot.js > logs/bot.log 2>&1 &
BOT_PID=$!

echo "✅ Bot started (PID: $BOT_PID)"
sleep 2

if ps -p $BOT_PID > /dev/null; then
  echo "✅ Bot is running"
  tail -5 logs/bot.log
else
  echo "❌ Bot failed to start"
  cat logs/bot.log
  exit 1
fi
