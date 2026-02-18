import type { Renderer } from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';
import {
  CANVAS_HEIGHT,
  RIGHT_PANEL_WIDTH,
} from '../../engine/types.js';

export class RightPanelManager implements Manager {
  display(world: CorporateWorld) {
    let buildings = 0;
    let employees = 0;

    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          buildings++;
          employees += tile.building.employees.length;
        }
      }
    }

    return { funds: world.funds, buildings, employees };
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.phase === 'playing') {
      renderer.drawRect(
        0,
        0,
        RIGHT_PANEL_WIDTH,
        CANVAS_HEIGHT,
        0x000000,
      );
      return;
    }
  }
}
