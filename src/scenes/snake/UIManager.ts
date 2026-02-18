import type { Renderer } from '../../engine/types.js';
import { CANVAS_WIDTH } from '../../engine/types.js';
import type { Manager, SnakeWorld } from './types.js';

export class UIManager implements Manager {
  render(world: SnakeWorld, renderer: Renderer): void {
    const cx = CANVAS_WIDTH / 2;

    if (world.state === 'start') {
      renderer.drawText('Snake', cx, 200, {
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
      return;
    }

    if (world.state === 'playing') {
      renderer.drawText(`Score: ${world.score}`, 10, 10, {
        fontSize: 18,
        color: 0xcccccc,
      });
      return;
    }

    if (world.state === 'gameOver') {
      // Dark overlay
      renderer.drawRect(0, 0, world.gridSize, world.gridSize, 0x000000);

      renderer.drawText('Game Over', cx, 200, {
        fontSize: 48,
        color: 0xff4444,
        anchor: 0.5,
      });
      renderer.drawText(`Score: ${world.score}`, cx, 270, {
        fontSize: 28,
        color: 0xffffff,
        anchor: 0.5,
      });
      renderer.drawText('Press SPACE to restart', cx, 340, {
        fontSize: 24,
        color: 0xaaaaaa,
        anchor: 0.5,
      });
    }
  }
}
