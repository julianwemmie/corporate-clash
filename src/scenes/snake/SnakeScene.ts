import type { Scene, GameContext, Renderer } from '../../engine/types.js';
import type { Manager, SnakeWorld } from './types.js';
import { createWorld } from './types.js';
import { InputManager } from './InputManager.js';
import { GameplayManager } from './GameplayManager.js';
import { RenderManager } from './RenderManager.js';
import { UIManager } from './UIManager.js';

export class SnakeScene implements Scene {
  private world!: SnakeWorld;
  private managers: Manager[] = [];

  init(ctx: GameContext): void {
    this.world = createWorld(ctx.gridSize);
    this.managers = [
      new InputManager(),
      new GameplayManager(),
      new RenderManager(),
      new UIManager(),
    ];
  }

  update(dt: number): void {
    for (const m of this.managers) m.update?.(this.world, dt);
  }

  render(renderer: Renderer): void {
    renderer.clear();
    for (const m of this.managers) m.render?.(this.world, renderer);
  }

  onKeyDown(key: string): void {
    for (const m of this.managers) m.onKeyDown?.(this.world, key);
  }

  onKeyUp(key: string): void {
    for (const m of this.managers) m.onKeyUp?.(this.world, key);
  }

  destroy(): void {
    for (const m of this.managers) m.destroy?.();
  }
}
