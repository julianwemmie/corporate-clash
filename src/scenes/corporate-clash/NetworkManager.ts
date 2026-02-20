import type { CorporateWorld, GameState, Manager } from './types.js';

export class NetworkManager implements Manager {
  private source: EventSource | null = null;
  private pending: GameState | null = null;
  readonly playerId: string;

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  connect(): void {
    this.source = new EventSource(`/game/stream?playerId=${this.playerId}`);

    this.source.addEventListener('tick', (event) => {
      this.pending = JSON.parse(event.data) as GameState;
    });

    this.source.addEventListener('error', () => {
      console.log('SSE connection lost, reconnecting...');
    });
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
    world.defenseBuffer = this.pending.defenseBuffer;
    world.players = this.pending.players;

    this.pending = null;
  }

  destroy(): void {
    this.source?.close();
    this.source = null;
  }
}
