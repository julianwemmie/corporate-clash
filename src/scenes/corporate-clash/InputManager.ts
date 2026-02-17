import type { Manager, CorporateWorld, GridPos } from "./types.js";

export class InputManager implements Manager {
  onRightClick(world: CorporateWorld): void {

  }

  onLeftClick(world: CorporateWorld): void {

  }

  onMouseMove(world: CorporateWorld, gridPos: GridPos | null): void {
    world.hoveredTile = gridPos;
  }

  update(world: CorporateWorld, _dt: number): void {

  }
}
