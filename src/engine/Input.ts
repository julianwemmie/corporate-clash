import type { Scene } from './types.js';

const GAME_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
]);

export class Input {
  private scene: Scene | null = null;
  private canvas: HTMLCanvasElement;
  private onClick: (e: MouseEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, cellSize: number) {
    this.canvas = canvas;

    this.onClick = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const col = Math.floor((e.clientX - rect.left) / cellSize);
      const row = Math.floor((e.clientY - rect.top) / cellSize);

      if (e.button === 2) {
        this.scene?.onRightClick(col, row);
      } else if (e.button === 0) {
        this.scene?.onLeftClick(col, row);
      }
    };

    this.onMouseMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const col = Math.floor((e.clientX - rect.left) / cellSize);
      const row = Math.floor((e.clientY - rect.top) / cellSize);
      this.scene?.onMouseMove(col, row);
    };

    this.onKeyDown = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
      }
      this.scene?.onKeyDown(e.code);
    };

    this.onKeyUp = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) {
        e.preventDefault();
      }
      this.scene?.onKeyUp(e.code);
    };

    this.canvas.addEventListener('pointerdown', this.onClick);
    this.canvas.addEventListener('pointermove', this.onMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  setScene(scene: Scene | null): void {
    this.scene = scene;
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('pointermove', this.onMouseMove);
  }
}
