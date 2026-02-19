import {
  ATTACK_INTERVAL_TICKS,
  type CorporateWorld,
  type Manager,
} from './types.js';

const EMPLOYEE_DEATH_CHANCE = 0.3;

export class AttackManager implements Manager {
  update(world: CorporateWorld): void {
    world.attackTimer -= 1;

    if (world.attackTimer > 0) return;

    world.attackTimer = ATTACK_INTERVAL_TICKS;

    let employeesLost = 0;
    let buildingsLost = 0;

    for (const row of world.grid) {
      for (const tile of row) {
        if (!tile.building) continue;

        const before = tile.building.employees.length;
        tile.building.employees = tile.building.employees.filter(
          () => Math.random() > EMPLOYEE_DEATH_CHANCE,
        );
        employeesLost += before - tile.building.employees.length;

        if (tile.building.employees.length === 0) {
          tile.building = null;
          buildingsLost++;
        }
      }
    }

    world.attackActive = { buildingsLost, employeesLost };
    world.uiMode = { kind: 'alert' };
  }
}
