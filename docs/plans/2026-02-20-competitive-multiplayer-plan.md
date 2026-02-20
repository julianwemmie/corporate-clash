# Competitive Multiplayer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add competitive multiplayer where up to 20 players each have their own grid, economy, and can attack each other RISK-style by sending employees as troops.

**Architecture:** Server holds a `Map<string, PlayerState>` — one `CorporateWorld` per player. Game loop iterates all players each tick, running economy per world. Attacks are cross-world mutations resolved server-side. Each player's SSE stream sends only their own world state plus a lightweight scoreboard. Client adds a join screen and attack panel.

**Tech Stack:** TypeScript, Hono (server), PixiJS (client), SSE (real-time), Vite

**Design doc:** `docs/plans/2026-02-20-competitive-multiplayer-design.md`

---

## Task 1: Server — Per-Player World Management

Convert the server from a single shared world to a `Map<string, PlayerState>`. Add `POST /game/join` endpoint and scope the game loop + SSE streams to individual players.

**Files:**

- Modify: `src/server/index.ts`
- Modify: `src/scenes/corporate-clash/types.ts` (add `playerId` to `GameAction`)

**Step 1: Add `playerId` to `GameAction`**

In `src/scenes/corporate-clash/types.ts`, change the `GameAction` type:

```typescript
export type GameAction =
  | {
      kind: 'build';
      playerId: string;
      row: number;
      col: number;
      buildingType: BuildingType;
    }
  | {
      kind: 'hire';
      playerId: string;
      row: number;
      col: number;
      employeeType: EmployeeType;
    }
  | {
      kind: 'attack';
      playerId: string;
      targetId: string;
      troops: AttackTroop[];
    };
```

**Step 2: Rewrite `src/server/index.ts` for multi-player**

Replace the single `world` with a players map. Full replacement:

