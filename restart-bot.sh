#!/bin/bash
set -e

echo "[*] Killing existing telegram-bot processes..."
ps aux | grep "node.*telegram-bot" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

echo "[*] Waiting 40 seconds for Telegram to clear session..."
sleep 40

echo "[*] Starting fresh bot instance..."
cd /opt/claude-agent
env $(cat .env | xargs) nohup node telegram-bot.js > logs/telegram-bot.log 2>&1 &

echo "[*] Bot started. Waiting for it to initialize..."
sleep 5

echo "[*] Checking status..."
if pgrep -f "node.*telegram-bot" > /dev/null; then
  echo "✅ Bot is running (PID: $(pgrep -f 'node.*telegram-bot'))"
  echo "[*] Bot logs:"
  tail -10 logs/telegram-bot.log
else
  echo "❌ Bot failed to start"
  tail -20 logs/telegram-bot.log
fi
