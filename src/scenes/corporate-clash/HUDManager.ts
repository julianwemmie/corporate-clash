import type { Renderer } from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';
import { GRID_SIZE } from '../../engine/types.js';

export class HUDManager implements Manager {
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
    const { funds, buildings, employees } = this.display(world);

    if (world.phase === 'playing') {
      // Right grid
      renderer.drawRect(GRID_SIZE, 0, 1, GRID_SIZE, 0x000000);
      console.log('here');

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
      return;
    }
  }
}
