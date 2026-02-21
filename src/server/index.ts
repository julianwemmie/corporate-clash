import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { GRID_SIZE, TICK_RATE_MS } from '../engine/types.js';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  EMPLOYEE_CONFIG,
  EMPLOYEE_TYPES,
  EVENT_INTERVAL_TICKS,
  SELL_PERCENTAGE,
  UPGRADE_PATH,
  UPGRADE_COST_FACTOR,
  createWorld,
  getEmployeeCategory,
  type CorporateWorld,
  type DamageReport,
  type EventConfig,
  type GameAction,
  type GameState,
  type PlayerInfo,
} from '../scenes/corporate-clash/types.js';
import { EconomyManager } from './EconomyManager.js';

const MAX_PLAYERS = 50;
const ATTACK_COOLDOWN_TICKS = 100;
const DEFENSE_BUFFER_TICKS = 400; // 60s immunity after being attacked

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
  defenseBuffer: number;
}

const EVENTS: EventConfig[] = [
  {
    label: 'Trump Tariffs',
    weight: 1,
    effect: (world) => {
      // Tariffs hit every building — supply costs go up
      let buildingCount = 0;
      for (const row of world.grid) {
        for (const tile of row) {
          if (tile.building) buildingCount++;
        }
      }
      if (buildingCount === 0) {
        const flat = 5_000;
        world.funds -= flat;
        return {
          title: 'Sweeping Tariffs!',
          message: `Trump instituted sweeping tariffs on office supplies. Import fees cost you $${flat.toLocaleString()}.`,
        };
      }
      const tariff = buildingCount * 15_000;
      world.funds -= tariff;
      return {
        title: 'Sweeping Tariffs!',
        message: `Trump instituted sweeping tariffs on office supplies. Your ${buildingCount} ${buildingCount === 1 ? 'building costs' : 'buildings cost'} you $${tariff.toLocaleString()} in import fees.`,
      };
    },
  },
  {
    label: 'Return To Office',
    weight: 1,
    effect: (world) => {
      // CEO mandates RTO — every employee has a 33% chance of quitting
      let lost = 0;
      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building || tile.building.employees.length === 0) continue;
          tile.building.employees = tile.building.employees.filter((e) => {
            if (Math.random() < 0.33) {
              world.mapDefense -= EMPLOYEE_CONFIG[e.type].defenseBoost;
              lost++;
              return false;
            }
            return true;
          });
          if (tile.building.employees.length === 0) {
            tile.building = null;
          }
        }
      }
      if (lost === 0) {
        return {
          title: 'Return To Office!',
          message:
            'Your CEO instituted a return-to-office order. Miraculously, nobody quit.',
        };
      }
      return {
        title: 'Return To Office!',
        message: `Your CEO instituted a return-to-office order. ${lost} employee${lost === 1 ? '' : 's'} quit rather than give up working from home.`,
      };
    },
  },
  {
    label: 'HR Fires Scorpios',
    weight: 1,
    effect: (world) => {
      // Head of HR fires all Scorpios — each employee has a 1-in-12 chance
      let fired = 0;
      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building || tile.building.employees.length === 0) continue;
          tile.building.employees = tile.building.employees.filter((e) => {
            if (Math.random() < 1 / 12) {
              world.mapDefense -= EMPLOYEE_CONFIG[e.type].defenseBoost;
              fired++;
              return false;
            }
            return true;
          });
          if (tile.building.employees.length === 0) {
            tile.building = null;
          }
        }
      }
      if (fired === 0) {
        return {
          title: 'Zodiac Screening!',
          message:
            'The Head of HR ran birth chart audits on the whole company. No Scorpios were found.',
        };
      }
      return {
        title: 'Zodiac Screening!',
        message: `The Head of HR fired all Scorpios. ${fired} employee${fired === 1 ? ' was' : 's were'} terminated for having toxic energy.`,
      };
    },
  },
  {
    label: 'Rebrand To X',
    weight: 1,
    effect: (world) => {
      // Catastrophic rebrand — lose half your employees across all buildings
      let lost = 0;
      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building || tile.building.employees.length === 0) continue;
          const toRemove = Math.ceil(tile.building.employees.length / 2);
          for (let i = 0; i < toRemove; i++) {
            const emp = tile.building.employees.pop()!;
            world.mapDefense -= EMPLOYEE_CONFIG[emp.type].defenseBoost;
            lost++;
          }
          if (tile.building.employees.length === 0) {
            tile.building = null;
          }
        }
      }
      if (lost === 0) {
        return {
          title: 'Rebranded To X',
          message:
            'Your CEO rebranded the company to X, the everything app. Nobody noticed because you have no employees.',
        };
      }
      return {
        title: 'Rebranded To X',
        message: `Your CEO rebranded the company to X, the everything app. ${lost} employee${lost === 1 ? '' : 's'} quit in embarrassment.`,
      };
    },
  },
  {
    label: 'Intern Deletes DB',
    weight: 1,
    effect: (world) => {
      // Wipes funds to near zero and destroys all buildings
      const previousFunds = world.funds;
      let buildingsLost = 0;
      let employeesLost = 0;
      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building) continue;
          for (const emp of tile.building.employees) {
            world.mapDefense -= EMPLOYEE_CONFIG[emp.type].defenseBoost;
            employeesLost++;
          }
          tile.building = null;
          buildingsLost++;
        }
      }
      world.funds = Math.floor(world.funds * 0.1);
      const fundsLost = previousFunds - world.funds;
      if (buildingsLost === 0 && fundsLost === 0) {
        return {
          title: 'Intern Incident',
          message:
            'The intern tried to delete the production database, but there was nothing to delete.',
        };
      }
      return {
        title: 'INTERN DELETED PROD DB',
        message: `An unpaid intern ran DROP TABLE in production. You lost ${buildingsLost} building${buildingsLost === 1 ? '' : 's'}, ${employeesLost} employee${employeesLost === 1 ? '' : 's'}, and $${fundsLost.toLocaleString()} in recovered funds. 90% of your cash is gone.`,
      };
    },
  },
  {
    label: 'Meta Poaches Chief of AI',
    weight: 1,
    effect: (world) => {
      // Target the most expensive employee
      let bestTile: (typeof world.grid)[0][0] | null = null;
      let bestIdx = -1;
      let bestCost = -1;
      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building) continue;
          for (let i = 0; i < tile.building.employees.length; i++) {
            const cost = EMPLOYEE_CONFIG[tile.building.employees[i].type].cost;
            if (cost > bestCost) {
              bestCost = cost;
              bestTile = tile;
              bestIdx = i;
            }
          }
        }
      }
      if (!bestTile || bestIdx === -1) {
        return {
          title: 'Poaching Attempt',
          message:
            'Meta tried to poach your Chief of AI, but you have no employees!',
        };
      }
      const emp = bestTile.building!.employees[bestIdx];
      const config = EMPLOYEE_CONFIG[emp.type];
      world.mapDefense -= config.defenseBoost;
      bestTile.building!.employees.splice(bestIdx, 1);
      if (bestTile.building!.employees.length === 0) {
        bestTile.building = null;
      }
      return {
        title: 'Poached by Meta!',
        message: `Meta poached your ${config.label} ($${config.cost.toLocaleString()} to replace)!`,
      };
    },
  },
];

