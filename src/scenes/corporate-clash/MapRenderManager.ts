import type { Renderer } from '../../engine/types.js';
import { CANVAS_WIDTH } from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';

export class MapRenderManager implements Manager {
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

    renderer.drawText('Corporate Clash', cx, 200, {
      fontSize: 64,
      color: 0x44cc44,
      anchor: 0.5,
    });
    renderer.drawText('Press SPACE to start', cx, 320, {
      fontSize: 24,
      color: 0xaaaaaa,
      anchor: 0.5,
    });
    renderer.drawText('Arrow keys or WASD to move', cx, 360, {
      fontSize: 18,
      color: 0x666666,
      anchor: 0.5,
    });
  }
}
