import {
  type Scene,
  type GameContext,
  type Renderer,
  CELL_SIZE,
  GRID_SIZE,
  LEFT_PANEL_WIDTH,
} from '../../engine/types.js';
import { createOffsetRenderer } from '../../engine/Renderer.js';
import type { CorporateWorld, Manager } from './types.js';
import { createWorld } from './types.js';
import { RightPanelManager } from './RightPanelManager.js';
import { LeftPanelManager } from './LeftPanelManager.js';
import { MapManager } from './MapManager.js';
import { EconomyManager } from './EconomyManager.js';
import { AttackManager } from './AttackManager.js';

function getManagerOrigin(manager: Manager): { x: number; y: number } {
  if (manager instanceof LeftPanelManager) {
    return { x: 0, y: 0 };
  } else if (manager instanceof MapManager) {
    return { x: LEFT_PANEL_WIDTH, y: 0 };
  } else if (manager instanceof RightPanelManager) {
    return { x: LEFT_PANEL_WIDTH + GRID_SIZE * CELL_SIZE, y: 0 };
  }
  return { x: 0, y: 0 };
}

function calculateRelativePixelXY(
  pixelX: number,
  pixelY: number,
  manager: Manager,
): { pixelX: number; pixelY: number } {
  const origin = getManagerOrigin(manager);
  return { pixelX: pixelX - origin.x, pixelY: pixelY - origin.y };
}

export class CorporateClashScene implements Scene {
  private world!: CorporateWorld;
  private managers: Manager[] = [];

  init(ctx: GameContext): void {
    this.world = createWorld(ctx.gridSize);
    this.managers = [
      new MapManager(),
      new AttackManager(),
      new LeftPanelManager(),
      new RightPanelManager(),
      new EconomyManager(),
    ];
  }

  update(dt: number): void {
    for (const m of this.managers) m.update?.(this.world, dt);
  }

  render(renderer: Renderer): void {
    renderer.clear();
    for (const m of this.managers) {
      const origin = getManagerOrigin(m);
      const offsetRenderer = createOffsetRenderer(renderer, origin.x, origin.y);
      m.render?.(this.world, offsetRenderer);
    }
  }

  onRightClick(pixelX: number, pixelY: number): void {
    for (const m of this.managers) {
      const { pixelX: relativeX, pixelY: relativeY } = calculateRelativePixelXY(
        pixelX,
        pixelY,
        m,
      );
      m.onRightClick?.(this.world, relativeX, relativeY);
    }
  }

  onLeftClick(pixelX: number, pixelY: number): void {
    for (const m of this.managers) {
      const { pixelX: relativeX, pixelY: relativeY } = calculateRelativePixelXY(
        pixelX,
        pixelY,
        m,
      );
      m.onLeftClick?.(this.world, relativeX, relativeY);
    }
  }

  onMouseMove(pixelX: number, pixelY: number): void {
    for (const m of this.managers) {
      const { pixelX: relativeX, pixelY: relativeY } = calculateRelativePixelXY(
        pixelX,
        pixelY,
        m,
      );
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
