import type { Manager, CorporateWorld, GridPos } from './types.js';

export class InputManager implements Manager {
  onRightClick(world: CorporateWorld, gridPos: GridPos): void {
    console.log('Right click at', gridPos);
  }

  onLeftClick(world: CorporateWorld, gridPos: GridPos): void {
    console.log('Left click at', gridPos);
  }

  onMouseMove(world: CorporateWorld, gridPos: GridPos | null): void {
    world.hoveredTile = gridPos;
  }
}