function pickWeightedEvent(): EventConfig {
  const totalWeight = EVENTS.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const event of EVENTS) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }
  return EVENTS[0];
}
const players = new Map<string, PlayerState>();
const economyManager = new EconomyManager();

let tickId = 0;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toGameState(player: PlayerState): GameState {
  const {
    phase,
    funds,
    mapDefense,
    grid,
    attackActive,
    eventResult,
    eventTimer,
  } = player.world;

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
      defenseBuffer: p.defenseBuffer,
    });
  }

  return {
    phase,
    funds,
    mapDefense,
    grid,
    attackActive,
    eventResult,
    eventTimer,
    attackCooldown: player.attackCooldown,
    defenseBuffer: player.defenseBuffer,
    players: scoreboard,
  };
}

// Game loop: iterate all players
setInterval(() => {
  tickId++;

  for (const player of players.values()) {
    economyManager.update(player.world);
    if (player.attackCooldown > 0) player.attackCooldown--;

    // Random events (skipped while shield is active)
    player.world.eventTimer--;
    if (player.world.eventTimer <= 0) {
      player.world.eventTimer = EVENT_INTERVAL_TICKS;

      if (player.defenseBuffer <= 0) {
        const event = pickWeightedEvent();
        player.world.eventResult = event.effect(player.world);
        player.defenseBuffer = EVENT_INTERVAL_TICKS;
      }
    }

    if (player.defenseBuffer > 0) player.defenseBuffer--;
  }

  for (const player of players.values()) {
    if (player.client) {
      const data = JSON.stringify(toGameState(player));
      player.client.resolve({ data, id: tickId });
    }
    player.world.attackActive = null;
    player.world.eventResult = null;
  }
}, TICK_RATE_MS);

