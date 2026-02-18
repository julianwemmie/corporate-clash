import type { Renderer } from '../../engine/types.js';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
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

export class BuildingPanelManager implements Manager {
  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'buildingPanel') return;

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
}
