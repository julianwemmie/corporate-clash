import type { CorporateWorld, Manager } from './types.js';
import { EMPLOYEE_CONFIG } from './types.js';

export class EconomyManager implements Manager {
  update(world: CorporateWorld): void {
    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          for (const employee of tile.building.employees) {
            const profit = EMPLOYEE_CONFIG[employee.type].profitPerTick;
            world.funds += profit;
          }
        }
      }
    }
  }
}
