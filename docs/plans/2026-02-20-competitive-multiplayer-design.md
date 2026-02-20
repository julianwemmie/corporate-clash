# Competitive Multiplayer Design

## Goal

Add competitive multiplayer to Corporate Clash: up to 20 players in a single persistent world, each with their own grid, attacking each other RISK-style by sending employees as troops.

## Architecture: Per-Player World Instances

The server holds a `Map<string, PlayerState>` where each player gets an isolated `CorporateWorld`. The game loop iterates all players each tick, running economy per world. Attacks are cross-world mutations resolved on the server.

## Player Identity & Join Flow

- No auth. Player picks a name on connect.
- `POST /game/join` with `{ name }` returns `{ playerId }`.
- Server creates a fresh `CorporateWorld` for the player, assigns a UUID.
- Client connects SSE via `/game/stream?playerId=xxx`.
- Duplicate names are rejected.

## Server State

```
PlayerState {
  id: string
  name: string
  world: CorporateWorld
  client: SSEClient | null    // null if disconnected
  attackCooldown: number      // ticks until can attack again
}
```

Server stores: `Map<string, PlayerState>`

### Game Loop (150ms tick)

For each player:

1. Run `economyManager.update(player.world)`
2. Decrement `attackCooldown` if > 0

Random timer-based attacks are removed. Attacks are player-initiated only.

### Broadcast

Each player receives their own world state + a scoreboard:

```
{
  ...myGameState,
  attackCooldown: number,
  players: [{ id, name, funds, buildingCount, employeeCount }]
}
```

Scoreboard gives enough info to pick targets without leaking full grids.

## Combat System (RISK-style)

### Initiating an Attack

Client sends:

```
{
  kind: 'attack',
  playerId: 'attacker-id',
  targetId: 'defender-id',
  troops: [
    { row: 0, col: 2, count: 3 },
    { row: 1, col: 1, count: 1 }
  ]
}
```

Attacker picks buildings and how many employees from each. Those employees are removed immediately — committed win or lose.

### Server Validation

- Target exists and isn't self
- Each source tile has a building with enough employees
- Minimum 1 troop total
- Attacker's cooldown is 0

### Combat Resolution

1. Count total attackers and total defenders (all employees across defender's buildings)
2. Pair off 1v1 rounds. Both sides roll random 0-1
3. Attacker wins round if roll > defender's roll (defender wins ties — defender's advantage)
4. Losing side loses that troop
5. Repeat until one side runs out

### Damage Application

- Defender's lost employees removed randomly from their buildings (buildings with 0 employees are destroyed)
- Attacker's lost employees already gone (removed when attack was sent)

### Damage Reports

Both players get an `attackActive` with expanded `DamageReport`:

- Attacker sees: "You attacked [name]. Lost X employees. They lost Y employees, Z buildings."
- Defender sees: "[name] attacked you. Lost Y employees, Z buildings."

### Cooldown

100 ticks (~15s) after attacking before you can attack again. Tunable.

## Network Protocol

### Endpoints

| Endpoint                    | Method | Purpose                        |
| --------------------------- | ------ | ------------------------------ |
| `/game/join`                | POST   | `{ name }` -> `{ playerId }`   |
| `/game/stream?playerId=xxx` | GET    | SSE scoped to player           |
| `/game/action`              | POST   | All actions require `playerId` |

### GameAction (expanded)

```
| { kind: 'build', playerId, row, col, buildingType }
| { kind: 'hire', playerId, row, col, employeeType }
| { kind: 'attack', playerId, targetId, troops: { row, col, count }[] }
```

## Type Changes

### New Types

```
PlayerInfo { id, name, funds, buildingCount, employeeCount }
AttackTroop { row, col, count }
```

### Expanded Types

```
DamageReport {
  buildingsLost: number
  employeesLost: number
  attackerName: string | null
  defenderName: string | null
  isAttacker: boolean
}

GameState (add):
  attackCooldown: number
  players: PlayerInfo[]

UIMode (add):
  | { kind: 'attackPanel' }
```

## Client Changes

1. **Join screen** — Text input for name + Join button. POSTs to `/game/join`, stores `playerId`, then boots into game.
2. **NetworkManager** — Connects with `?playerId=xxx`. Stores `players` scoreboard on world.
3. **MapManager** — Prepends `playerId` to every action.
4. **New: AttackPanelManager** — UI to pick target from player list, select troops from buildings, send attack.
5. **AlertManager** — Shows expanded damage report (who attacked/defended).
