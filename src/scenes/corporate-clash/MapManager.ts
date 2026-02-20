import type { Renderer } from '../../engine/types.js';
import {
  CELL_SIZE,
  GRID_SIZE,
  ISO_TILE_W,
  ISO_TILE_H,
} from '../../engine/types.js';
import {
  BUILDING_TYPES,
  type EmployeeBuildingType,
  OFFICE_EMPLOYEE_TYPES,
  LAWFIRM_EMPLOYEE_TYPES,
  type CorporateWorld,
  type GameAction,
  type GridPos,
  type Manager,
} from './types.js';
import { Assets, Texture } from 'pixi.js';

const HALF_W = ISO_TILE_W / 2;
const HALF_H = ISO_TILE_H / 2;
const MAP_AREA_W = GRID_SIZE * CELL_SIZE;
const MAP_AREA_H = GRID_SIZE * CELL_SIZE;
const ISO_ORIGIN_X = MAP_AREA_W / 2;
const ISO_ORIGIN_Y = (MAP_AREA_H - GRID_SIZE * ISO_TILE_H) / 2 + HALF_H;

const MAX = GRID_SIZE - 1;
const DIRECTION_LABELS: Record<number, string> = {
  0: 'SE',
  1: 'SW',
  2: 'NW',
  3: 'NE',
};

export class MapManager implements Manager {
  private buildingTextures = new Map<string, Texture>();
  private rotation: 0 | 1 | 2 | 3 = 0;

  private rotateCoords(row: number, col: number): { row: number; col: number } {
    switch (this.rotation) {
      case 0:
        return { row, col };
      case 1:
        return { row: col, col: MAX - row };
      case 2:
        return { row: MAX - row, col: MAX - col };
      case 3:
        return { row: MAX - col, col: row };
    }
  }

  private unrotateCoords(
    row: number,
    col: number,
  ): { row: number; col: number } {
    switch (this.rotation) {
      case 0:
        return { row, col };
      case 1:
        return { row: MAX - col, col: row };
      case 2:
        return { row: MAX - row, col: MAX - col };
      case 3:
        return { row: col, col: MAX - row };
    }
  }

  private gridToIso(row: number, col: number): { x: number; y: number } {
    const r = this.rotateCoords(row, col);
    return {
      x: (r.col - r.row) * HALF_W + ISO_ORIGIN_X,
      y: (r.col + r.row) * HALF_H + ISO_ORIGIN_Y,
    };
  }

  private pixelToGrid(pixelX: number, pixelY: number): GridPos {
    const relX = pixelX - ISO_ORIGIN_X;
    const relY = pixelY - ISO_ORIGIN_Y;
    const rotCol = Math.round((relX / HALF_W + relY / HALF_H) / 2);
    const rotRow = Math.round((relY / HALF_H - relX / HALF_W) / 2);
    const orig = this.unrotateCoords(rotRow, rotCol);
    return { row: orig.row, col: orig.col };
  }

  private isInBounds(world: CorporateWorld, gridPos: GridPos): boolean {
    return (
      gridPos.row >= 0 &&
      gridPos.row < world.grid.length &&
      gridPos.col >= 0 &&
      gridPos.col < world.grid[0].length
    );
  }

  onRightClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    console.log('Right click at', { pixelX, pixelY }, gridPos);
  }

  onLeftClick(world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    if (!this.isInBounds(world, gridPos)) return;

    if (
      world.uiMode.kind === 'buildingPanel' ||
      world.uiMode.kind === 'officeEmployeePanel' ||
      world.uiMode.kind === 'lawfirmEmployeePanel'
    ) {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind === 'none') {
      const tile = world.grid[gridPos.row][gridPos.col];

      if (!tile.building) {
        world.uiMode = { kind: 'buildingPanel', tile: gridPos };
      } else if (tile.building.type === 'lawfirm') {
        world.uiMode = { kind: 'lawfirmEmployeePanel', tile: gridPos };
      } else {
        world.uiMode = { kind: 'officeEmployeePanel', tile: gridPos };
      }
    }
  }

  onMouseMove(world: CorporateWorld, pixelX: number, pixelY: number): void {
    if (world.uiMode.kind === 'alert') return;
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    world.hoveredTile = gridPos;
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (key === 'KeyR') {
      this.rotation = ((this.rotation + 1) % 4) as 0 | 1 | 2 | 3;
      return;
    }

    if (world.uiMode.kind === 'alert') {
      return;
    } else if (world.uiMode.kind === 'buildingPanel') {
      this.handleBuildingKey(world, key);
    } else if (world.uiMode.kind === 'officeEmployeePanel') {
      this.handleEmployeeKey(world, 'office', key);
    } else if (world.uiMode.kind === 'lawfirmEmployeePanel') {
      this.handleEmployeeKey(world, 'lawfirm', key);
    }
  }

  private handleBuildingKey(world: CorporateWorld, key: string): void {
    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (world.uiMode.kind !== 'buildingPanel') return;

    const index = parseInt(key.replace('Digit', '')) - 1;
    const buildingType = BUILDING_TYPES[index];
    if (!buildingType) return;

    const { row, col } = world.uiMode.tile;
    this.sendAction({ kind: 'build', row, col, buildingType });
  }

  private handleEmployeeKey(
    world: CorporateWorld,
    buildingType: EmployeeBuildingType,
    key: string,
  ): void {
    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    if (
      world.uiMode.kind !== 'officeEmployeePanel' &&
      world.uiMode.kind !== 'lawfirmEmployeePanel'
    )
      return;

    const index = parseInt(key.replace('Digit', '')) - 1;

    const employeeType =
      buildingType === 'office'
        ? OFFICE_EMPLOYEE_TYPES[index]
        : LAWFIRM_EMPLOYEE_TYPES[index];
    if (!employeeType) return;

    const { row, col } = world.uiMode.tile;
    this.sendAction({ kind: 'hire', row, col, employeeType });
  }

  private sendAction(action: GameAction): void {
    fetch('/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    // Load textures if not loaded
    if (this.buildingTextures.size === 0) {
      Assets.load([
        '/assets/buildings/smallOffice.png',
        '/assets/buildings/mediumOffice.png',
        '/assets/buildings/largeOffice.png',
        '/assets/buildings/lawfirm.png',
      ]).then((textures) => {
        for (const texture of Object.values(textures) as Texture[]) {
          texture.source.scaleMode = 'nearest';
        }
        this.buildingTextures.set(
          'smallOffice',
          textures['/assets/buildings/smallOffice.png'],
        );
        this.buildingTextures.set(
          'mediumOffice',
          textures['/assets/buildings/mediumOffice.png'],
        );
        this.buildingTextures.set(
          'largeOffice',
          textures['/assets/buildings/largeOffice.png'],
        );
        this.buildingTextures.set(
          'lawfirm',
          textures['/assets/buildings/lawfirm.png'],
        );
      });
    }

    // ground tiles
    for (let row = 0; row < world.grid.length; row++) {
      for (let col = 0; col < world.grid[row].length; col++) {
        const { x, y } = this.gridToIso(row, col);
        renderer.drawDiamond(
          x,
          y,
          ISO_TILE_W,
          ISO_TILE_H,
          (row + col) % 2 === 0 ? 0x333333 : 0x222222,
        );
      }
    }

    // buildings back-to-front (sorted by rotated depth)
    const hovered = world.hoveredTile;
    const isHovering = hovered && this.isInBounds(world, hovered);
    const buildings: { row: number; col: number; depth: number }[] = [];
    for (let row = 0; row < world.grid.length; row++) {
      for (let col = 0; col < world.grid[row].length; col++) {
        if (!world.grid[row][col].building) continue;
        const r = this.rotateCoords(row, col);
        buildings.push({ row, col, depth: r.row + r.col });
      }
    }
    buildings.sort((a, b) => a.depth - b.depth);

    for (const { row, col } of buildings) {
      const tile = world.grid[row][col];
      const texture = this.buildingTextures.get(tile.building!.type);
      if (!texture) continue;

      const isThisHovered =
        isHovering && hovered.row === row && hovered.col === col;

      const { x, y } = this.gridToIso(row, col);
      const scale = ISO_TILE_W / texture.width;
      const spriteW = ISO_TILE_W;
      const spriteH = texture.height * scale;
      renderer.drawSprite(texture, x - spriteW / 2, y + HALF_H - spriteH, {
        width: spriteW,
        height: spriteH,
        alpha: isHovering && !isThisHovered ? 0.3 : 1,
      });
    }

    if (world.hoveredTile && this.isInBounds(world, world.hoveredTile)) {
      const { row, col } = world.hoveredTile;
      const { x, y } = this.gridToIso(row, col);
      renderer.drawDiamond(x, y, ISO_TILE_W, ISO_TILE_H, 0xffffff, {
        alpha: 0.3,
      });
    }

    // Rotation hint in top-right of map area
    renderer.drawText(
      `[R] Rotate | Facing ${DIRECTION_LABELS[this.rotation]}`,
      MAP_AREA_W - 10,
      10,
      { fontSize: 12, color: 0x888888, anchor: 1 },
    );
  }
}