```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { GRID_SIZE } from '../engine/types.js';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  EMPLOYEE_CONFIG,
  EMPLOYEE_TYPES,
  createWorld,
  type CorporateWorld,
  type GameAction,
  type GameState,
  type PlayerInfo,
} from '../scenes/corporate-clash/types.js';
import { EconomyManager } from '../scenes/corporate-clash/EconomyManager.js';

const TICK_RATE_MS = 150;
const ATTACK_COOLDOWN_TICKS = 100;

const app = new Hono();

interface SSEClient {
  resolve: (tick: { data: string; id: number }) => void;
}

interface PlayerState {
  id: string;
  name: string;
  world: CorporateWorld;
  client: SSEClient | null;
  attackCooldown: number;
}

const players = new Map<string, PlayerState>();
let tickId = 0;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toGameState(player: PlayerState): GameState {
  const { phase, funds, mapDefense, grid, attackActive, attackTimer } =
    player.world;
  const scoreboard: PlayerInfo[] = [];
  for (const p of players.values()) {
    let buildingCount = 0;
    let employeeCount = 0;
    for (const row of p.world.grid) {
      for (const tile of row) {
        if (tile.building) {
          buildingCount++;
          employeeCount += tile.building.employees.length;
        }
      }
    }
    scoreboard.push({
      id: p.id,
      name: p.name,
      funds: p.world.funds,
      buildingCount,
      employeeCount,
    });
  }
  return {
    phase,
    funds,
    mapDefense,
    grid,
    attackActive,
    attackTimer,
    attackCooldown: player.attackCooldown,
    players: scoreboard,
  };
}

const economyManager = new EconomyManager();

setInterval(() => {
  tickId++;
  for (const player of players.values()) {
    player.world.attackActive = null;
    economyManager.update(player.world);
    if (player.attackCooldown > 0) player.attackCooldown--;
  }

  for (const player of players.values()) {
    if (!player.client) continue;
    const data = JSON.stringify(toGameState(player));
    player.client.resolve({ data, id: tickId });
  }
}, TICK_RATE_MS);

// --- Join ---
app.post('/game/join', async (c) => {
  const { name } = await c.req.json<{ name: string }>();
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ error: 'name is required' }, 400);
  }
  const trimmed = name.trim().slice(0, 20);
  for (const p of players.values()) {
    if (p.name === trimmed) {
      return c.json({ error: 'name already taken' }, 400);
    }
  }
  const id = generateId();
  const world = createWorld(GRID_SIZE);
  players.set(id, {
    id,
    name: trimmed,
    world,
    client: null,
    attackCooldown: 0,
  });
  return c.json({ playerId: id });
});

// --- State snapshot ---
app.get('/api', (c) => {
  const playerId = c.req.query('playerId');
  if (!playerId) return c.json({ error: 'playerId required' }, 400);
  const player = players.get(playerId);
  if (!player) return c.json({ error: 'unknown player' }, 404);
  return c.json(toGameState(player));
});

// --- Actions ---
app.post('/game/action', async (c) => {
  const action = await c.req.json<GameAction>();
  const player = players.get(action.playerId);
  if (!player) return c.json({ error: 'unknown player' }, 400);

  const { row, col } = action;

  if (action.kind === 'build') {
    if (
      row < 0 ||
      row >= player.world.grid.length ||
      col < 0 ||
      col >= player.world.grid[0].length
    ) {
      return c.json({ error: 'out of bounds' }, 400);
    }
    if (!BUILDING_TYPES.includes(action.buildingType)) {
      return c.json({ error: 'invalid building type' }, 400);
    }
    const tile = player.world.grid[row][col];
    if (tile.building)
      return c.json({ error: 'tile already has a building' }, 400);
    const config = BUILDING_CONFIG[action.buildingType];
    if (player.world.funds < config.cost)
      return c.json({ error: 'insufficient funds' }, 400);
    player.world.funds -= config.cost;
    tile.building = { type: action.buildingType, employees: [] };
    return c.json({ ok: true });
  }

  if (action.kind === 'hire') {
    if (
      row < 0 ||
      row >= player.world.grid.length ||
      col < 0 ||
      col >= player.world.grid[0].length
    ) {
      return c.json({ error: 'out of bounds' }, 400);
    }
    if (!EMPLOYEE_TYPES.includes(action.employeeType)) {
      return c.json({ error: 'invalid employee type' }, 400);
    }
    const tile = player.world.grid[row][col];
    if (!tile.building) return c.json({ error: 'no building on tile' }, 400);
    const config = EMPLOYEE_CONFIG[action.employeeType];
    const capacity = BUILDING_CONFIG[tile.building.type].capacity;
    if (tile.building.employees.length >= capacity)
      return c.json({ error: 'building at capacity' }, 400);
    if (player.world.funds < config.cost)
      return c.json({ error: 'insufficient funds' }, 400);
    player.world.funds -= config.cost;
    tile.building.employees.push({ type: action.employeeType });
    return c.json({ ok: true });
  }

  if (action.kind === 'attack') {
    // Attack resolution implemented in Task 3
    return c.json({ error: 'attack not yet implemented' }, 501);
  }

  return c.json({ error: 'unknown action' }, 400);
});

// --- SSE Stream ---
app.get('/game/stream', (c) => {
  const playerId = c.req.query('playerId');
  if (!playerId) return c.json({ error: 'playerId required' }, 400);
  const player = players.get(playerId);
  if (!player) return c.json({ error: 'unknown player' }, 404);

  return streamSSE(c, async (stream) => {
    const client: SSEClient = { resolve: () => {} };
    player.client = client;

    stream.onAbort(() => {
      if (player.client === client) player.client = null;
    });

    while (true) {
      const tick = await new Promise<{ data: string; id: number }>(
        (resolve) => {
          client.resolve = resolve;
        },
      );
      await stream.writeSSE({
        data: tick.data,
        event: 'tick',
        id: String(tick.id),
      });
    }
  });
});

export default app;
```

**Step 3: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: Clean (no errors)

**Step 4: Test with curl**

