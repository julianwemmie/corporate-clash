import { CorporateWorld, EMPLOYEE_CONFIG, Manager } from "./types";

export class EconomyManager implements Manager {
  update(world: CorporateWorld, _dt: number): void {
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
