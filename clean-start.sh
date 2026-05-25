#!/bin/bash
set -e

echo "[*] Killing all bot processes..."

# Kill by PID directly if we can get them
for pid in $(ps aux | grep "node.*telegram-bot" | grep -v grep | awk '{print $2}'); do
  echo "Killing PID $pid..."
  kill $pid 2>/dev/null || true
done

echo "[*] Waiting 45 seconds for Telegram to clear session..."
sleep 45

echo "[*] Starting single bot instance..."
cd /opt/claude-agent
env $(cat .env | xargs) node telegram-bot.js > logs/telegram-bot.log 2>&1 &
BOT_PID=$!
echo "[*] Bot started with PID: $BOT_PID"

sleep 3
echo "[*] Verifying bot is running..."
if kill -0 $BOT_PID 2>/dev/null; then
  echo "✅ Bot is running (PID: $BOT_PID)"
else
  echo "❌ Bot process died"
  tail -30 logs/telegram-bot.log
  exit 1
fi

echo "[*] Testing HTTP endpoint..."
sleep 2
if curl -s http://localhost:3000/health | grep -q "ok"; then
  echo "✅ HTTP endpoint is responding"
else
  echo "⚠️  HTTP endpoint not responding yet"
fi

echo "[*] Bot ready. Logs:"
tail -10 logs/telegram-bot.log
