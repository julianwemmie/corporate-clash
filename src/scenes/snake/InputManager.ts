import type { Manager, SnakeWorld } from './types.js';
import { KEY_DIRECTION, OPPOSITE, resetWorld } from './types.js';

export class InputManager implements Manager {
  onKeyDown(world: SnakeWorld, key: string): void {
    if (key === 'Space') {
      if (world.state === 'start') {
        world.state = 'playing';
      } else if (world.state === 'gameOver') {
        resetWorld(world);
        world.state = 'start';
      }
      return;
    }

    if (world.state !== 'playing') return;

    const dir = KEY_DIRECTION[key];
    if (!dir) return;

    if (dir === OPPOSITE[world.player.direction]) return;

    world.player.nextDirection = dir;
  }

  update(world: SnakeWorld): void {
    if (world.state !== 'playing') return;
    world.player.direction = world.player.nextDirection;
  }
}
