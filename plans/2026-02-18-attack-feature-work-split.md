# Corporate Clash — Attack Feature Work Split

## Overview

The game needs a new attack system: every so often a rival corporation attacks, destroying some buildings and employees. An alert modal pops up, and a countdown to the next attack is shown on the left panel. Here's the split across three people.

---

## Person 1: Attack Timer & Countdown Display

**Owns:** The timer that counts down to the next attack, and showing it on the left panel.

- Add attack timer fields to `CorporateWorld` (e.g. `attackTimer`, `attackInterval`)
- Decrement the timer each tick
- When the timer hits 0, set a flag that an attack is happening, then reset the timer
- Render the countdown at the bottom of `LeftPanelManager`

**Touches:** `types.ts`, `LeftPanelManager.ts`, possibly `EconomyManager.ts` or the scene's update loop

---

## Person 2: Attack Damage Logic

**Owns:** Calculating and applying damage when an attack triggers.

- When the attack flag is set, calculate losses — randomly pick buildings destroyed and employees lost (based on what the player currently has)
- Apply the losses to world state (remove buildings from tiles, reduce employee counts)
- Produce a damage report (e.g. `{ buildingsLost: 1, employeesLost: 5 }`) and store it on world state so the UI can read it

**Touches:** `types.ts` (damage report type), new `AttackManager.ts`, `CorporateWorld` mutation

---

## Person 3: Alert Modal UI

**Owns:** The two-page overlay that shows when an attack happens.

- Page 1: "You are being attacked!" — press space to advance
- Page 2: Shows the damage report (buildings and employees lost) — press space to dismiss
- Should render as a full-screen overlay on top of the game
- Handle space key input to advance between pages and dismiss

**Touches:** New `AlertManager.ts` or similar, `CorporateClashScene.ts` (input routing for space), `Renderer.ts` (overlay drawing)

---

## Parallelism Strategy

```
Person 1 (timer)          Person 2 (damage)           Person 3 (modal UI)
-----------------         -----------------           -------------------
Add timer to world state  Add damage report type      AlertManager rendering
Decrement each tick       AttackManager damage calc   Two-page flow + input
Trigger attack flag       Apply losses to world       Overlay drawing
Countdown on left panel   Store report on world       Space key handling
```

All three can work in parallel. Agree on shared types upfront:

- `attackTimer: number` and `attackActive: boolean` on `CorporateWorld`
- `AttackReport { buildingsLost: number, employeesLost: number }` on world state

### Integration (after all 3 merge)

Wire it together: timer triggers damage calc, damage calc feeds report into alert modal. Should be quick once the three streams land.
