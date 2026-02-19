import type { CorporateWorld, Manager } from './types.js';
import {
  getEmployeeCategory,
  OFFICE_EMPLOYEE_CONFIG,
  LAWFIRM_EMPLOYEE_CONFIG,
  type OfficeEmployeeType,
  type LawfirmEmployeeType,
} from './types.js';

export class EconomyManager implements Manager {
  update(world: CorporateWorld): void {
    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          for (const employee of tile.building.employees) {
            let profit = 0;
            const employeeType = getEmployeeCategory(employee.type);

            if (employeeType === 'office') {
              profit =
                OFFICE_EMPLOYEE_CONFIG[employee.type as OfficeEmployeeType]
                  .profitPerTick;
            } else if (employeeType === 'law') {
              profit =
                LAWFIRM_EMPLOYEE_CONFIG[employee.type as LawfirmEmployeeType]
                  .profitPerTick;
            }

            world.funds += profit;
          }
        }
      }
    }
  }
}
