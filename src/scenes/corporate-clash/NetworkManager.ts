import type {
  CorporateWorld,
  DamageReport,
  GameState,
  Manager,
} from './types.js';

export class NetworkManager implements Manager {
  private source: EventSource | null = null;
  private pending: GameState | null = null;
  private pendingAttack: DamageReport | null = null;
  readonly playerId: string;

  constructor(playerId: string) {
    this.playerId = playerId;
  }

  connect(): void {
    this.source = new EventSource(`/game/stream?playerId=${this.playerId}`);

    this.source.addEventListener('tick', (event) => {
      const state = JSON.parse(event.data) as GameState;
      // buffer attackActive separately so a later null tick can't overwrite it
      if (state.attackActive) {
        this.pendingAttack = state.attackActive;
      }
      this.pending = state;
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
    world.eventTimer = this.pending.eventTimer;
    world.attackCooldown = this.pending.attackCooldown;
    world.defenseBuffer = this.pending.defenseBuffer;
    world.players = this.pending.players;
    world.eventResult = this.pending.eventResult;

    if (this.pendingAttack) {
      world.attackActive = this.pendingAttack;
      this.pendingAttack = null;
    } else {
      world.attackActive = this.pending.attackActive;
    }

    this.pending = null;
  }

  destroy(): void {
    this.source?.close();
    this.source = null;
  }
}