// POST /game/join — register a new player
app.post('/game/join', async (c) => {
  const body = await c.req.json<{ name?: string }>();

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return c.json({ error: 'name is required' }, 400);
  }

  const name = body.name.trim().slice(0, 20);

  // Reject duplicate names
  for (const p of players.values()) {
    if (p.name === name) {
      return c.json({ error: 'name already taken' }, 400);
    }
  }

  if (players.size >= MAX_PLAYERS) {
    return c.json({ error: 'server is full' }, 400);
  }

  const playerId = generateId();
  const world = createWorld(GRID_SIZE);

  const player: PlayerState = {
    id: playerId,
    name,
    world,
    client: null,
    attackCooldown: 0,
    defenseBuffer: 0,
  };

  players.set(playerId, player);

  return c.json({ playerId });
});

// GET /api?playerId=xxx — return that player's game state
app.get('/api', (c) => {
  const playerId = c.req.query('playerId');
  if (!playerId) {
    return c.json({ error: 'playerId query param required' }, 400);
  }

  const player = players.get(playerId);
  if (!player) {
    return c.json({ error: 'player not found' }, 404);
  }

  return c.json(toGameState(player));
});

// POST /game/action — apply action to a player's world
app.post('/game/action', async (c) => {
  const action = await c.req.json<GameAction>();
  const { playerId } = action;

  if (!playerId) {
    return c.json({ error: 'playerId is required' }, 400);
  }

  const player = players.get(playerId);
  if (!player) {
    return c.json({ error: 'player not found' }, 404);
  }

  const world = player.world;

  if (action.kind === 'attack') {
    const target = players.get(action.targetId);
    if (!target) return c.json({ error: 'target not found' }, 400);
    if (action.targetId === action.playerId)
      return c.json({ error: 'cannot attack yourself' }, 400);
    if (player.attackCooldown > 0)
      return c.json({ error: 'attack on cooldown' }, 400);
    if (target.defenseBuffer > 0)
      return c.json({ error: 'target is under protection' }, 400);
    if (!action.troops || action.troops.length === 0)
      return c.json({ error: 'no troops selected' }, 400);

    // Validate troops from attacker's buildings
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

    // Remove troops from attacker's buildings (office workers first, preserve lawyers)
    let attackerBuildingsLost = 0;
    for (const troop of action.troops) {
      const tile = player.world.grid[troop.row][troop.col];
      let toRemove = troop.count;
      // Pass 1: send office workers first
      tile.building!.employees = tile.building!.employees.filter((e) => {
        if (toRemove <= 0) return true;
        if (getEmployeeCategory(e.type) === 'office') {
          toRemove--;
          world.mapDefense -= EMPLOYEE_CONFIG[e.type].defenseBoost;
          return false;
        }
        return true;
      });
      // Pass 2: send lawyers if more troops needed
      tile.building!.employees = tile.building!.employees.filter((e) => {
        if (toRemove <= 0) return true;
        toRemove--;
        world.mapDefense -= EMPLOYEE_CONFIG[e.type].defenseBoost;
        return false;
      });
      if (tile.building!.employees.length === 0) {
        tile.building = null;
        attackerBuildingsLost++;
      }
    }

    // Count defenders (all employees across target's grid)
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

    // Apply defender losses: lawyers absorb first, then regular employees
    let defenderLosses = totalDefenders - defendersLeft;
    let defenderBuildingsLost = 0;
    let defenderLawyersLost = 0;
    let defenderRegularLost = 0;

    // Pass 1: lawyers absorb losses at their health rate
    for (const row of target.world.grid) {
      for (const tile of row) {
        if (!tile.building || defenderLosses <= 0) continue;
        tile.building.employees = tile.building.employees.filter((e) => {
          if (defenderLosses <= 0) return true;
          if (getEmployeeCategory(e.type) === 'lawfirm') {
            defenderLosses -= EMPLOYEE_CONFIG[e.type].health;
            defenderLawyersLost++;
            target.world.mapDefense -= EMPLOYEE_CONFIG[e.type].defenseBoost;
            return false;
          }
          return true;
        });
        if (tile.building.employees.length === 0) {
          tile.building = null;
          defenderBuildingsLost++;
        }
      }
    }

    // Pass 2: remaining losses hit regular employees
    for (const row of target.world.grid) {
      for (const tile of row) {
        if (!tile.building || defenderLosses <= 0) continue;
        tile.building.employees = tile.building.employees.filter((e) => {
          if (defenderLosses <= 0) return true;
          if (getEmployeeCategory(e.type) === 'office') {
            defenderLosses--;
            defenderRegularLost++;
            target.world.mapDefense -= EMPLOYEE_CONFIG[e.type].defenseBoost;
            return false;
          }
          return true;
        });
        if (tile.building.employees.length === 0) {
          tile.building = null;
          defenderBuildingsLost++;
        }
      }
    }

    const defenderEmployeesLost = defenderLawyersLost + defenderRegularLost;
    const attackerEmployeesLost = totalAttackers - attackersLeft;

    // Cash steal: 10% of target's funds per building destroyed, capped at 50%
    let cashStolen = 0;
    if (defenderBuildingsLost > 0) {
      const maxSteal = Math.floor(target.world.funds * 0.5);
      cashStolen = Math.min(
        Math.floor(target.world.funds * 0.1 * defenderBuildingsLost),
        maxSteal,
      );
      target.world.funds -= cashStolen;
      player.world.funds += cashStolen;
    }

    // Set damage reports on both players
    const report: Omit<DamageReport, 'isAttacker'> = {
      attackerName: player.name,
      defenderName: target.name,
      troopsSent: totalAttackers,
      attacker: {
        employeesLost: attackerEmployeesLost,
        buildingsLost: attackerBuildingsLost,
      },
      defender: {
        employeesLost: defenderEmployeesLost,
        buildingsLost: defenderBuildingsLost,
      },
      cashStolen,
    };

    player.world.attackActive = { ...report, isAttacker: true };
    target.world.attackActive = { ...report, isAttacker: false };

    player.attackCooldown = ATTACK_COOLDOWN_TICKS;
    target.defenseBuffer = DEFENSE_BUFFER_TICKS;

    return c.json({ ok: true });
  }

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
    // Require at least one office with employees before building a lawfirm
    if (action.buildingType === 'lawfirm') {
      let hasIncome = false;
      for (const row of world.grid) {
        for (const t of row) {
          if (
            t.building &&
            t.building.type !== 'lawfirm' &&
            t.building.employees.length > 0
          ) {
            hasIncome = true;
          }
        }
      }
      if (!hasIncome) {
        return c.json(
          { error: 'build an office and hire employees first' },
          400,
        );
      }
    }
    const config = BUILDING_CONFIG[action.buildingType];
    if (world.funds < config.cost) {
      return c.json({ error: 'insufficient funds' }, 400);
    }
    world.funds -= config.cost;
    tile.building = { type: action.buildingType, employees: [] };
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

  if (action.kind === 'sell') {
    if (!tile.building) {
      return c.json({ error: 'no building on tile' }, 400);
    }
    const refund = Math.floor(
      BUILDING_CONFIG[tile.building.type].cost * SELL_PERCENTAGE,
    );
    // Remove defense from all employees
    for (const emp of tile.building.employees) {
      world.mapDefense -= EMPLOYEE_CONFIG[emp.type].defenseBoost;
    }
    world.funds += refund;
    tile.building = null;
    return c.json({ ok: true });
  }

  if (action.kind === 'fire') {
    if (!tile.building) {
      return c.json({ error: 'no building on tile' }, 400);
    }
    if (tile.building.employees.length === 0) {
      return c.json({ error: 'no employees to fire' }, 400);
    }
    const lastEmployee = tile.building.employees[tile.building.employees.length - 1];
    if (lastEmployee.type === 'humanResources') {
      return c.json({ error: 'cannot fire human resources employee' }, 400);
    }
    const fired = tile.building.employees.pop()!;
    world.mapDefense -= EMPLOYEE_CONFIG[fired.type].defenseBoost;
    return c.json({ ok: true });
  }

  if (action.kind === 'upgrade') {
    if (!tile.building) {
      return c.json({ error: 'no building on tile' }, 400);
    }
    const nextType = UPGRADE_PATH[tile.building.type];
    if (!nextType) {
      return c.json({ error: 'building cannot be upgraded' }, 400);
    }
    const cost = Math.floor(
      (BUILDING_CONFIG[nextType].cost -
        BUILDING_CONFIG[tile.building.type].cost) *
        UPGRADE_COST_FACTOR,
    );
    if (world.funds < cost) {
      return c.json({ error: 'insufficient funds' }, 400);
    }
    world.funds -= cost;
    tile.building.type = nextType;
    return c.json({ ok: true });
  }

  return c.json({ error: 'unknown action' }, 400);
});

// GET /game/stream?playerId=xxx — scoped SSE for a single player
app.get('/game/stream', (c) => {
  const playerId = c.req.query('playerId');
  if (!playerId) {
    return c.text('playerId query param required', 400);
  }

  const player = players.get(playerId);
  if (!player) {
    return c.text('player not found', 404);
  }

  return streamSSE(c, async (stream) => {
    const client: SSEClient = { resolve: () => {} };
    player.client = client;

    stream.onAbort(() => {
      if (player.client === client) {
        player.client = null;
      }
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
