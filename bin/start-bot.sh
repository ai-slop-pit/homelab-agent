#!/bin/bash
cd /opt/claude-agent/app
set -a
source ../.env
set +a
exec node src/telegram/bot.js