```bash
# Join
curl -s -X POST http://localhost:5173/game/join -H 'Content-Type: application/json' -d '{"name":"Alice"}'
# → {"playerId":"abc12345"}

# Join duplicate name
curl -s -X POST http://localhost:5173/game/join -H 'Content-Type: application/json' -d '{"name":"Alice"}'
# → {"error":"name already taken"}

# Build (use playerId from join response)
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d '{"kind":"build","playerId":"abc12345","row":0,"col":0,"buildingType":"smallOffice"}'
# → {"ok":true}

# SSE stream
curl -s -N -m 2 http://localhost:5173/game/stream?playerId=abc12345
# → event: tick, data: {phase, funds, grid, players:[...]}
```

**Step 5: Commit**

```bash
git add src/server/index.ts src/scenes/corporate-clash/types.ts
git commit -m "feat: multi-player server with per-player worlds and join endpoint"
```

---

## Task 2: Client — Join Screen + Player Identity

Add a join screen where the player enters a name. Store the `playerId` and pass it to NetworkManager for scoped SSE + scoped actions.

**Files:**

- Modify: `index.html` (add join form HTML)
- Modify: `src/main.ts` (show join form, boot game after join)
- Modify: `src/scenes/corporate-clash/NetworkManager.ts` (accept playerId, connect to scoped SSE)
- Modify: `src/scenes/corporate-clash/CorporateClashScene.ts` (pass playerId to NetworkManager)
- Modify: `src/engine/types.ts` (add playerId to GameContext)

**Step 1: Add join form to `index.html`**

Add a `<div id="join">` with a text input and button, hidden by default alongside `#app`:

```html
<div
  id="join"
  style="display: flex; flex-direction: column; align-items: center; gap: 12px;"
>
  <h1 style="color: #fff; font-family: monospace;">Corporate Clash</h1>
  <input
    id="name-input"
    type="text"
    placeholder="Enter your name"
    maxlength="20"
    style="padding: 8px 12px; font-size: 16px; border-radius: 4px; border: none; width: 200px;"
  />
  <button
    id="join-btn"
    style="padding: 8px 24px; font-size: 16px; border-radius: 4px; border: none; cursor: pointer; background: #4a90d9; color: #fff;"
  >
    Join Game
  </button>
  <div
    id="join-error"
    style="color: #e74c3c; font-family: monospace; font-size: 14px;"
  ></div>
</div>
<div id="app" style="display: none;"></div>
```

Remove `width` and `height` from the `#app` CSS (PixiJS canvas sets its own size).

**Step 2: Modify `src/main.ts` to handle join flow**

```typescript
import { Application } from 'pixi.js';
import { Game } from './engine/Game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './engine/types.js';
import { CorporateClashScene } from './scenes/corporate-clash/CorporateClashScene.js';

const joinDiv = document.getElementById('join')!;
const appDiv = document.getElementById('app')!;
const nameInput = document.getElementById('name-input') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn')!;
const joinError = document.getElementById('join-error')!;

async function join(): Promise<string> {
  const name = nameInput.value.trim();
  if (!name) throw new Error('Name is required');
  const res = await fetch('/game/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.playerId;
}

async function startGame(playerId: string) {
  joinDiv.style.display = 'none';
  appDiv.style.display = 'block';

  const app = new Application();
  await app.init({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: 0x1a1a2e,
  });
  appDiv.appendChild(app.canvas);

  const game = new Game(app);
  game.loadScene(new CorporateClashScene(), { playerId });
}

joinBtn.addEventListener('click', async () => {
  joinError.textContent = '';
  try {
    const playerId = await join();
    await startGame(playerId);
  } catch (e) {
    joinError.textContent = (e as Error).message;
  }
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});
```

**Step 3: Add `playerId` to `GameContext`**

In `src/engine/types.ts`, add to `GameContext`:

```typescript
export interface GameContext {
  gridSize: number;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
  playerId: string;
}
```

Update `Game.loadScene()` if needed to accept and pass through the `playerId` option.

**Step 4: Update `CorporateClashScene.init()` to use playerId**

```typescript
init(ctx: GameContext): void {
  this.world = createWorld(ctx.gridSize);
  this.network = new NetworkManager(ctx.playerId);
  this.network.connect();
  // ... rest same
}
```

**Step 5: Update `NetworkManager` to accept playerId**

