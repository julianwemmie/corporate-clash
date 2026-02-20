import type { CorporateWorld, EmployeeConfig, Manager } from './types.js';
import {
  getEmployeeCategory,
  OFFICE_EMPLOYEE_CONFIG,
  LAWFIRM_EMPLOYEE_CONFIG,
  type OfficeEmployeeType,
  type LawfirmEmployeeType,
  type OfficeType,
} from './types.js';

export class EconomyManager implements Manager {
  calculateProfit(
    configMap: Record<string, EmployeeConfig>,
    employee: OfficeEmployeeType | LawfirmEmployeeType,
  ): number {
    return configMap[employee].profitPerTick;
  }

  update(world: CorporateWorld): void {
    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          for (const employee of tile.building.employees) {
            const employeeCategory: OfficeType = getEmployeeCategory(
              employee.type,
            );
            const configMap =
              employeeCategory === 'office'
                ? OFFICE_EMPLOYEE_CONFIG
                : LAWFIRM_EMPLOYEE_CONFIG;
            world.funds += this.calculateProfit(configMap, employee.type);
          }
        }
      }
    }
  }
}
