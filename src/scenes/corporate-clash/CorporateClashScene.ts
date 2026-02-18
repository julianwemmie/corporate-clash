import type { Scene, GameContext, Renderer } from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';
import { createWorld } from './types.js';
import { InputManager } from './InputManager.js';
import { MapRenderManager } from './MapRenderManager.js';
import { HUDManager } from './HUDManager.js';
import { EconomyManager } from './EconomyManager.js';
import { EmployeePanelManager } from './EmployeePanelManager.js';
import { EmployeeManager } from './EmployeeManager.js';
import { BuildingManager } from './BuildingManager.js';
import { BuildingPanelManager } from './BuildingPanelManager.js';

export class CorporateClashScene implements Scene {
  private world!: CorporateWorld;
  private managers: Manager[] = [];

  init(ctx: GameContext): void {
    this.world = createWorld(ctx.gridSize);
    this.managers = [
      new InputManager(),
      new EconomyManager(),
      new MapRenderManager(),
      new HUDManager(),
      new BuildingManager(),
      new EmployeeManager(),
      new BuildingPanelManager(),
      new EmployeePanelManager(),
    ];
  }

  update(dt: number): void {
    for (const m of this.managers) m.update?.(this.world, dt);
  }

  render(renderer: Renderer): void {
    renderer.clear();
    for (const m of this.managers) m.render?.(this.world, renderer);
  }

  onRightClick(gridCol: number, gridRow: number): void {
    for (const m of this.managers)
      m.onRightClick?.(this.world, { row: gridRow, col: gridCol });
  }

  onLeftClick(gridCol: number, gridRow: number): void {
    for (const m of this.managers)
      m.onLeftClick?.(this.world, { row: gridRow, col: gridCol });
  }

  onKeyDown(key: string): void {
    for (const m of this.managers) m.onKeyDown?.(this.world, key);
  }

  onMouseMove(gridCol: number, gridRow: number): void {
    for (const m of this.managers)
      m.onMouseMove?.(this.world, { row: gridRow, col: gridCol });
  }

  onKeyUp(key: string): void {
    for (const m of this.managers) m.onKeyUp?.(this.world, key);
  }

  destroy(): void {
    for (const m of this.managers) m.destroy?.();
  }
}
