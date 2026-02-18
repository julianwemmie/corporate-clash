import type { Manager, CorporateWorld, GridPos } from './types.js';

export class InputManager implements Manager {
  onKeyDown(world: CorporateWorld, key: string): void {
    if (key === 'Space') {
      // //
      // else if (world.state === "gameOver") {
      //   resetWorld(world);
      //   world.state = "start";
      // }
      // return;
    }

    // if (world.state !== "playing") return;

    // const dir = KEY_DIRECTION[key];
    // if (!dir) return;

    // if (dir === OPPOSITE[world.player.direction]) return;

    // world.player.nextDirection = dir;
  }

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
