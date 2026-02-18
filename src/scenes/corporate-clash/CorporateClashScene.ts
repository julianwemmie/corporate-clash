import { type Scene, type GameContext, type Renderer, CANVAS_WIDTH, LEFT_PANEL_WIDTH } from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';
import { createWorld } from './types.js';
import { RightPanelManager } from './RightPanelManager.js';
import { LeftPanelManager } from './LeftPanelManager.js';
import { MapManager } from './MapManager.js';

function calcualteRelativePixelXY(pixelX: number, pixelY: number, manager: Manager): { pixelX: number; pixelY: number } {
  if (manager instanceof LeftPanelManager) {
    return { pixelX, pixelY };
  } else if (manager instanceof MapManager) {
    return { pixelX: pixelX - LEFT_PANEL_WIDTH, pixelY };
  } else if (manager instanceof RightPanelManager) {
    return { pixelX: pixelX - (CANVAS_WIDTH - LEFT_PANEL_WIDTH), pixelY };
  }
  return { pixelX, pixelY };
}

export class CorporateClashScene implements Scene {
  private world!: CorporateWorld;
  private managers: Manager[] = [];

  init(ctx: GameContext): void {
    this.world = createWorld(ctx.gridSize);
    this.managers = [
      new MapManager(),
      new LeftPanelManager(),
      new RightPanelManager(),
    ];
  }

  update(dt: number): void {
    for (const m of this.managers) m.update?.(this.world, dt);
  }

  render(renderer: Renderer): void {
    renderer.clear();
    for (const m of this.managers) {
      m.render?.(this.world, renderer)
    };
  }

  onRightClick(pixelX: number, pixelY: number): void {
    for (const m of this.managers) {
      const { pixelX: relativeX, pixelY: relativeY } = calcualteRelativePixelXY(pixelX, pixelY, m);
      m.onRightClick?.(this.world, relativeX, relativeY);
    }
  }

  onLeftClick(pixelX: number, pixelY: number): void {
    for (const m of this.managers) {
      const { pixelX: relativeX, pixelY: relativeY } = calcualteRelativePixelXY(pixelX, pixelY, m);
      m.onLeftClick?.(this.world, relativeX, relativeY);
    }
  }

  onMouseMove(pixelX: number, pixelY: number): void {
    for (const m of this.managers) {
      const { pixelX: relativeX, pixelY: relativeY } = calcualteRelativePixelXY(pixelX, pixelY, m);
      m.onMouseMove?.(this.world, relativeX, relativeY);
    }
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
