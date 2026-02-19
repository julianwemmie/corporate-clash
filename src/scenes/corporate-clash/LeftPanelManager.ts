import type { Renderer } from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';
import {
  CANVAS_HEIGHT,
  LEFT_PANEL_WIDTH,
  TICK_RATE_S,
} from '../../engine/types.js';

export class LeftPanelManager implements Manager {
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

    const secondsLeft = Math.ceil(world.attackTimer * TICK_RATE_S);

    return { funds: world.funds, buildings, employees, secondsLeft };
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.phase === 'playing') {
      renderer.drawRect(0, 0, LEFT_PANEL_WIDTH, CANVAS_HEIGHT, 0x000000);

      const { funds, buildings, employees, secondsLeft } = this.display(world);
      renderer.drawText(`$${funds.toLocaleString()}`, 10, 10, {
        fontSize: 20,
        color: 0x2ecc71,
      });
      renderer.drawText(`Buildings: ${buildings}`, 10, 36, {
        fontSize: 14,
        color: 0xcccccc,
      });
      renderer.drawText(`Employees: ${employees}`, 10, 56, {
        fontSize: 14,
        color: 0xcccccc,
      });
      renderer.drawText(`Next attack: ${secondsLeft}`, 10, CANVAS_HEIGHT - 24, {
        fontSize: 14,
        color: 0xcccccc,
      });
    }
  }
}
