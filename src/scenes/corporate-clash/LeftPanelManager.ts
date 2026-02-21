import type { Renderer } from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';
import { EMPLOYEE_CONFIG } from './types.js';
import {
  CANVAS_HEIGHT,
  LEFT_PANEL_WIDTH,
  TICK_RATE_S,
} from '../../engine/types.js';

export class LeftPanelManager implements Manager {
  display(world: CorporateWorld) {
    let buildings = 0;
    let employees = 0;
    let profitPerTick = 0;

    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building) {
          buildings++;
          employees += tile.building.employees.length;
          for (const emp of tile.building.employees) {
            const cfg = EMPLOYEE_CONFIG[emp.type];
            if (cfg) profitPerTick += cfg.profitPerTick;
          }
        }
      }
    }

    return {
      funds: world.funds,
      mapDefense: world.mapDefense,
      buildings,
      employees,
      profitPerSec: profitPerTick / TICK_RATE_S,
    };
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.phase === 'playing') {
      renderer.drawRect(0, 0, LEFT_PANEL_WIDTH, CANVAS_HEIGHT, 0x16213e, {
        alpha: 0.85,
      });

      const me = world.players.find((p) => p.id === world.playerId);
      const playerName = me?.name ?? 'Unknown';

      renderer.drawText(playerName, 10, 14, {
        fontSize: 18,
        color: 0xffffff,
      });

      renderer.drawRect(10, 38, LEFT_PANEL_WIDTH - 20, 1, 0xfb8000, {
        alpha: 0.3,
      });

      const { funds, mapDefense, buildings, employees, profitPerSec } =
        this.display(world);
      renderer.drawText(`$${funds.toLocaleString()}`, 10, 48, {
        fontSize: 20,
        color: 0xfb8000,
      });

      const sign = profitPerSec >= 0 ? '+' : '-';
      const rateColor = profitPerSec >= 0 ? 0x27ae60 : 0xe74c3c;
      renderer.drawText(
        `${sign}$${Math.abs(Math.round(profitPerSec)).toLocaleString()}/s`,
        10,
        72,
        { fontSize: 12, color: rateColor },
      );

      renderer.drawText(`Defense: ${mapDefense.toLocaleString()}`, 10, 94, {
        fontSize: 20,
        color: 0xfb8000,
      });

      renderer.drawRect(10, 124, LEFT_PANEL_WIDTH - 20, 1, 0xfb8000, {
        alpha: 0.3,
      });

      renderer.drawText(`Buildings: ${buildings}`, 10, 136, {
        fontSize: 14,
        color: 0xcccccc,
      });
      renderer.drawText(`Employees: ${employees}`, 10, 166, {
        fontSize: 14,
        color: 0xcccccc,
      });
      renderer.drawText(`Online Players: ${world.players.length}`, 10, 196, {
        fontSize: 14,
        color: 0xcccccc,
      });

      const nextAttackSecs = Math.ceil(world.eventTimer * TICK_RATE_S);
      renderer.drawText(`Next Event: ${nextAttackSecs}s`, 10, 226, {
        fontSize: 14,
        color: 0xe74c3c,
      });

      if (world.defenseBuffer > 0) {
        const bufferSecs = Math.ceil(world.defenseBuffer * TICK_RATE_S);
        renderer.drawText(`Shield: ${bufferSecs}s`, 10, 250, {
          fontSize: 14,
          color: 0x3498db,
        });
      }

      let bottomY = CANVAS_HEIGHT - 24;
      if (world.attackCooldown > 0) {
        const cooldownSecs = Math.ceil(world.attackCooldown * TICK_RATE_S);
        renderer.drawText(`Event cooldown: ${cooldownSecs}s`, 10, bottomY, {
          fontSize: 14,
          color: 0xe74c3c,
        });
        bottomY -= 20;
      }

      renderer.drawText('[A] Attack', 10, bottomY, {
        fontSize: 14,
        color: 0x997744,
      });
      bottomY -= 20;

      const dirLabels: Record<number, string> = {
        0: 'SE',
        1: 'SW',
        2: 'NW',
        3: 'NE',
      };
      renderer.drawText(
        `[R] Rotate | Facing ${dirLabels[world.mapRotation]}`,
        10,
        bottomY,
        { fontSize: 14, color: 0x997744 },
      );
    }
  }
}
