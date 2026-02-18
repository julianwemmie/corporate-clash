import type { Renderer } from '../../engine/types.js';
import { CELL_SIZE } from '../../engine/types.js';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  EMPLOYEE_CONFIG,
  EMPLOYEE_TYPES,
  type CorporateWorld,
  type GridPos,
  type Manager,
} from './types.js';
import { Assets, Texture } from 'pixi.js';

export class MapManager implements Manager {
  private buildingTextures = new Map<string, Texture>();

  private pixelToGrid(pixelX: number, pixelY: number): GridPos {
    return {
      row: Math.floor(pixelY / CELL_SIZE),
      col: Math.floor(pixelX / CELL_SIZE),
    };
  }

  private isInBounds(world: CorporateWorld, gridPos: GridPos): boolean {
    return (
      gridPos.row >= 0 &&
      gridPos.row < world.grid.length &&
      gridPos.col >= 0 &&
      gridPos.col < world.grid[0].length
    );
  }

  onRightClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    console.log('Right click at', { pixelX, pixelY }, gridPos);
  }

  onLeftClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    if (!this.isInBounds(world, gridPos)) return;

    if (
      world.uiMode.kind === 'buildingPanel' ||
      world.uiMode.kind === 'employeePanel'
    ) {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind === 'none') {
      const tile = world.grid[gridPos.row][gridPos.col];
      if (!tile.building) {
        world.uiMode = { kind: 'buildingPanel', tile: gridPos };
      } else {
        world.uiMode = { kind: 'employeePanel', tile: gridPos };
      }
    }
  }

  onMouseMove(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    world.hoveredTile = gridPos;
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind === 'buildingPanel') {
      this.handleBuildingKey(world, key);
    } else if (world.uiMode.kind === 'employeePanel') {
      this.handleEmployeeKey(world, key);
    }
  }

  private handleBuildingKey(world: CorporateWorld, key: string): void {
    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind !== 'buildingPanel') return;

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

  private handleEmployeeKey(world: CorporateWorld, key: string): void {
    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind !== 'employeePanel') return;

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

  render(world: CorporateWorld, renderer: Renderer): void {
    // Load textures if not loaded
    if (this.buildingTextures.size === 0) {
      Assets.load([
        '/assets/icons/building-smallOffice.png',
        '/assets/icons/building-mediumOffice.png',
        '/assets/icons/building-skyscraper.png',
      ]).then((textures) => {
        this.buildingTextures.set(
          'smallOffice',
          textures['/assets/icons/building-smallOffice.png'],
        );
        this.buildingTextures.set(
          'mediumOffice',
          textures['/assets/icons/building-mediumOffice.png'],
        );
        this.buildingTextures.set(
          'skyscraper',
          textures['/assets/icons/building-skyscraper.png'],
        );
      });
    }

    // draw alternating light/dark grid background
    for (let row = 0; row < world.grid.length; row++) {
      for (let col = 0; col < world.grid[row].length; col++) {
        const tile = world.grid[row][col];

        renderer.drawRect(
          col * CELL_SIZE,
          row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE,
          (row + col) % 2 === 0 ? 0x333333 : 0x222222,
        );

        // Draw building image on top => Use offset from left-panel
        if (tile.building) {
          const texture = this.buildingTextures.get(tile.building.type);
          if (texture) {
            renderer.drawSprite(texture, col * CELL_SIZE, row * CELL_SIZE, {
              width: CELL_SIZE,
              height: CELL_SIZE,
            });
          }
        }
      }
    }

    if (world.hoveredTile) {
      const { row, col } = world.hoveredTile;
      renderer.drawRect(
        col * CELL_SIZE,
        row * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
        0xffffff,
      );
    }
  }
}
