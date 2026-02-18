# Corporate Clash — Layer 1 Work Split

## Overview

The current codebase has a working engine (game loop, renderer, input) with a Snake game as proof-of-concept. We need a new `CorporateClashScene` with its own managers. Here's the split across three people.

---

## Person 1: Core Scene + Map + Input

**Owns:** The foundation everyone else builds on. Define the shared data model, get the grid rendering, and handle mouse/click input.

**Files to create:**

- `src/scenes/corporate/types.ts` — All shared types: `CorporateWorld`, `Building`, `Employee`, `TileState`, `GamePhase`, employee/building config tables (costs, capacities, profit rates)
- `src/scenes/corporate/CorporateClashScene.ts` — Scene orchestrator (same pattern as `SnakeScene`)
- `src/scenes/corporate/MapRenderManager.ts` — Renders the 4x4 grid with tile states (empty, occupied, selected)
- `src/scenes/corporate/MapInputManager.ts` — Mouse/click handling for selecting tiles on the grid

**Also:**

- Update `src/main.ts` to load `CorporateClashScene` instead of `SnakeScene`
- May need to extend `engine/Input.ts` and `engine/types.ts` to support mouse events (currently keyboard-only)
- May need to extend `engine/Renderer.ts` to support click-to-grid-coordinate conversion

**Why first-ish:** The `types.ts` file is a shared dependency — sketch it out early and push it so the other two can import from it. The grid + mouse input is also foundational. But once types are defined, all three can code in parallel against the interfaces.

---

## Person 2: Building System

**Owns:** Everything about placing and displaying buildings on the map.

**Files to create:**

- `src/scenes/corporate/BuildingManager.ts` — Logic for placing buildings on tiles (validation: tile empty? can afford?), deducting funds on purchase
- `src/scenes/corporate/BuildingPanelManager.ts` — UI panel showing the 3 building types (Small Office / Medium Office / Skyscraper), their costs, and capacity. Highlights which is selected. Could be a sidebar or bottom bar.

**Key data (from PRD):**

| Building      | Capacity | Cost (TBD) |
| ------------- | -------- | ---------- |
| Small Office  | 10       | e.g. $50K  |
| Medium Office | 20       | e.g. $150K |
| Skyscraper    | 30       | e.g. $400K |

**Depends on:** `types.ts` from Person 1 for the world model, and the click-selection flow from `MapInputManager` (selected tile -> place building). Coordinate on the interaction: Person 1 handles "which tile is selected", Person 2 handles "what happens when you confirm placement."

---

## Person 3: Employee System + Economy / HUD

**Owns:** Hiring employees, assigning them to buildings, income generation, and the resource stats display.

**Files to create:**

- `src/scenes/corporate/EmployeeManager.ts` — Hiring employees (validation: building has capacity? can afford?), assigning to buildings, deducting hire cost
- `src/scenes/corporate/EmployeePanelManager.ts` — UI for selecting employee types to hire and seeing current headcount per building
- `src/scenes/corporate/EconomyManager.ts` — Runs on each tick: calculates income from employees, adds to funds. Core game loop driver.
- `src/scenes/corporate/HUDManager.ts` — Top-of-screen display showing current funds, income/sec, total employees, total capacity

**Key data (from PRD):**

| Employee Type | Cost (TBD) | Profit/tick (TBD) |
| ------------- | ---------- | ----------------- |
| Staff         | e.g. $10K  | e.g. $1K          |
| Engineer      | e.g. $30K  | e.g. $5K          |
| Marketing     | e.g. $20K  | e.g. $3K          |
| Office Worker | e.g. $5K   | e.g. $500         |

**Depends on:** `types.ts` from Person 1 for the world model. Needs buildings to exist to assign employees, but can develop the UI and logic against mock data / the type interfaces before buildings are wired up.

---

## Parallelism Strategy

```
Person 1 (30 min)     Person 2 (after types.ts)     Person 3 (after types.ts)
-----------------     ------------------------       ------------------------
Define types.ts  -->  BuildingManager                EmployeeManager
CorporateClashScene   BuildingPanelManager           EmployeePanelManager
MapRenderManager      Building rendering on grid     EconomyManager
MapInputManager                                      HUDManager
Update main.ts
Extend engine for
  mouse input
```

Person 1 should push `types.ts` as soon as it's drafted so 2 and 3 can start. All three work against the same `CorporateWorld` object (same pattern as `SnakeWorld` in the snake game — managers mutate a shared world state).
