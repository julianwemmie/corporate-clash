import type { Renderer } from '../../engine/types.js';
import { CANVAS_WIDTH, GRID_SIZE, } from '../../engine/types.js';
import { EMPLOYEE_CONFIG, type CorporateWorld, type GridPos, type Manager } from './types.js';

export class MapManager implements Manager {

  onRightClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    console.log('Right click at', { x: pixelX, y: pixelY });
  }

  onLeftClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    console.log('Left click at', { x: pixelX, y: pixelY });
  }

  onMouseMove(world: CorporateWorld, pixelX: number, pixelY: number): void {
    // Convert pixel coordinates to grid position
    const gridPos: GridPos = {
      row: Math.floor(pixelY / GRID_SIZE),
      col: Math.floor(pixelX / GRID_SIZE),
    };
    world.hoveredTile = gridPos;
  }

  update(world: CorporateWorld, _dt: number): void {
    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          for (const employee of tile.building.employees) {
            const profit = EMPLOYEE_CONFIG[employee.type].profitPerTick;
            world.funds += profit;
          }
        }
      }
    }
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    const cx = CANVAS_WIDTH / 2;

    // draw alternating light/dark grid background
    for (let row = 0; row < world.grid.length; row++) {
      for (let col = 0; col < world.grid[row].length; col++) {
        const color = (row + col) % 2 === 0 ? 0x333333 : 0x222222;
        renderer.drawRect(col, row, 1, 1, color);
      }
    }

    if (world.hoveredTile) {
      const { row, col } = world.hoveredTile;
      renderer.drawRect(col, row, 1, 1, 0xffffff); // light overlay
    }
  }
}
