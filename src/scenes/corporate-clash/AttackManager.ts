import {
  ATTACK_INTERVAL_TICKS,
  BUILDING_CONFIG,
  EMPLOYEE_CONFIG,
  ATTACK_POWER_MIN,
  ATTACK_POWER_MAX,
  type CorporateWorld,
  type Manager,
  type Tile,
} from './types.js';

function findTiles(
  world: CorporateWorld,
  filter: (tile: Tile) => boolean,
): Tile[] {
  const results: Tile[] = [];
  for (const row of world.grid) {
    for (const tile of row) {
      if (filter(tile)) results.push(tile);
    }
  }
  return results;
}

export class AttackManager implements Manager {
  update(world: CorporateWorld): void {
    if (world.phase === 'gameOver') return;

    world.attackTimer -= 1;

    if (world.attackTimer > 0) return;

    world.attackTimer = ATTACK_INTERVAL_TICKS;

    const attackPower = Math.floor(
      Math.random() * (ATTACK_POWER_MAX - ATTACK_POWER_MIN + 1) +
        ATTACK_POWER_MIN,
    );

    const lawfirmTile =
      findTiles(world, (tile) => tile.building?.type === 'lawfirm')[0] ?? null;

    if (lawfirmTile) {
      const message = this.attackLawfirm(world, lawfirmTile, attackPower);
      world.alertInfo = { title: 'Attack!', message, dismissable: true };
      world.uiMode = { kind: 'alert' };
      return;
    }

    const message = this.attackRandomBuilding(world, attackPower);
    world.alertInfo = { title: 'Attack!', message, dismissable: true };
    world.uiMode = { kind: 'alert' };
  }

  private attackRandomBuilding(
    world: CorporateWorld,
    attackPower: number,
  ): string {
    const effectiveDamage = Math.max(0, attackPower - world.mapDefense);
    world.mapDefense = Math.max(0, world.mapDefense - attackPower);

    if (effectiveDamage === 0) {
      return `Attack power: ${attackPower}. Your defense absorbed all damage! Defense remaining: ${world.mapDefense}`;
    }

    const tilesWithBuildings = findTiles(world, (tile) => !!tile.building);

    if (tilesWithBuildings.length === 0) {
      return `Attack power: ${attackPower}. No buildings to damage. Defense remaining: ${world.mapDefense}`;
    }

    const tile =
      tilesWithBuildings[Math.floor(Math.random() * tilesWithBuildings.length)];
    const targetLabel = BUILDING_CONFIG[tile.building!.type].label;
    tile.building!.health -= effectiveDamage;

    let employeesLost = 0;
    let buildingsLost = 0;
    if (tile.building!.health <= 0) {
      employeesLost = tile.building!.employees.length;
      tile.building = null;
      buildingsLost++;
    }
    world.attackActive = { buildingsLost, employeesLost };

    return `Attack power: ${attackPower}. ${targetLabel} was attacked! Damage Report: Employees Lost ${employeesLost}, Buildings Lost ${buildingsLost}. Defense remaining: ${world.mapDefense}`;
  }

  private attackLawfirm(
    world: CorporateWorld,
    lawfirmTile: Tile,
    attackPower: number,
  ): string {
    lawfirmTile.building!.health -= attackPower;

    if (lawfirmTile.building!.health <= 0) {
      const totalDefense = lawfirmTile.building!.employees.reduce(
        (sum, emp) => sum + EMPLOYEE_CONFIG[emp.type].defenseBoost,
        0,
      );
      world.mapDefense = Math.max(0, world.mapDefense - totalDefense);
      const employeesLost = lawfirmTile.building!.employees.length;
      lawfirmTile.building = null;
      world.attackActive = { buildingsLost: 1, employeesLost };

      return `Attack power: ${attackPower}. Lawfirm was destroyed! Defense reduced by ${totalDefense}. Employees Lost ${employeesLost}. Defense remaining: ${world.mapDefense}`;
    }

    world.attackActive = { buildingsLost: 0, employeesLost: 0 };
    return `Attack power: ${attackPower}. Lawfirm absorbed the attack! Lawfirm health: ${lawfirmTile.building!.health}/${BUILDING_CONFIG['lawfirm'].maxHealth}. Defense remaining: ${world.mapDefense}`;
  }
}