```typescript
export class NetworkManager implements Manager {
  private source: EventSource | null = null;
  private pending: GameState | null = null;
  readonly playerId: string;

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  connect(): void {
    this.source = new EventSource(`/game/stream?playerId=${this.playerId}`);
    // ... rest same
  }

  update(world: CorporateWorld): void {
    if (!this.pending) return;
    world.phase = this.pending.phase;
    world.funds = this.pending.funds;
    world.mapDefense = this.pending.mapDefense;
    world.grid = this.pending.grid;
    world.attackActive = this.pending.attackActive;
    world.attackTimer = this.pending.attackTimer;
    world.attackCooldown = this.pending.attackCooldown;
    world.players = this.pending.players;
    this.pending = null;
  }
  // ... destroy same
}
```

**Step 6: Update `MapManager.sendAction()` to include playerId**

The MapManager needs access to playerId. Pass it from the scene or store on the world. Simplest: add `playerId` to `CorporateWorld`:

In `src/scenes/corporate-clash/types.ts`, add to `CorporateWorld`:

```typescript
export interface CorporateWorld extends GameState {
  playerId: string; // add this
  selectedTile: GridPos | null;
  uiMode: UIMode;
  hoveredTile: GridPos | null;
}
```

Update `createWorld` to accept and store it. Then in MapManager:

```typescript
private sendAction(action: GameAction): void {
  fetch('/game/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
}

// Update callers to include playerId:
this.sendAction({ kind: 'build', playerId: world.playerId, row, col, buildingType });
this.sendAction({ kind: 'hire', playerId: world.playerId, row, col, employeeType });
```

**Step 7: Verify and test**

Run: `bunx tsc --noEmit`
Then open browser, enter name, verify join works and game loads with SSE streaming.

**Step 8: Commit**

```bash
git add index.html src/main.ts src/engine/types.ts src/scenes/corporate-clash/CorporateClashScene.ts src/scenes/corporate-clash/NetworkManager.ts src/scenes/corporate-clash/MapManager.ts src/scenes/corporate-clash/types.ts
git commit -m "feat: add join screen and player identity for multiplayer"
```

---

## Task 3: Server — RISK-Style Combat Resolution

Implement the `attack` action handler on the server. Attacker selects troops from their buildings, server resolves combat against the target, both players get damage reports.

**Files:**

- Modify: `src/server/index.ts` (replace attack stub with full resolution)

**Step 1: Implement attack handler**

Replace the `action.kind === 'attack'` stub in `src/server/index.ts`:

```typescript
if (action.kind === 'attack') {
  const target = players.get(action.targetId);
  if (!target) return c.json({ error: 'target not found' }, 400);
  if (action.targetId === action.playerId)
    return c.json({ error: 'cannot attack yourself' }, 400);
  if (player.attackCooldown > 0)
    return c.json({ error: 'attack on cooldown' }, 400);
  if (!action.troops || action.troops.length === 0)
    return c.json({ error: 'no troops selected' }, 400);

  // Validate and remove troops from attacker's buildings
  let totalAttackers = 0;
  for (const troop of action.troops) {
    const { row: tr, col: tc, count } = troop;
    if (
      tr < 0 ||
      tr >= player.world.grid.length ||
      tc < 0 ||
      tc >= player.world.grid[0].length
    ) {
      return c.json({ error: 'troop source out of bounds' }, 400);
    }
    const tile = player.world.grid[tr][tc];
    if (!tile.building)
      return c.json({ error: `no building at (${tr},${tc})` }, 400);
    if (count < 1 || count > tile.building.employees.length) {
      return c.json({ error: `invalid troop count at (${tr},${tc})` }, 400);
    }
    totalAttackers += count;
  }

  // Remove troops from attacker's buildings
  for (const troop of action.troops) {
    const tile = player.world.grid[troop.row][troop.col];
    tile.building!.employees.splice(0, troop.count);
    if (tile.building!.employees.length === 0) {
      tile.building = null;
    }
  }

  // Count defenders
  let totalDefenders = 0;
  for (const row of target.world.grid) {
    for (const tile of row) {
      if (tile.building) totalDefenders += tile.building.employees.length;
    }
  }

  // RISK-style combat: paired 1v1 rounds
  let attackersLeft = totalAttackers;
  let defendersLeft = totalDefenders;
  while (attackersLeft > 0 && defendersLeft > 0) {
    const attackRoll = Math.random();
    const defenseRoll = Math.random();
    if (attackRoll > defenseRoll) {
      defendersLeft--;
    } else {
      attackersLeft--;
    }
  }

  // Apply defender losses randomly across buildings
  let defenderLosses = totalDefenders - defendersLeft;
  let defenderBuildingsLost = 0;
  const defenderEmployeesLost = defenderLosses;

  for (const row of target.world.grid) {
    for (const tile of row) {
      if (!tile.building || defenderLosses <= 0) continue;
      const removable = Math.min(
        defenderLosses,
        tile.building.employees.length,
      );
      tile.building.employees.splice(0, removable);
      defenderLosses -= removable;
      if (tile.building.employees.length === 0) {
        tile.building = null;
        defenderBuildingsLost++;
      }
    }
  }

  const attackerEmployeesLost = totalAttackers - attackersLeft;

  // Set damage reports on both players
  player.world.attackActive = {
    buildingsLost: 0,
    employeesLost: attackerEmployeesLost,
    attackerName: null,
    defender: target.name,
    isAttacker: true,
  };

  target.world.attackActive = {
    buildingsLost: defenderBuildingsLost,
    employeesLost: defenderEmployeesLost,
    attackerName: player.name,
    defender: null,
    isAttacker: false,
  };

  player.attackCooldown = ATTACK_COOLDOWN_TICKS;

  return c.json({ ok: true });
}
```

