#!/bin/bash
cd /opt/claude-agent
set -a
source .env
set +a
exec node telegram-bot.js
