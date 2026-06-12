# Infrastructure Skill

Load this for any task involving: containers, services, links, IPs, ports, storage, Proxmox, LXC, health checks.

---

## Proxmox Host

- **IP**: 192.168.50.2
- **Web UI**: https://192.168.50.2:8006
- **SSH alias**: proxmox

---

## All Services

| CTID | Service       | URL                              | Notes                          |
|------|---------------|----------------------------------|--------------------------------|
| 101  | n8n           | http://192.168.50.153:5678       | Workflow automation            |
| 102  | Jellyfin      | http://192.168.50.254:8096       | Media server                   |
| 103  | Plex          | http://192.168.50.230:32400      | Media server                   |
| 104  | Prowlarr      | http://192.168.50.228:9696       | Indexer manager                |
| 105  | FlareSolverr  | http://<ip>:8191                 | Cloudflare bypass              |
| 106  | Radarr        | http://192.168.50.225:7878       | Movie management               |
| 107  | Sonarr        | http://192.168.50.253:8989       | TV show management             |
| 108  | Overseerr     | http://192.168.50.106:5055       | Media request UI (Seerr)       |
| 110  | qBittorrent   | http://192.168.50.96:8080        | Torrent client, VPN-tunneled   |
| 112  | Claude agent  | -                                | This agent lives here          |

IPs are DHCP - may change on reboot. If a URL does not respond, get current IP:
  ssh proxmox pct exec <CTID> -- ip -4 addr show eth0

---

## Quick Links (most asked)

- Torrents: http://192.168.50.96:8080
- Watch (Jellyfin): http://192.168.50.254:8096
- Watch (Plex): http://192.168.50.230:32400
- Request media: http://192.168.50.106:5055
- Automation: http://192.168.50.153:5678

---

## SSH Patterns

# Run command in container (non-interactive)
ssh proxmox pct exec <CTID> -- <command>

# Enter container shell (interactive)
ssh proxmox -t pct enter <CTID>

# Copy file into container
ssh proxmox pct push <CTID> /host/path /container/path

# Check service status
ssh proxmox pct exec <CTID> -- systemctl status <service>

# List all containers
ssh proxmox pct list

---

## Storage

- Downloads: /mnt/hdd-data/shared/downloads (host) = /data/downloads (inside CT110)
- qBittorrent runs through NordVPN (nordlynx) - all traffic is VPN-tunneled

---

## Agent Location (CT112)

- Agent files: /opt/claude-agent/
- Memory: /opt/claude-agent/memory/
- Skills: /opt/claude-agent/skills/
- Worker: pm2 task-worker
- Bot: pm2 telegram-bot
- Timezone: Europe/Vilnius
