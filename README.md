# Daily Digest

A local developer tool that fetches data from Slack (and other sources you define), summarizes it with Claude, and delivers a structured digest on your schedule.

## Quick Start

```bash
git clone <repo>
cd daily-digest-claude
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be guided through a 4-step setup wizard.

## Setup

1. **Claude auth** — uses your existing Claude subscription via `CLAUDE_CODE_OAUTH_TOKEN` (run `claude setup-token` first), or an Anthropic API key
2. **Slack** — paste your Slack User OAuth token and select channels
3. **Schedule** — pick days + time for your digest
4. **Background service** — installs a macOS LaunchAgent so digests run automatically

## Adding connectors

Visit **Settings → Build a Connector** and describe what you need (e.g. "GitHub Issues assigned to me"). Claude will write the connector code automatically.

## Data storage

All user state lives in `.digest/` (gitignored):
- `.digest/config.md` — schedules and source config
- `.digest/.env` — auth tokens
- `.digest/digests/` — generated digests (one `.md` per run)

## Running manually

```bash
npm run dev   # development with hot reload
npm run build && npm start  # production build
```
