# Status Bot

Status Bot is a Discord v14 monitoring assistant that flags suspicious messages/events and serves a lightweight Express dashboard to explore live metrics, rate-limit warnings, and recent guild activity. Everything is written in plain Node.js so you can fork it and deploy on any VPS.

## Features

- Watches guild message traffic and marks common crash/bug triggers (mass mentions, overly long payloads, attachment spam, etc.).
- Tracks client health (ping, guild/user counts, rate-limit hits, API errors) via an in-memory monitor.
- `!status` text command replies with the current health summary directly inside Discord.
- `/status` slash command support (register yourself via the Discord Developer Portal).
- Web panel served by Express that visualizes suspicious events, errors, and top guilds.

## Getting Started

1. Install Node.js 18+.
2. Install dependencies (this pulls in `discord.js`, `express`, `dotenv`, and `node-fetch`):
   ```bash
   npm install
   ```
   - Alternatively, install them individually if you are adding the bot to an existing project:
     ```bash
     npm install discord.js express dotenv node-fetch
     ```
3. Copy `.env.example` to `.env` and fill it out:
   ```env
   DISCORD_TOKEN=your_discord_token
   PORT=3000
   PANEL_API_KEY=optional_dashboard_key
   ```
   - If `PANEL_API_KEY` is set, every request to `/api/stats` must include `?key=your_key` or `x-api-key: your_key`.
4. (Optional) Publish a `/status` slash command on the Discord developer portal targeting the guilds you need.

## Run

```bash
npm start
```

Once the bot logs in, the dashboard will be available at `http://localhost:3000/`. Append `?key=...` when visiting if you protected the API.

For auto-reload during local development:

```bash
npm run dev
```

## Project Structure

- `src/bot.js` – Discord client setup, listeners, and suspicious message heuristics.
- `src/monitor.js` – In-memory store for metrics and health assessment.
- `src/server.js` – Express dashboard + JSON API (`/api/stats`).
- `src/index.js` – Bootstraps the bot and the panel together.

The dashboard polls `/api/stats` every few seconds to refresh cards with ping, uptime, guild/user counts, suspicious events, and errors. Suspicious logs are capped to the latest 25 entries to avoid memory bloat.
