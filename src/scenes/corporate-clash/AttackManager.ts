import { ATTACK_INTERVAL_TICKS, CorporateWorld, Manager } from './types.js';

export class AttackManager implements Manager {
  update(world: CorporateWorld): void {
    world.attackTimer -= 1;

    if (world.attackTimer <= 0) {
      // world.attackActive = true;
      world.attackTimer = ATTACK_INTERVAL_TICKS;
    }
  }
}