**Step 2: Verify it compiles**

Run: `bunx tsc --noEmit`

**Step 3: Test with curl**

```bash
# Join two players
ALICE=$(curl -s -X POST http://localhost:5173/game/join -H 'Content-Type: application/json' -d '{"name":"Alice"}' | jq -r .playerId)
BOB=$(curl -s -X POST http://localhost:5173/game/join -H 'Content-Type: application/json' -d '{"name":"Bob"}' | jq -r .playerId)

# Build + hire for Alice
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d "{\"kind\":\"build\",\"playerId\":\"$ALICE\",\"row\":0,\"col\":0,\"buildingType\":\"smallOffice\"}"
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d "{\"kind\":\"hire\",\"playerId\":\"$ALICE\",\"row\":0,\"col\":0,\"employeeType\":\"officeWorker\"}"
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d "{\"kind\":\"hire\",\"playerId\":\"$ALICE\",\"row\":0,\"col\":0,\"employeeType\":\"officeWorker\"}"
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d "{\"kind\":\"hire\",\"playerId\":\"$ALICE\",\"row\":0,\"col\":0,\"employeeType\":\"officeWorker\"}"

# Build + hire for Bob
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d "{\"kind\":\"build\",\"playerId\":\"$BOB\",\"row\":0,\"col\":0,\"buildingType\":\"smallOffice\"}"
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d "{\"kind\":\"hire\",\"playerId\":\"$BOB\",\"row\":0,\"col\":0,\"employeeType\":\"officeWorker\"}"

# Alice attacks Bob
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d "{\"kind\":\"attack\",\"playerId\":\"$ALICE\",\"targetId\":\"$BOB\",\"troops\":[{\"row\":0,\"col\":0,\"count\":2}]}"
# → {"ok":true}

# Verify cooldown
curl -s -X POST http://localhost:5173/game/action -H 'Content-Type: application/json' -d "{\"kind\":\"attack\",\"playerId\":\"$ALICE\",\"targetId\":\"$BOB\",\"troops\":[{\"row\":0,\"col\":0,\"count\":1}]}"
# → {"error":"attack on cooldown"}

# Check both players' state for attackActive
curl -s "http://localhost:5173/api?playerId=$ALICE" | jq .attackActive
curl -s "http://localhost:5173/api?playerId=$BOB" | jq .attackActive
```

**Step 4: Commit**

```bash
git add src/server/index.ts
git commit -m "feat: add RISK-style combat resolution for player attacks"
```

---

## Task 4: Client — Attack Panel UI

