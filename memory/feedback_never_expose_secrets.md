---
name: feedback_never_expose_secrets
description: "CRITICAL: Never use pure tokens/secrets in command line arguments or examples"
metadata:
  type: feedback
  created: 2026-05-26
---

## Rule: Never expose secrets in commands

**What NOT to do:**
```bash
# ❌ WRONG - Token visible in ps aux, history, logs
BOT_TOKEN="8856763347:AAGH1WE4vLDHD1sq3RH3SACk0EJxX_ANU3o" node telegram-bot.js
TELEGRAM_BOT_TOKEN="xxx" npm run start
API_KEY="secret" curl https://api.example.com
```

**What TO do:**
```bash
# ✅ RIGHT - Token stays in .env, never exposed
node telegram-bot.js
npm run start
curl https://api.example.com
```

**Why:** Secrets in command line are:
- Visible in `ps aux` output (anyone on system can see)
- Logged in shell history (.bash_history)
- Appear in logs if command is logged
- Can be recovered from memory dumps
- Git history if accidentally committed

**How to apply:**
- All secrets (.env, API keys, tokens, passwords) must ONLY live in files
- Never construct commands with secrets inline
- Always verify tokens are loaded from .env via `require('dotenv').config()`
- If I need to verify a secret is working, check the file exists, never display or use it in commands
- When documenting, reference as `$ENV_VAR_NAME` not the actual value

**This is non-negotiable security practice.**
