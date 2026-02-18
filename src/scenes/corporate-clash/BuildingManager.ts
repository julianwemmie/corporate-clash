import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  type CorporateWorld,
  type GridPos,
  type Manager,
} from './types.js';

export class BuildingManager implements Manager {
  onLeftClick(world: CorporateWorld, gridPos: GridPos): void {
    if (world.uiMode.kind === 'buildingPanel') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind === 'none') {
      const tile = world.grid[gridPos.row][gridPos.col];
      if (!tile.building) {
        world.uiMode = { kind: 'buildingPanel', tile: gridPos };
      }
    }
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'buildingPanel') return;

    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    const index = parseInt(key.replace('Digit', '')) - 1;
    const type = BUILDING_TYPES[index];

    if (!type) return;

    const { row, col } = world.uiMode.tile;
    const tile = world.grid[row][col];
    if (tile.building) return;

    const config = BUILDING_CONFIG[type];

    if (world.funds >= config.cost) {
      world.funds -= config.cost;
      tile.building = { type, employees: [] };
    }
  }
}