Add an `AttackPanelManager` that lets the player view the scoreboard, pick a target, select troops from their buildings, and send the attack action.

**Files:**

- Create: `src/scenes/corporate-clash/AttackPanelManager.ts`
- Modify: `src/scenes/corporate-clash/CorporateClashScene.ts` (register new manager)
- Modify: `src/scenes/corporate-clash/types.ts` (expand `attackPanel` UIMode with state)

**Step 1: Expand the `attackPanel` UIMode**

In `src/scenes/corporate-clash/types.ts`, replace `{ kind: 'attackPanel' }` with:

```typescript
| { kind: 'attackPanel'; targetId: string | null; troops: AttackTroop[] }
```

This tracks which target is selected and which troops have been assigned.

**Step 2: Create `AttackPanelManager.ts`**

```typescript
import type { Renderer } from '../../engine/types.js';
import { CANVAS_HEIGHT, RIGHT_PANEL_WIDTH } from '../../engine/types.js';
import type {
  CorporateWorld,
  Manager,
  AttackTroop,
  GameAction,
} from './types.js';

const PANEL_X = 10;
const LINE_HEIGHT = 22;
const HEADER_SIZE = 18;
const OPTION_SIZE = 13;
const DIM = 0x666666;
const BRIGHT = 0xffffff;

export class AttackPanelManager implements Manager {
  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'attackPanel') {
      // 'A' key opens attack panel from default mode
      if (key === 'KeyA' && world.uiMode.kind === 'none') {
        world.uiMode = { kind: 'attackPanel', targetId: null, troops: [] };
      }
      return;
    }

    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    const { targetId, troops } = world.uiMode;

    // Phase 1: Picking a target (no target selected yet)
    if (!targetId) {
      const index = parseInt(key.replace('Digit', '')) - 1;
      const otherPlayers = world.players.filter((p) => p.id !== world.playerId);
      const target = otherPlayers[index];
      if (target) {
        world.uiMode = { kind: 'attackPanel', targetId: target.id, troops: [] };
      }
      return;
    }

    // Phase 2: Selecting troops from buildings
    const index = parseInt(key.replace('Digit', '')) - 1;
    const buildingTiles = [];
    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building && tile.building.employees.length > 0) {
          buildingTiles.push(tile);
        }
      }
    }
    const tile = buildingTiles[index];
    if (tile) {
      const existing = troops.find(
        (t) => t.row === tile.row && t.col === tile.col,
      );
      const currentCount = existing ? existing.count : 0;
      const maxCount = tile.building!.employees.length;
      if (currentCount < maxCount) {
        const newTroops = troops.filter(
          (t) => !(t.row === tile.row && t.col === tile.col),
        );
        newTroops.push({
          row: tile.row,
          col: tile.col,
          count: currentCount + 1,
        });
        world.uiMode = { kind: 'attackPanel', targetId, troops: newTroops };
      }
    }

    // Enter to launch attack
    if (key === 'Enter' && troops.length > 0) {
      const action: GameAction = {
        kind: 'attack',
        playerId: world.playerId,
        targetId,
        troops,
      };
      fetch('/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
      world.uiMode = { kind: 'none' };
    }
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'attackPanel') return;

    renderer.drawRect(0, 0, RIGHT_PANEL_WIDTH, CANVAS_HEIGHT, 0x000000);

    const { targetId, troops } = world.uiMode;
    let y = 10;

    renderer.drawText('Attack', PANEL_X, y, {
      fontSize: HEADER_SIZE,
      color: 0xe74c3c,
    });
    y += LINE_HEIGHT + 10;

    if (world.attackCooldown > 0) {
      renderer.drawText(`Cooldown: ${world.attackCooldown} ticks`, PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: DIM,
      });
      y += LINE_HEIGHT;
      renderer.drawText('[ESC] Close', PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0xaaaaaa,
      });
      return;
    }

    // Phase 1: Pick target
    if (!targetId) {
      renderer.drawText('Pick target:', PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0xaaaaaa,
      });
      y += LINE_HEIGHT;
      const otherPlayers = world.players.filter((p) => p.id !== world.playerId);
      otherPlayers.forEach((p, i) => {
        renderer.drawText(`[${i + 1}] ${p.name}`, PANEL_X, y, {
          fontSize: OPTION_SIZE,
          color: BRIGHT,
        });
        y += LINE_HEIGHT - 4;
        renderer.drawText(
          `    $${p.funds.toLocaleString()} | ${p.employeeCount} emp`,
          PANEL_X,
          y,
          {
            fontSize: OPTION_SIZE - 2,
            color: 0xaaaaaa,
          },
        );
        y += LINE_HEIGHT;
      });
    } else {
      // Phase 2: Pick troops
      const target = world.players.find((p) => p.id === targetId);
      renderer.drawText(`Target: ${target?.name ?? '???'}`, PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0xe74c3c,
      });
      y += LINE_HEIGHT + 4;

      renderer.drawText('Send troops from:', PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0xaaaaaa,
      });
      y += LINE_HEIGHT;

      const buildingTiles = [];
      for (const row of world.grid) {
        for (const tile of row) {
          if (tile.building && tile.building.employees.length > 0) {
            buildingTiles.push(tile);
          }
        }
      }

      buildingTiles.forEach((tile, i) => {
        const assigned = troops.find(
          (t) => t.row === tile.row && t.col === tile.col,
        );
        const count = assigned ? assigned.count : 0;
        const max = tile.building!.employees.length;
        renderer.drawText(
          `[${i + 1}] (${tile.row},${tile.col}) ${count}/${max}`,
          PANEL_X,
          y,
          { fontSize: OPTION_SIZE, color: BRIGHT },
        );
        y += LINE_HEIGHT;
      });

      const totalTroops = troops.reduce((sum, t) => sum + t.count, 0);
      y += 4;
      renderer.drawText(`Total: ${totalTroops} troops`, PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0xe74c3c,
      });
      y += LINE_HEIGHT + 4;

      if (totalTroops > 0) {
        renderer.drawText('[ENTER] Launch Attack', PANEL_X, y, {
          fontSize: OPTION_SIZE,
          color: 0x2ecc71,
        });
        y += LINE_HEIGHT;
      }
    }

    renderer.drawText('[ESC] Close', PANEL_X, y + 4, {
      fontSize: OPTION_SIZE,
      color: 0xaaaaaa,
    });
  }
}
```

