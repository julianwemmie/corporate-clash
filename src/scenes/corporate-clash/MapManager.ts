import type { Renderer } from '../../engine/types.js';
import {
  CELL_SIZE,
  GRID_SIZE,
  ISO_TILE_W,
  ISO_TILE_H,
  MAP_OFFSET_Y,
  MAP_PADDING,
  LEFT_PANEL_WIDTH,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../../engine/types.js';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  UPGRADE_PATH,
  SELL_PERCENTAGE,
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
export class MapManager implements Manager {
  private buildingTextures = new Map<string, Texture>();
  private tileTextures: {
    top: Texture;
    left: Texture;
    right: Texture;
  } | null = null;
  private backgroundTexture: Texture | null = null;
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

  onRightClick(_world: CorporateWorld, pixelX: number, pixelY: number): void {
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    console.log('Right click at', { pixelX, pixelY }, gridPos);
  }

  onMouseMove(world: CorporateWorld, pixelX: number, pixelY: number): void {
    if (
      world.uiMode.kind === 'alert' ||
      world.uiMode.kind === 'attackPanel' ||
      world.uiMode.kind === 'confirm'
    )
      return;
    const gridPos = this.pixelToGrid(pixelX, pixelY);
    world.hoveredTile = gridPos;
    this.syncPanelToTile(world, gridPos);
  }

  private syncPanelToTile(world: CorporateWorld, gridPos: GridPos): void {
    if (!this.isInBounds(world, gridPos)) {
      world.uiMode = { kind: 'none' };
      return;
    }

    const tile = world.grid[gridPos.row][gridPos.col];
    if (!tile.building) {
      world.uiMode = { kind: 'buildingPanel', tile: gridPos };
    } else {
      world.uiMode = { kind: 'buildingDetailPanel', tile: gridPos };
    }
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (key === 'KeyR') {
      this.rotation = ((this.rotation + 1) % 4) as 0 | 1 | 2 | 3;
      world.mapRotation = this.rotation;
      return;
    }

    if (world.uiMode.kind === 'alert') {
      return;
    } else if (world.uiMode.kind === 'confirm') {
      this.handleConfirmKey(world, key);
    } else if (world.uiMode.kind === 'buildingPanel') {
      this.handleBuildingKey(world, key);
    } else if (world.uiMode.kind === 'buildingDetailPanel') {
      this.handleBuildingDetailKey(world, key);
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
    this.sendAction({
      kind: 'build',
      playerId: world.playerId,
      row,
      col,
      buildingType,
    });
    world.uiMode = { kind: 'buildingDetailPanel', tile: { row, col } };
  }

  private handleBuildingDetailKey(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'buildingDetailPanel') return;

    if (key === 'Escape') {
      world.uiMode = { kind: 'none' };
      return;
    }

    const { row, col } = world.uiMode.tile;
    const building = world.grid[row][col].building;
    if (!building) return;

    // [S] Sell — enter confirmation
    if (key === 'KeyS') {
      const sellValue = Math.floor(
        BUILDING_CONFIG[building.type].cost * SELL_PERCENTAGE,
      );
      const empCount = building.employees.length;
      const detail =
        empCount > 0
          ? `Refund: $${sellValue.toLocaleString()}\n${empCount} employee${empCount > 1 ? 's' : ''} fired (no refund)`
          : `Refund: $${sellValue.toLocaleString()}`;
      world.uiMode = {
        kind: 'confirm',
        message: `Sell ${BUILDING_CONFIG[building.type].label}?`,
        detail,
        action: { kind: 'sell', playerId: world.playerId, row, col },
        returnMode: { kind: 'buildingDetailPanel', tile: { row, col } },
      };
      return;
    }

    // [X] Fire last employee — enter confirmation
    if (key === 'KeyX') {
      if (building.employees.length === 0) return;
      world.uiMode = {
        kind: 'confirm',
        message: 'Fire 1 employee?',
        detail: 'No refund.',
        action: { kind: 'fire', playerId: world.playerId, row, col },
        returnMode: { kind: 'buildingDetailPanel', tile: { row, col } },
      };
      return;
    }

    // [U] Upgrade — send directly (no confirmation)
    if (key === 'KeyU') {
      const nextType = UPGRADE_PATH[building.type];
      if (!nextType) return;
      this.sendAction({
        kind: 'upgrade',
        playerId: world.playerId,
        row,
        col,
      });
      return;
    }

    // [1-4] Hire employee
    const index = parseInt(key.replace('Digit', '')) - 1;
    const isLawfirm = building.type === 'lawfirm';
    const employeeType = isLawfirm
      ? LAWFIRM_EMPLOYEE_TYPES[index]
      : OFFICE_EMPLOYEE_TYPES[index];
    if (!employeeType) return;

    this.sendAction({
      kind: 'hire',
      playerId: world.playerId,
      row,
      col,
      employeeType,
    });
  }

  private handleConfirmKey(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'confirm') return;

    if (key === 'KeyY' || key === 'Enter') {
      const action = world.uiMode.action;
      this.sendAction(action);
      // If selling, the building is gone — close panel
      if (action.kind === 'sell') {
        world.uiMode = { kind: 'none' };
      } else {
        world.uiMode = world.uiMode.returnMode;
      }
      return;
    }

    if (key === 'KeyN' || key === 'Escape') {
      world.uiMode = world.uiMode.returnMode;
      return;
    }
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
        '/assets/tiles/base-top.png',
        '/assets/tiles/base-left.png',
        '/assets/tiles/base-right.png',
        '/assets/background.png',
      ]).then((textures) => {
        for (const texture of Object.values(textures) as Texture[]) {
          texture.source.scaleMode = 'nearest';
        }
        this.backgroundTexture = textures['/assets/background.png'];
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
        this.tileTextures = {
          top: textures['/assets/tiles/base-top.png'],
          left: textures['/assets/tiles/base-left.png'],
          right: textures['/assets/tiles/base-right.png'],
        };
      });
    }

    const hovered = world.hoveredTile;
    const isHovering = hovered && this.isInBounds(world, hovered);

    // background image (spans the full canvas)
    if (this.backgroundTexture) {
      const mapOriginX = LEFT_PANEL_WIDTH + MAP_PADDING;
      const bgScale = CANVAS_WIDTH / this.backgroundTexture.width;
      const bgW = CANVAS_WIDTH;
      const bgH = this.backgroundTexture.height * bgScale * 1.3;
      const bgX = (CANVAS_WIDTH - bgW) / 2 - mapOriginX;
      const bgY = (CANVAS_HEIGHT - bgH) / 2 - MAP_OFFSET_Y - 30;
      renderer.drawSprite(this.backgroundTexture, bgX, bgY, {
        width: bgW,
        height: bgH,
      });
    }

    // ground tiles
    const sortedTiles: { row: number; col: number; depth: number }[] = [];
    for (let row = 0; row < world.grid.length; row++) {
      for (let col = 0; col < world.grid[row].length; col++) {
        const r = this.rotateCoords(row, col);
        sortedTiles.push({ row, col, depth: r.row + r.col });
      }
    }

    sortedTiles.sort((a, b) => a.depth - b.depth);

    for (const { row, col } of sortedTiles) {
      if (!this.tileTextures) continue;
      const { x, y } = this.gridToIso(row, col);
      const isThisTileHovered =
        isHovering && hovered.row === row && hovered.col === col;
      const tileAlpha = isThisTileHovered ? 1 : 0.3;

      const leftH =
        this.tileTextures.left.height * (HALF_W / this.tileTextures.left.width);
      const rightH =
        this.tileTextures.right.height *
        (HALF_W / this.tileTextures.right.width);

      renderer.drawSprite(this.tileTextures.left, x - HALF_W, y, {
        width: HALF_W,
        height: leftH,
        alpha: tileAlpha,
      });
      renderer.drawSprite(this.tileTextures.right, x, y, {
        width: HALF_W,
        height: rightH,
        alpha: tileAlpha,
      });
      renderer.drawSprite(this.tileTextures.top, x - HALF_W, y - HALF_H, {
        width: ISO_TILE_W,
        height: ISO_TILE_H,
        alpha: tileAlpha,
      });
    }

    // buildings
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
      renderer.drawSprite(texture, x - spriteW / 2, y + HALF_H - spriteH + 2, {
        width: spriteW,
        height: spriteH,
        alpha: isHovering && !isThisHovered ? 0.3 : 1,
      });
    }
  }
}
