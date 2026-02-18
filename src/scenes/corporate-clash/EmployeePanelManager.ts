import type { Renderer } from '../../engine/types.js';
import {
  BUILDING_CONFIG,
  EMPLOYEE_CONFIG,
  EMPLOYEE_TYPES,
  type CorporateWorld,
  type Manager,
} from './types.js';
import { GRID_SIZE, CELL_SIZE } from '../../engine/types.js';

const PANEL_X = GRID_SIZE * CELL_SIZE + 10;
const LINE_HEIGHT = 22;
const HEADER_SIZE = 18;
const OPTION_SIZE = 13;
const DIM = 0x666666;
const BRIGHT = 0xffffff;

export class EmployeePanelManager implements Manager {
  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'employeePanel') return;
    this.renderEmployeePanel(world, renderer);
  }

  private renderEmployeePanel(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'employeePanel') return;
    const { row, col } = world.uiMode.tile;
    const building = world.grid[row][col].building;
    if (!building) return;

    const capacity = BUILDING_CONFIG[building.type].capacity;
    const current = building.employees.length;
    let y = 10;

    renderer.drawText('Hire Employee', PANEL_X, y, {
      fontSize: HEADER_SIZE,
      color: 0x2ecc71,
    });
    y += LINE_HEIGHT + 4;

    renderer.drawText(`${current}/${capacity} slots`, PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: 0xaaaaaa,
    });
    y += LINE_HEIGHT + 6;

    EMPLOYEE_TYPES.forEach((type, i) => {
      const config = EMPLOYEE_CONFIG[type];
      const canAfford = world.funds >= config.cost;
      const hasRoom = current < capacity;
      const color = canAfford && hasRoom ? BRIGHT : DIM;

      renderer.drawText(`[${i + 1}] ${config.label}`, PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color,
      });
      y += LINE_HEIGHT - 4;
      renderer.drawText(
        `    $${config.cost.toLocaleString()}  +${config.profitPerTick}/t`,
        PANEL_X,
        y,
        { fontSize: OPTION_SIZE - 2, color: 0xaaaaaa },
      );
      y += LINE_HEIGHT;
    });

    y += 4;
    renderer.drawText('[ESC] Close', PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: 0xaaaaaa,
    });
  }
}
