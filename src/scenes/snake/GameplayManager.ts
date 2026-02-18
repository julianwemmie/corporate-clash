import type { Manager, SnakeWorld } from './types.js';
import { DELTA, spawnFood } from './types.js';

export class GameplayManager implements Manager {
  update(world: SnakeWorld): void {
    if (world.state !== 'playing') return;

    const head = world.player.segments[0];
    const delta = DELTA[world.player.direction];
    const newHead = { x: head.x + delta.x, y: head.y + delta.y };

    // Wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= world.gridSize ||
      newHead.y < 0 ||
      newHead.y >= world.gridSize
    ) {
      world.state = 'gameOver';
      return;
    }

    // Self collision
    if (
      world.player.segments.some((p) => p.x === newHead.x && p.y === newHead.y)
    ) {
      world.state = 'gameOver';
      return;
    }

    world.player.segments.unshift(newHead);

    if (newHead.x === world.food.x && newHead.y === world.food.y) {
      world.score++;
      spawnFood(world);
    } else {
      world.player.segments.pop();
    }
  }
}
