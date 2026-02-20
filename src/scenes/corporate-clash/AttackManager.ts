import {
  ATTACK_INTERVAL_TICKS,
  type CorporateWorld,
  type Manager,
} from './types.js';

const ATTACK_POWER_MIN = 200;
const ATTACK_POWER_MAX = 800;
const EMPLOYEE_DEATH_CHANCE = 0.3;

export class AttackManager implements Manager {
  update(world: CorporateWorld): void {
    world.attackTimer -= 1;

    if (world.attackTimer > 0) return;

    world.attackTimer = ATTACK_INTERVAL_TICKS;

    const attackPower = Math.floor(
      Math.random() * (ATTACK_POWER_MAX - ATTACK_POWER_MIN + 1) +
        ATTACK_POWER_MIN,
    );

    const effectiveDamage = Math.max(0, attackPower - world.mapDefense);
    world.mapDefense = Math.max(0, world.mapDefense - attackPower);

    let employeesLost = 0;
    let buildingsLost = 0;

    if (effectiveDamage > 0) {
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
    }

    let message: string;
    if (effectiveDamage === 0) {
      message = `Attack power: ${attackPower}. Your defense absorbed all damage! Defense remaining: ${world.mapDefense}`;
    } else {
      message = `Attack power: ${attackPower}. Damage Report: Employees Lost ${employeesLost}, Buildings Lost ${buildingsLost}. Defense remaining: ${world.mapDefense}`;
    }

    world.alertInfo = {
      title: 'Attack!',
      message,
      dismissable: true,
    };
    world.uiMode = { kind: 'alert' };
  }
}
