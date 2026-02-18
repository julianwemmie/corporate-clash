import { CorporateWorld, Manager } from "./types";

export class HUDManager {
  private buildings = 0;
  private employees = 1;

  display(world: CorporateWorld) {
    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          this.buildings += 1;
        }
      }
    }
    return {
      funds: world.funds,
      buildings: this.buildings,
      employees: this.employees,
    };
  }
}
