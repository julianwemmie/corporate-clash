---
status: done
type: chore
created: 2026-03-12
---

# Add cron job to clean up accounts daily

Add a daily cron job that clears disconnected player sessions from the in-memory `players` Map at midnight.

## Approach

- Create a new `src/server/cron.ts` module (keep cron logic separate from the game loop)
- Use the `croner` library to schedule a midnight cron (`0 0 * * *`)
- The cleanup function iterates the `players` Map and removes entries where `player.client === null` (disconnected)
- Active players with a live SSE connection are **not** removed
- No logging or player notifications needed — just a silent sweep
- Import and start the cron job from the server entry point

## Implementation steps

- [ ] Install `croner`
- [ ] Create `src/server/cron.ts` with cleanup function + cron schedule
- [ ] Export the `players` Map from `src/server/index.ts` so the cron module can access it
- [ ] Import and initialize the cron in the server startup
