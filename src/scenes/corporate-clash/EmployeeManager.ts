import {
  BUILDING_CONFIG,
  EMPLOYEE_CONFIG,
  EMPLOYEE_TYPES,
  type CorporateWorld,
  type GridPos,
  type Manager,
} from './types.js';

export class EmployeeManager implements Manager {
  onLeftClick(world: CorporateWorld, gridPos: GridPos): void {
    if (world.uiMode.kind === 'employeePanel') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind === 'none') {
      const tile = world.grid[gridPos.row][gridPos.col];
      if (tile.building) {
        world.uiMode = { kind: 'employeePanel', tile: gridPos };
      }
    }
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'employeePanel') return;

    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    const index = parseInt(key.replace('Digit', '')) - 1;
    const type = EMPLOYEE_TYPES[index];

    if (!type) return;

    const { row, col } = world.uiMode.tile;
    const tile = world.grid[row][col];
    const building = tile.building;

    if (!building) return;

    const config = EMPLOYEE_CONFIG[type];
    const capacity = BUILDING_CONFIG[building.type].capacity;

    if (world.funds >= config.cost && building.employees.length < capacity) {
      world.funds -= config.cost;
      building.employees.push({ type });
    }
  }
}
