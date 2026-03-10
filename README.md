<p align="center">
  <img src="public/assets/corporate-clash-logo.png" alt="Corporate Clash Logo" width="400" />
</p>

# Corporate Clash

Clash of Clans, but corporate. Build your office empire, hire employees, retain lawyers, and hostile-takeover your rivals in this multiplayer real-time strategy game.

## The Concept

Instead of villages and armies, you're running a corporate empire on an isometric grid. Build offices to house employees who generate revenue, hire lawyers at your law firm to defend against hostile takeovers, and launch attacks on other players to steal their funds and dismantle their operations.

## Gameplay

- **Build** — Place offices (small, medium, large) and law firms on your grid. Upgrade offices to increase employee capacity.
- **Hire** — Fill offices with workers, staff, marketers, engineers, and HR to generate profit each tick. Hire lawyers at your law firm to bolster your defense.
- **Attack** — Select a rival player and send troops to raid their empire. Combat resolves based on your attacking force vs. their legal defense buffer.
- **Defend** — Lawyers don't generate profit — they cost you money — but they protect your buildings and employees from hostile takeovers.
- **Random Events** — Periodic events shake things up, for better or worse.

## Tech Stack

- **Frontend**: [Pixi.js](https://pixijs.com/) for 2D isometric rendering
- **Backend**: [Hono](https://hono.dev/) server with SSE for real-time state sync
- **Runtime**: [Bun](https://bun.sh/)
- **Build**: [Vite](https://vite.dev/)

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
```

The game runs at `http://localhost:5173`. Open multiple tabs to play multiplayer.

## Commands

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `bun run dev`      | Start dev server             |
| `bun run build`    | Production build             |
| `bun run start`    | Build + start prod server    |
| `bun run lint`     | Lint with ESLint             |
| `bun run format`   | Format with Prettier         |
