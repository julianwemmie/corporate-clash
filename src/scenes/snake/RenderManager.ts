import { Graphics } from 'pixi.js';
import type { Renderer } from '../../engine/types.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../engine/types.js';
import type { Manager, SnakeWorld } from './types.js';

export class RenderManager implements Manager {
  render(world: SnakeWorld, renderer: Renderer): void {
    // Border
    const g = new Graphics();
    g.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    g.stroke({ color: 0x333355, width: 2 });
    renderer.stage.addChild(g);

    if (world.state === 'start') return;

    // Food
    renderer.drawRect(world.food.x, world.food.y, 1, 1, 0xff4444);

    // Snake body
    for (let i = 1; i < world.player.segments.length; i++) {
      renderer.drawRect(
        world.player.segments[i].x,
        world.player.segments[i].y,
        1,
        1,
        0x44cc44,
      );
    }

    // Snake head
    if (world.player.segments.length > 0) {
      renderer.drawRect(
        world.player.segments[0].x,
        world.player.segments[0].y,
        1,
        1,
        0x22aa22,
      );
    }
  }
}
