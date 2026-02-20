# Corporate Clash — Multiplayer Architecture

## Overview

Convert the game from single-player to multiplayer. Players build their own corporations and attack each other asynchronously. No real-time combat — attacks resolve server-side and the defender sees results on their next session or via polling.

---

## Key Design Decisions

### Ticks: Compute on Read, Not on Write

Don't have the server tick every 150ms for every player. Instead, store the last-computed state + timestamp and calculate current funds on demand:

```
stored: { funds: 500000, fundsUpdatedAt: 1708300000000 }
profitPerTick: 10800  (sum of all employees)

on read:
  ticksElapsed = floor((now - fundsUpdatedAt) / 150)
  currentFunds = funds + (ticksElapsed * profitPerTick)
```

The server only writes to the DB when something actually changes — a building is placed, an employee is hired, or an attack lands. Scales to thousands of players with zero tick overhead.

### HTTP for All Game Actions

Since nothing is real-time, plain REST handles everything:

| Endpoint                          | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `POST /api/auth/register`         | Create account                                   |
| `POST /api/auth/login`            | Session/JWT                                      |
| `GET /api/game/state`             | Fetch your world (server computes current funds) |
| `POST /api/game/build`            | Place a building                                 |
| `POST /api/game/hire`             | Hire an employee                                 |
| `POST /api/game/attack/:targetId` | Launch attack on another player                  |
| `GET /api/leaderboard`            | Rankings                                         |

Every mutation endpoint validates server-side (can they afford it? is the tile empty? is the building at capacity?).

### Async PvP Attacks

When Player A attacks Player B:

1. A calls `POST /api/game/attack/:B` — server validates A has attack capacity
2. Server runs the damage calculation (30% survival roll) against B's current state (computed on-the-fly)
3. Server writes B's new state (minus dead employees/buildings) to the DB
4. Server records the attack in an `attack_log` table
5. Next time B loads or polls, they see the damage

### Attack Polling (Not WebSockets)

Client polls `GET /api/game/attacks?since=<timestamp>` every ~15 seconds. If a new attack came in, show the damage alert overlay. Response is almost always an empty array — negligible load.

WebSockets can replace polling later for instant push notifications, but async attacks don't need sub-second latency.

---

## Data Model

```
players:     id, username, password_hash, funds, funds_updated_at
buildings:   id, player_id, row, col, type
employees:   id, building_id, type
attack_log:  id, attacker_id, defender_id, buildings_lost, employees_lost, created_at
```

`funds` + `funds_updated_at` is the key — the server derives real funds from the employee table on every read, then snapshots when a mutation happens.

---

## Suggested Tech Stack

- **Backend:** Node/Express or Hono (stay in TypeScript)
- **Database:** PostgreSQL
- **Auth:** JWT or session cookies

---

## Client-Side Changes

The current engine/scene architecture stays mostly the same. Main changes:

1. **`CorporateWorld` becomes a projection of server state** — on load, fetch from `/api/game/state`
2. **Actions become API calls** — building/hiring send a POST, wait for confirmation, update local state
3. **Remove `EconomyManager` ticks** — client can animate the funds counter going up (interpolate from known profit rate), but the server is the source of truth
4. **Remove `AttackManager` timer** — attacks are player-initiated PvP, not a local countdown
5. **Add "browse targets" UI** — list other players, view their base, choose to attack
6. **Add attack polling** — check for incoming attacks every ~15s, show alert overlay on hit
