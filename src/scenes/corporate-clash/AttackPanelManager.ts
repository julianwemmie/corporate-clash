import type { Renderer } from '../../engine/types.js';
import {
  CANVAS_HEIGHT,
  RIGHT_PANEL_WIDTH,
  TICK_RATE_S,
} from '../../engine/types.js';
import type { CorporateWorld, Manager, GameAction } from './types.js';

const PANEL_X = 10;
const LINE_HEIGHT = 22;
const HEADER_SIZE = 18;
const OPTION_SIZE = 13;
const DIM = 0x665544;
const BRIGHT = 0xffffff;

export class AttackPanelManager implements Manager {
  private selectedIndex = 0;

  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'attackPanel') {
      // 'A' key opens attack panel from default mode
      if (
        key === 'KeyA' &&
        world.uiMode.kind !== 'alert' &&
        world.uiMode.kind !== 'confirm'
      ) {
        this.selectedIndex = 0;
        world.uiMode = { kind: 'attackPanel', targetId: null, troops: [] };
      }
      return;
    }

    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    const { targetId, troops } = world.uiMode;

    // Phase 1: Picking a target (no target selected yet)
    if (!targetId) {
      const otherPlayers = world.players.filter((p) => p.id !== world.playerId);
      if (otherPlayers.length === 0) return;

      if (key === 'ArrowUp') {
        this.selectedIndex =
          (this.selectedIndex - 1 + otherPlayers.length) % otherPlayers.length;
      } else if (key === 'ArrowDown') {
        this.selectedIndex = (this.selectedIndex + 1) % otherPlayers.length;
      } else if (key === 'Enter') {
        const target = otherPlayers[this.selectedIndex];
        if (target && target.defenseBuffer <= 0) {
          this.selectedIndex = 0;
          world.uiMode = {
            kind: 'attackPanel',
            targetId: target.id,
            troops: [],
          };
        }
      }
      return;
    }

    // Phase 2: Selecting troops from buildings
    const buildingTiles = [];
    for (const row of world.grid) {
      for (const tile of row) {
        if (tile.building && tile.building.employees.length > 0) {
          buildingTiles.push(tile);
        }
      }
    }
    if (buildingTiles.length === 0) return;

    if (key === 'ArrowUp') {
      this.selectedIndex =
        (this.selectedIndex - 1 + buildingTiles.length) % buildingTiles.length;
    } else if (key === 'ArrowDown') {
      this.selectedIndex = (this.selectedIndex + 1) % buildingTiles.length;
    } else if (key === 'Enter') {
      if (troops.length > 0 || buildingTiles[this.selectedIndex]) {
        // If troops are selected and user presses enter on a building, add troop
        const tile = buildingTiles[this.selectedIndex];
        if (tile) {
          const existing = troops.find(
            (t) => t.row === tile.row && t.col === tile.col,
          );
          const currentCount = existing ? existing.count : 0;
          const maxCount = tile.building!.employees.length;
          if (currentCount < maxCount) {
            const newTroops = troops.filter(
              (t) => !(t.row === tile.row && t.col === tile.col),
            );
            newTroops.push({
              row: tile.row,
              col: tile.col,
              count: currentCount + 1,
            });
            world.uiMode = { kind: 'attackPanel', targetId, troops: newTroops };
          }
        }
      }
    } else if (key === 'Space' && troops.length > 0) {
      // Space to launch attack
      const action: GameAction = {
        kind: 'attack',
        playerId: world.playerId,
        targetId,
        troops,
      };
      fetch('/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
      world.uiMode = { kind: 'none' };
    }
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'attackPanel') return;

    renderer.drawRect(0, 0, RIGHT_PANEL_WIDTH, CANVAS_HEIGHT, 0x16213e, {
      alpha: 0.85,
    });

    const { targetId, troops } = world.uiMode;
    let y = 10;

    renderer.drawText('Attack', PANEL_X, y, {
      fontSize: HEADER_SIZE,
      color: 0xe74c3c,
    });
    y += LINE_HEIGHT + 10;

    if (world.attackCooldown > 0) {
      renderer.drawText(`Cooldown: ${world.attackCooldown} ticks`, PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: DIM,
      });
      y += LINE_HEIGHT;
      renderer.drawText('[ESC] Close', PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0x997744,
      });
      return;
    }

    // Phase 1: Pick target
    if (!targetId) {
      renderer.drawText('Pick target:', PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0x997744,
      });
      y += LINE_HEIGHT;
      const otherPlayers = world.players.filter((p) => p.id !== world.playerId);
      otherPlayers.forEach((p, i) => {
        const shielded = p.defenseBuffer > 0;
        const shieldSecs = Math.ceil(p.defenseBuffer * TICK_RATE_S);
        const selected = i === this.selectedIndex;
        const prefix = selected ? '> ' : '  ';
        const label = shielded
          ? `${prefix}${p.name} [Shield ${shieldSecs}s]`
          : `${prefix}${p.name}`;
        renderer.drawText(label, PANEL_X, y, {
          fontSize: OPTION_SIZE,
          color: shielded ? DIM : selected ? 0xffcc00 : BRIGHT,
        });
        y += LINE_HEIGHT - 4;
        renderer.drawText(
          `    $${p.funds.toLocaleString()} | ${p.employeeCount} emp`,
          PANEL_X,
          y,
          {
            fontSize: OPTION_SIZE - 2,
            color: 0x997744,
          },
        );
        y += LINE_HEIGHT;
      });
      y += 4;
      renderer.drawText('[UP/DOWN] Select', PANEL_X, y, {
        fontSize: OPTION_SIZE - 2,
        color: 0xaaaaaa,
      });
      y += LINE_HEIGHT;
      renderer.drawText('[ENTER] Confirm', PANEL_X, y, {
        fontSize: OPTION_SIZE - 2,
        color: 0xaaaaaa,
      });
      y += LINE_HEIGHT;
    } else {
      // Phase 2: Pick troops
      const target = world.players.find((p) => p.id === targetId);
      renderer.drawText(`Target: ${target?.name ?? '???'}`, PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0xe74c3c,
      });
      y += LINE_HEIGHT + 4;

      renderer.drawText('Send troops from:', PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0x997744,
      });
      y += LINE_HEIGHT;

      const buildingTiles = [];
      for (const row of world.grid) {
        for (const tile of row) {
          if (tile.building && tile.building.employees.length > 0) {
            buildingTiles.push(tile);
          }
        }
      }

      buildingTiles.forEach((tile, i) => {
        const assigned = troops.find(
          (t) => t.row === tile.row && t.col === tile.col,
        );
        const count = assigned ? assigned.count : 0;
        const max = tile.building!.employees.length;
        const selected = i === this.selectedIndex;
        const prefix = selected ? '> ' : '  ';
        renderer.drawText(
          `${prefix}(${tile.row},${tile.col}) ${count}/${max}`,
          PANEL_X,
          y,
          { fontSize: OPTION_SIZE, color: selected ? 0xffcc00 : BRIGHT },
        );
        y += LINE_HEIGHT;
      });

      const totalTroops = troops.reduce((sum, t) => sum + t.count, 0);
      y += 4;
      renderer.drawText(`Total: ${totalTroops} troops`, PANEL_X, y, {
        fontSize: OPTION_SIZE,
        color: 0xe74c3c,
      });
      y += LINE_HEIGHT + 4;

      renderer.drawText('[UP/DOWN] Select', PANEL_X, y, {
        fontSize: OPTION_SIZE - 2,
        color: 0xaaaaaa,
      });
      y += LINE_HEIGHT;
      renderer.drawText('[ENTER] Add troop', PANEL_X, y, {
        fontSize: OPTION_SIZE - 2,
        color: 0xaaaaaa,
      });
      y += LINE_HEIGHT;

      if (totalTroops > 0) {
        renderer.drawText('[SPACE] Launch Attack', PANEL_X, y, {
          fontSize: OPTION_SIZE,
          color: 0x2ecc71,
        });
        y += LINE_HEIGHT;
      }
    }

    renderer.drawText('[ESC] Close', PANEL_X, y + 4, {
      fontSize: OPTION_SIZE,
      color: 0xaaaaaa,
    });
  }
}