**Step 3: Register in `CorporateClashScene.ts`**

Import and add to the managers array:

```typescript
import { AttackPanelManager } from './AttackPanelManager.js';

// In init():
this.managers = [
  this.network,
  new MapManager(),
  new LeftPanelManager(),
  new RightPanelManager(),
  new AttackPanelManager(),
  new AlertManager(),
];
```

**Step 4: Verify and test**

Run: `bunx tsc --noEmit`
Open two browser tabs, join as different players, press 'A' to open attack panel, verify player list shows.

**Step 5: Commit**

```bash
git add src/scenes/corporate-clash/AttackPanelManager.ts src/scenes/corporate-clash/CorporateClashScene.ts src/scenes/corporate-clash/types.ts
git commit -m "feat: add attack panel UI for selecting targets and troops"
```

---

## Task 5: Update AlertManager for Multiplayer Damage Reports

Update the alert modal to show who attacked whom, with different messages for attacker vs defender.

**Files:**

- Modify: `src/scenes/corporate-clash/AlertManager.ts`

**Step 1: Update render method**

Replace the hardcoded alert message with context-aware text:

```typescript
render(world: CorporateWorld, renderer: Renderer): void {
  if (world.uiMode.kind !== 'alert') return;

  renderer.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0xffffff, { alpha: 0.3 });

  const alertWidth = 450;
  const alertHeight = 220;
  renderer.drawRect(
    CANVAS_WIDTH / 2 - alertWidth / 2,
    CANVAS_HEIGHT / 2 - alertHeight / 2,
    alertWidth,
    alertHeight,
    0x000000,
    { alpha: 0.9 },
  );

  const report = world.attackActive;
  if (!report) return;

  let title: string;
  let message: string;

  if (report.isAttacker) {
    title = 'Attack Report';
    message = `You attacked ${report.defender}! You lost ${report.employeesLost} employees. They lost ${report.buildingsLost} buildings.`;
  } else {
    title = 'Under Attack!';
    message = `${report.attackerName} attacked you! You lost ${report.employeesLost} employees and ${report.buildingsLost} buildings.`;
  }

  renderer.drawText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 85, {
    fontSize: 24, color: 0xffffff, anchor: 0.5,
  });

  renderer.drawText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10, {
    fontSize: 14, color: 0xffffff, anchor: 0.5,
  });

  renderer.drawText('Space bar to continue...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70, {
    fontSize: 12, color: 0xffffff, anchor: 0.5,
  });
}
```

