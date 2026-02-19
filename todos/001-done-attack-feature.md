# Attack Feature

## Status: In Progress

## Description

Every so often, a rival corporation attacks the player. An alert pops up saying "You are being attacked!" — the user presses space to advance, and the second page shows how many employees and buildings were lost. A countdown to the next attack is displayed on the left panel.

## Work Split

See `plans/2026-02-18-attack-feature-work-split.md` for the full breakdown. Three parallel streams:

1. **Timer & Countdown Display** — attack timer on world state, countdown on left panel
2. **Damage Logic** — calculate and apply building/employee losses
3. **Alert Modal UI** — two-page overlay with space to advance/dismiss
