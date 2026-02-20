import type { Renderer } from '../../engine/types.js';
import { CANVAS_HEIGHT, RIGHT_PANEL_WIDTH } from '../../engine/types.js';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  OFFICE_EMPLOYEE_CONFIG,
  OFFICE_EMPLOYEE_TYPES,
  LAWFIRM_EMPLOYEE_CONFIG,
  LAWFIRM_EMPLOYEE_TYPES,
  type EmployeeConfig,
  type CorporateWorld,
  type Manager,
} from './types.js';

const PANEL_X = 10;
const LINE_HEIGHT = 22;
const HEADER_SIZE = 18;
const OPTION_SIZE = 13;
const DIM = 0x666666;
const BRIGHT = 0xffffff;

export class RightPanelManager implements Manager {
  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.phase !== 'playing') return;

    renderer.drawRect(0, 0, RIGHT_PANEL_WIDTH, CANVAS_HEIGHT, 0x000000);

    if (world.uiMode.kind === 'buildingPanel') {
      this.renderBuildingPanel(world, renderer);
    } else if (
      world.uiMode.kind === 'officeEmployeePanel' ||
      world.uiMode.kind === 'lawfirmEmployeePanel'
    ) {
      this.renderEmployeePanel(world, renderer);
    }
  }

  private renderBuildingPanel(world: CorporateWorld, renderer: Renderer): void {
    let y = 10;

    renderer.drawText('Build', PANEL_X, y, {
      fontSize: HEADER_SIZE,
      color: 0x4a90d9,
    });
    y += LINE_HEIGHT + 10;

    BUILDING_TYPES.forEach((type, i) => {
      const config = BUILDING_CONFIG[type];
      const canAfford = world.funds >= config.cost;
      const color = canAfford ? BRIGHT : DIM;

      renderer.drawText(`[${i + 1}] ${config.label}`, PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color,
      });
      y += LINE_HEIGHT - 4;
      renderer.drawText(
        `    $${config.cost.toLocaleString()}  cap: ${config.capacity}`,
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

  private renderEmployeePanel(world: CorporateWorld, renderer: Renderer): void {
    if (
      world.uiMode.kind !== 'officeEmployeePanel' &&
      world.uiMode.kind !== 'lawfirmEmployeePanel'
    )
      return;
    const { row, col } = world.uiMode.tile;
    const building = world.grid[row][col].building;

    if (!building) return;

    const { type: buildingType } = building;
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

    const [types, configMap] =
      buildingType === 'lawfirm'
        ? [LAWFIRM_EMPLOYEE_TYPES, LAWFIRM_EMPLOYEE_CONFIG]
        : [OFFICE_EMPLOYEE_TYPES, OFFICE_EMPLOYEE_CONFIG];

    y = this.renderEmployeeOptions(
      renderer,
      types,
      configMap,
      world.funds,
      current < capacity,
      y,
    );

    y += 4;
    renderer.drawText('[ESC] Close', PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: 0xaaaaaa,
    });
  }

  private renderEmployeeOptions(
    renderer: Renderer,
    types: string[],
    configMap: Record<string, EmployeeConfig>,
    funds: number,
    hasRoom: boolean,
    y: number,
  ): number {
    types.forEach((type, i) => {
      const config = configMap[type];
      const color = funds >= config.cost && hasRoom ? BRIGHT : DIM;

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
    return y;
  }
}
