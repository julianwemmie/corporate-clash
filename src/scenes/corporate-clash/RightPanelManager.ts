import type { Renderer } from '../../engine/types.js';
import { CANVAS_HEIGHT, RIGHT_PANEL_WIDTH } from '../../engine/types.js';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  UPGRADE_PATH,
  UPGRADE_COST_FACTOR,
  SELL_PERCENTAGE,
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
const DIM = 0x665544;
const BRIGHT = 0xffffff;

export class RightPanelManager implements Manager {
  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.phase !== 'playing') return;

    renderer.drawRect(0, 0, RIGHT_PANEL_WIDTH, CANVAS_HEIGHT, 0x16213e, {
      alpha: 0.85,
    });

    if (world.uiMode.kind === 'buildingPanel') {
      this.renderBuildingPanel(world, renderer);
    } else if (world.uiMode.kind === 'buildingDetailPanel') {
      this.renderBuildingDetailPanel(world, renderer);
    } else if (world.uiMode.kind === 'confirm') {
      this.renderConfirmPanel(world, renderer);
    }
  }

  private renderBuildingPanel(world: CorporateWorld, renderer: Renderer): void {
    let y = 10;

    renderer.drawText('Build', PANEL_X, y, {
      fontSize: HEADER_SIZE,
      color: 0xfb8000,
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
      color: 0x997744,
    });
  }

  private renderBuildingDetailPanel(
    world: CorporateWorld,
    renderer: Renderer,
  ): void {
    if (world.uiMode.kind !== 'buildingDetailPanel') return;
    const { row, col } = world.uiMode.tile;
    const building = world.grid[row][col].building;
    if (!building) return;

    const buildingConfig = BUILDING_CONFIG[building.type];
    const capacity = buildingConfig.capacity;
    const current = building.employees.length;
    const sellValue = Math.floor(buildingConfig.cost * SELL_PERCENTAGE);
    let y = 10;

    // --- Building info section ---
    renderer.drawText(buildingConfig.label, PANEL_X, y, {
      fontSize: HEADER_SIZE,
      color: 0xfb8000,
    });
    y += LINE_HEIGHT + 2;

    renderer.drawText(`${current}/${capacity} employees`, PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: 0x997744,
    });
    y += LINE_HEIGHT;

    // Sell
    renderer.drawText(`[S] Sell ($${sellValue.toLocaleString()})`, PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: BRIGHT,
    });
    y += LINE_HEIGHT;

    // Upgrade
    const nextType = UPGRADE_PATH[building.type];
    if (nextType) {
      const upgradeCost = Math.floor(
        (BUILDING_CONFIG[nextType].cost - buildingConfig.cost) *
          UPGRADE_COST_FACTOR,
      );
      const canAfford = world.funds >= upgradeCost;
      renderer.drawText(
        `[U] Upgrade ($${upgradeCost.toLocaleString()})`,
        PANEL_X,
        y,
        { fontSize: OPTION_SIZE, color: canAfford ? BRIGHT : DIM },
      );
      y += LINE_HEIGHT - 4;
      renderer.drawText(
        `    → ${BUILDING_CONFIG[nextType].label} (cap: ${BUILDING_CONFIG[nextType].capacity})`,
        PANEL_X,
        y,
        { fontSize: OPTION_SIZE - 2, color: 0xaaaaaa },
      );
      y += LINE_HEIGHT;
    }

    y += 6;

    // --- Employee hire section ---
    renderer.drawText('Hire Employee', PANEL_X, y, {
      fontSize: HEADER_SIZE - 2,
      color: 0xfb8000,
    });
    y += LINE_HEIGHT + 4;

    const isLawfirm = building.type === 'lawfirm';
    const [types, configMap] = isLawfirm
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

    // Fire
    renderer.drawText('[X] Fire 1 employee', PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: current > 0 ? BRIGHT : DIM,
    });
    y += LINE_HEIGHT + 4;

    renderer.drawText('[ESC] Close', PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: 0x997744,
    });
  }

  private renderConfirmPanel(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'confirm') return;

    let y = 10;

    renderer.drawText('Confirm', PANEL_X, y, {
      fontSize: HEADER_SIZE,
      color: 0xfb8000,
    });
    y += LINE_HEIGHT + 10;

    renderer.drawText(world.uiMode.message, PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: BRIGHT,
    });
    y += LINE_HEIGHT + 2;

    if (world.uiMode.detail) {
      renderer.drawText(world.uiMode.detail, PANEL_X, y, {
        fontSize: OPTION_SIZE - 2,
        color: 0xaaaaaa,
      });
      y += LINE_HEIGHT;
    }

    y += 10;

    renderer.drawText('[Y] Yes', PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: 0x27ae60,
    });
    y += LINE_HEIGHT;

    renderer.drawText('[N] Cancel', PANEL_X, y, {
      fontSize: OPTION_SIZE,
      color: 0x997744,
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
