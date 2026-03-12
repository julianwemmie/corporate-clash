---
status: done
type: feature
created: 2026-03-12
---

# Add a tutorial

Add a 2-3 page HTML tutorial that appears after the player enters their name, before the game starts.

## Requirements

- **Format**: Multi-page flow (paginated sections, not a modal overlay)
- **Placement**: Appears between name entry and game join (`POST /game/join`)
- **Styling**: Matches the game's existing corporate theme
- **Skip**: Always includes a "Skip" button so returning players can jump straight in
- **Frequency**: Shows every time (no localStorage / first-time-only logic)
- **Length**: 2-3 pages, kept brief

## Content (rough outline)

1. **Welcome / What is Corporate Clash** — brief intro to the game concept (build a corporate empire, compete against rivals)
2. **How to play** — core loop: place buildings on the grid, hire employees to generate revenue, attack other players
3. **Go!** — final page with a button to start the game

## Implementation notes

- Tutorial flow lives between name entry and the `POST /game/join` call in `src/main.ts`
- Can be implemented as a small dedicated manager or inline in main.ts
