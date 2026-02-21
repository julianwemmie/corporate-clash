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

const MAX_PLAYERS = 20;
const ATTACK_COOLDOWN_TICKS = 100;
const DEFENSE_BUFFER_TICKS = 400; // 60s immunity after being attacked
const NPC_DAMAGE_PERCENT = 0.3;

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
    label: 'Corporate Raid',
    weight: 3,
    effect: (world) => {
      let totalHeadcount = 0;
      for (const row of world.grid) {
        for (const tile of row) {
          if (tile.building) totalHeadcount += tile.building.employees.length;
        }
      }
      if (totalHeadcount === 0) {
        return {
          title: 'Raid Averted',
          message: 'Corporate Raiders found nothing to attack.',
        };
      }

      let killRolls = 0;
      for (let i = 0; i < totalHeadcount; i++) {
        if (Math.random() < NPC_DAMAGE_PERCENT) killRolls++;
      }
      if (killRolls === 0) {
        return {
          title: 'Raid Repelled',
          message: 'Corporate Raiders attacked but caused no damage!',
        };
      }

      let lawyersLost = 0;
      let employeesLost = 0;
      let buildingsLost = 0;

      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building || killRolls <= 0) continue;
          tile.building.employees = tile.building.employees.filter((e) => {
            if (killRolls <= 0) return true;
            if (getEmployeeCategory(e.type) === 'lawfirm') {
              killRolls -= EMPLOYEE_CONFIG[e.type].health;
              lawyersLost++;
              world.mapDefense -= EMPLOYEE_CONFIG[e.type].defenseBoost;
              return false;
            }
            return true;
          });
          if (tile.building.employees.length === 0) {
            tile.building = null;
            buildingsLost++;
          }
        }
      }

      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building || killRolls <= 0) continue;
          tile.building.employees = tile.building.employees.filter((e) => {
            if (killRolls <= 0) return true;
            if (getEmployeeCategory(e.type) === 'office') {
              killRolls--;
              employeesLost++;
              world.mapDefense -= EMPLOYEE_CONFIG[e.type].defenseBoost;
              return false;
            }
            return true;
          });
          if (tile.building.employees.length === 0) {
            tile.building = null;
            buildingsLost++;
          }
        }
      }

      const totalLost = employeesLost + lawyersLost;
      return {
        title: 'Under Attack!',
        message: `Corporate Raiders attacked! You lost ${totalLost} employees and ${buildingsLost} buildings.`,
      };
    },
  },

  {
    label: 'Meta hires your Chief of AI',
    weight: 2,
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
            'A competitor tried to poach your staff, but you have no employees!',
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
        title: 'Talent Poached',
        message: `A competitor hired away your ${config.label} ($${config.cost.toLocaleString()} to replace)!`,
      };
    },
  },
  {
    label: 'Tax Audit',
    weight: 1,
    effect: (world) => {
      let buildingCount = 0;
      for (const row of world.grid) {
        for (const tile of row) {
          if (tile.building) buildingCount++;
        }
      }
      const finePerBuilding = 10_000;
      const fine = Math.max(5_000, buildingCount * finePerBuilding);
      world.funds -= fine;
      return {
        title: 'IRS Audit',
        message:
          buildingCount > 0
            ? `Auditors found discrepancies across ${buildingCount} properties. You paid $${fine.toLocaleString()} in back taxes.`
            : `Routine audit. Minimum filing penalty: $${fine.toLocaleString()}.`,
      };
    },
  },
  {
    label: 'Office Affair',
    weight: 1,
    effect: (world) => {
      // Find a building with 2+ employees — the couple leaves
      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building || tile.building.employees.length < 2) continue;
          const emp1 = tile.building.employees[0];
          const emp2 = tile.building.employees[1];
          const config1 = EMPLOYEE_CONFIG[emp1.type];
          const config2 = EMPLOYEE_CONFIG[emp2.type];
          world.mapDefense -= config1.defenseBoost + config2.defenseBoost;
          tile.building.employees.splice(0, 2);
          if (tile.building.employees.length === 0) {
            tile.building = null;
          }
          return {
            title: 'Office Scandal!',
            message: `Your ${config1.label} and ${config2.label} were caught in an affair. Both resigned in disgrace.`,
          };
        }
      }
      // No building with 2+ employees
      const fine = Math.floor(world.funds * 0.05);
      world.funds -= fine;
      return {
        title: 'Tabloid Gossip',
        message: `Rumors about your company hit the tabloids. PR damage cost $${fine.toLocaleString()}.`,
      };
    },
  },
  {
    label: 'Trump Tariffs',
    weight: 2,
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
          title: 'New Tariffs!',
          message: `Trump slapped new tariffs on office supplies. Import fees cost you $${flat.toLocaleString()}.`,
        };
      }
      const tariff = buildingCount * 15_000;
      world.funds -= tariff;
      return {
        title: 'New Tariffs!',
        message: `Trump slapped ${buildingCount === 1 ? 'a' : ''} new tariffs on office supplies. Your ${buildingCount} ${buildingCount === 1 ? 'building costs' : 'buildings cost'} you $${tariff.toLocaleString()} in import fees.`,
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
            'Your CEO rebranded the company to X. Nobody noticed because you have no employees.',
        };
      }
      return {
        title: 'Rebranded To X',
        message: `Your CEO rebranded the company to X. ${lost} employee${lost === 1 ? '' : 's'} quit in embarrassment.`,
      };
    },
  },
  {
    label: 'Opus 6 Released',
    weight: 1,
    effect: (world) => {
      // Opus 6 automates work — every engineer doubles output for one cycle (instant cash bonus)
      let engineerCount = 0;
      for (const row of world.grid) {
        for (const tile of row) {
          if (!tile.building) continue;
          for (const emp of tile.building.employees) {
            if (emp.type === 'engineer') engineerCount++;
          }
        }
      }
      if (engineerCount === 0) {
        // No engineers — AI replaces your most junior employee instead
        for (const row of world.grid) {
          for (const tile of row) {
            if (!tile.building || tile.building.employees.length === 0)
              continue;
            const idx = tile.building.employees.findIndex(
              (e) => e.type === 'officeWorker',
            );
            if (idx !== -1) {
              tile.building.employees.splice(idx, 1);
              if (tile.building.employees.length === 0) tile.building = null;
              return {
                title: 'Opus 6 Released!',
                message:
                  'Anthropic released Opus 6. You had no engineers to use it, so it replaced an office worker.',
              };
            }
          }
        }
        return {
          title: 'Opus 6 Released!',
          message:
            'Anthropic released Opus 6. Your company has no idea what to do with it.',
        };
      }
      const bonus = engineerCount * 20_000;
      world.funds += bonus;
      return {
        title: 'Opus 6 Released!',
        message: `Anthropic released Opus 6! Your ${engineerCount} engineer${engineerCount === 1 ? '' : 's'} automated a sprint — earned $${bonus.toLocaleString()} in productivity gains.`,
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
        return { title: 'Intern Incident', message: 'The intern tried to delete the production database, but there was nothing to delete.' };
      }
      return { title: 'INTERN DELETED PROD DB', message: `An unpaid intern ran DROP TABLE in production. You lost ${buildingsLost} building${buildingsLost === 1 ? '' : 's'}, ${employeesLost} employee${employeesLost === 1 ? '' : 's'}, and $${fundsLost.toLocaleString()} in recovered funds. 90% of your cash is gone.` };
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

    // Random events
    player.world.eventTimer--;
    if (player.world.eventTimer <= 0) {
      player.world.eventTimer = EVENT_INTERVAL_TICKS;

      const event = pickWeightedEvent();
      player.world.eventResult = event.effect(player.world);
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
