// --- Game Constants ---

export const GRID_SIZE = 4;
export const CELL_SIZE = 150;
export const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE; // 600px
export const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE; // 600px
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
    gridX: number,
    gridY: number,
    widthCells: number,
    heightCells: number,
    color: number
  ): void;
  drawText(
    text: string,
    pixelX: number,
    pixelY: number,
    options?: { fontSize?: number; color?: number; anchor?: number }
  ): void;
  clear(): void;
  readonly stage: import("pixi.js").Container;
}

export interface Scene {
  init(context: GameContext): void;
  update(dt: number): void;
  render(renderer: Renderer): void;
  onRightClick(gridCol: number, gridRow: number): void;
  onLeftClick(gridCol: number, gridRow: number): void;
  onMouseMove(gridCol: number, gridRow: number): void;
  onKeyDown(key: string): void;
  onKeyUp(key: string): void;
  destroy(): void;
}
