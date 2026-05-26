---
name: nvim_config_location
description: "Neovim config is at /opt/claude-agent/.config/nvim/, NOT /root/.config/nvim/ — XDG_CONFIG_HOME overrides the default"
metadata:
  type: project
  created: 2026-05-26
---

`XDG_CONFIG_HOME=/opt/claude-agent/.config` is set in this environment.

Neovim reads its config from `/opt/claude-agent/.config/nvim/`, not the default `/root/.config/nvim/`.

**Why:** In a previous session we spent a long time editing `/root/.config/nvim/` and could not understand why changes had no effect. The root cause was this env var redirecting XDG config dirs.

**How to apply:** Any nvim config edits (plugins, init.lua, lua/config/, etc.) must go to `/opt/claude-agent/.config/nvim/`. Verify with `nvim --headless -c 'lua print(vim.fn.stdpath("config"))' -c 'qa!' 2>&1` if unsure.

Key files:
- `/opt/claude-agent/.config/nvim/init.lua` — entry point
- `/opt/claude-agent/.config/nvim/lua/config/lazy.lua` — lazy.nvim setup
- `/opt/claude-agent/.config/nvim/lua/plugins/` — user plugin specs
- `/opt/claude-agent/.config/nvim/lazyvim.json` — LazyVim extras config
