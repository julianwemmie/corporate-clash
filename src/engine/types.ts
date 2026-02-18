import { Container, Texture } from 'pixi.js';

// --- Game Constants ---

export const GRID_SIZE = 4;
export const CELL_SIZE = 150;
export const LEFT_PANEL_WIDTH = 200;
export const RIGHT_PANEL_WIDTH = 200;
export const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE; // 600px
export const CANVAS_WIDTH =
  GRID_SIZE * CELL_SIZE + LEFT_PANEL_WIDTH + RIGHT_PANEL_WIDTH; // 1000px
export const TICK_RATE_MS = 150; // ~6.67 ticks/sec
export const TICK_RATE_S = TICK_RATE_MS / 1000; // 0.15s per tick
export const MAX_ACCUMULATOR_MS = 1000;

// --- Interfaces ---

export interface GameContext {
  gridSize: number;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface Renderer {
  drawRect(
    pixelX: number,
    pixelY: number,
    width: number,
    height: number,
    color: number,
  ): void;
  drawText(
    text: string,
    pixelX: number,
    pixelY: number,
    options?: { fontSize?: number; color?: number; anchor?: number },
  ): void;
  drawSprite(
    texture: Texture,
    pixelX: number,
    pixelY: number,
    options?: {
      anchorX?: number;
      anchorY?: number;
      width?: number;
      height?: number;
    },
  ): void;
  clear(): void;
  readonly stage: Container;
}

export interface Scene {
  init(context: GameContext): void;
  update(dt: number): void;
  render(renderer: Renderer): void;
  onRightClick(pixelX: number, pixelY: number): void;
  onLeftClick(pixelX: number, pixelY: number): void;
  onMouseMove(pixelX: number, pixelY: number): void;
  onKeyDown(key: string): void;
  onKeyUp(key: string): void;
  destroy(): void;
}