**Step 2: Verify and test**

Run: `bunx tsc --noEmit`
Test by attacking from one tab and checking both tabs show appropriate alert messages.

**Step 3: Commit**

```bash
git add src/scenes/corporate-clash/AlertManager.ts
git commit -m "feat: update alert modal for multiplayer attack/defense reports"
```

---

## Task 6: Remove Old AttackManager + Update LeftPanelManager

The timer-based random `AttackManager` is no longer needed. Remove it from the server. Update the LeftPanelManager to show attack cooldown instead of attack timer, and show a player count.

**Files:**

- Modify: `src/server/index.ts` (remove AttackManager import and usage)
- Modify: `src/scenes/corporate-clash/LeftPanelManager.ts` (show cooldown + player count)

**Step 1: Remove AttackManager from server**

In `src/server/index.ts`, remove the `AttackManager` import and any usage of it in the game loop. The attack timer fields on `CorporateWorld` (`attackTimer`, `ATTACK_INTERVAL_TICKS`) can remain in types for now but are no longer used by the server.

**Step 2: Update LeftPanelManager**

Replace the "Next attack" timer display with cooldown and player count:

```typescript
// Replace the attack timer line:
renderer.drawText(`Players: ${world.players.length}`, 10, 136, {
  fontSize: 14,
  color: 0xcccccc,
});

if (world.attackCooldown > 0) {
  const cooldownSecs = Math.ceil(world.attackCooldown * TICK_RATE_S);
  renderer.drawText(
    `Attack cooldown: ${cooldownSecs}s`,
    10,
    CANVAS_HEIGHT - 44,
    {
      fontSize: 14,
      color: 0xe74c3c,
    },
  );
}

renderer.drawText('[A] Attack', 10, CANVAS_HEIGHT - 24, {
  fontSize: 14,
  color: 0xaaaaaa,
});
```

**Step 3: Verify and test**

Run: `bunx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/server/index.ts src/scenes/corporate-clash/LeftPanelManager.ts
git commit -m "feat: remove random attacks, show cooldown and player count in HUD"
```

---

## Task 7: End-to-End Test + Polish

Full integration test across two browser tabs. Fix any issues found.

**Step 1: Start dev server**

```bash
bunx vite
```

**Step 2: Test join flow**

1. Open Tab 1 → Enter "Alice" → Join
2. Open Tab 2 → Enter "Bob" → Join
3. Verify both tabs show their own empty grids
4. Verify both tabs show 2 players in scoreboard

**Step 3: Test build/hire**

1. Tab 1 (Alice): Build a smallOffice, hire 3 employees
2. Verify Tab 2 (Bob) scoreboard updates to show Alice's building/employee counts
3. Tab 2 (Bob): Build a smallOffice, hire 2 employees

**Step 4: Test attack**

1. Tab 1 (Alice): Press 'A', select Bob as target, assign 2 troops, press Enter
2. Verify Tab 1 shows attacker damage report alert
3. Verify Tab 2 shows defender damage report alert
4. Dismiss both alerts with Space
5. Verify cooldown shows on Tab 1's HUD
6. Verify Tab 1 can't attack again until cooldown expires

**Step 5: Test edge cases**

- Try attacking yourself (should be rejected)
- Try attacking with no troops (should be rejected)
- Try joining with duplicate name (should be rejected)
- Try joining with empty name (should be rejected)

**Step 6: Run type check**

Run: `bunx tsc --noEmit`

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: end-to-end multiplayer polish"
```
