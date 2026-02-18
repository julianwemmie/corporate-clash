import type { Renderer } from '../../engine/types.js';
import { CELL_SIZE } from '../../engine/types.js';
import { type CorporateWorld, type GridPos, type Manager } from './types.js';

export class MapManager implements Manager {
  onRightClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos: GridPos = {
      row: Math.floor(pixelY / CELL_SIZE),
      col: Math.floor(pixelX / CELL_SIZE),
    };
    console.log('Right click at', { pixelX, pixelY }, gridPos);
  }

  onLeftClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos: GridPos = {
      row: Math.floor(pixelY / CELL_SIZE),
      col: Math.floor(pixelX / CELL_SIZE),
    };
    console.log('Left click at', { pixelX, pixelY }, gridPos);
  }

  onMouseMove(world: CorporateWorld, pixelX: number, pixelY: number): void {
    // Convert pixel coordinates to grid position
    const gridPos: GridPos = {
      row: Math.floor(pixelY / CELL_SIZE),
      col: Math.floor(pixelX / CELL_SIZE),
    };
    world.hoveredTile = gridPos;
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    // draw alternating light/dark grid background
    for (let row = 0; row < world.grid.length; row++) {
      for (let col = 0; col < world.grid[row].length; col++) {
        const color = (row + col) % 2 === 0 ? 0x333333 : 0x222222;
        renderer.drawRect(
          col * CELL_SIZE,
          row * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE,
          color,
        );
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
