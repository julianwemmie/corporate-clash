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
} from '../scenes/corporate-clash/types.js';
import { EconomyManager } from '../scenes/corporate-clash/EconomyManager.js';
import { AttackManager } from '../scenes/corporate-clash/AttackManager.js';

const TICK_RATE_MS = 150;

const app = new Hono();
const world = createWorld(GRID_SIZE);

const economyManager = new EconomyManager();
const attackManager = new AttackManager();

interface SSEClient {
  resolve: (tick: { data: string; id: number }) => void;
}

const clients = new Set<SSEClient>();

let tickId = 0;

function convertToGameState(gameWorld: CorporateWorld): GameState {
  const {
    phase,
    funds,
    mapDefense,
    grid,
    attackActive,
    attackTimer,
    alertInfo,
  } = gameWorld;
  return {
    phase,
    funds,
    mapDefense,
    grid,
    attackActive,
    attackTimer,
    alertInfo,
  };
}

setInterval(() => {
  world.attackActive = null;
  world.alertInfo = null;
  economyManager.update(world);
  attackManager.update(world);
  tickId++;

  const data = JSON.stringify(convertToGameState(world));
  for (const client of clients) {
    client.resolve({ data, id: tickId });
  }
}, TICK_RATE_MS);

app.get('/api', (c) => {
  return c.json(convertToGameState(world));
});

app.post('/game/action', async (c) => {
  const action = await c.req.json<GameAction>();
  const { row, col } = action;

  if (
    row < 0 ||
    row >= world.grid.length ||
    col < 0 ||
    col >= world.grid[0].length
  ) {
    return c.json({ error: 'out of bounds' }, 400);
  }

  const tile = world.grid[row][col];

  if (action.kind === 'build') {
    if (!BUILDING_TYPES.includes(action.buildingType)) {
      return c.json({ error: 'invalid building type' }, 400);
    }
    if (tile.building) {
      return c.json({ error: 'tile already has a building' }, 400);
    }
    const config = BUILDING_CONFIG[action.buildingType];
    if (world.funds < config.cost) {
      return c.json({ error: 'insufficient funds' }, 400);
    }
    world.funds -= config.cost;
    tile.building = {
      type: action.buildingType,
      employees: [],
      health: config.maxHealth,
    };
    return c.json({ ok: true });
  }

  if (action.kind === 'hire') {
    if (!EMPLOYEE_TYPES.includes(action.employeeType)) {
      return c.json({ error: 'invalid employee type' }, 400);
    }
    if (!tile.building) {
      return c.json({ error: 'no building on tile' }, 400);
    }
    const config = EMPLOYEE_CONFIG[action.employeeType];
    const capacity = BUILDING_CONFIG[tile.building.type].capacity;
    if (tile.building.employees.length >= capacity) {
      return c.json({ error: 'building at capacity' }, 400);
    }
    if (world.funds < config.cost) {
      return c.json({ error: 'insufficient funds' }, 400);
    }
    world.funds -= config.cost;
    tile.building.employees.push({ type: action.employeeType });
    world.mapDefense += config.defenseBoost;
    return c.json({ ok: true });
  }

  return c.json({ error: 'unknown action' }, 400);
});

app.get('/game/stream', (c) => {
  return streamSSE(c, async (stream) => {
    const client: SSEClient = { resolve: () => {} };
    clients.add(client);

    stream.onAbort(() => {
      clients.delete(client);
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
