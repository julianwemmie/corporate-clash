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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.onClick = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      if (e.button === 2) {
        this.scene?.onRightClick(e.clientX - rect.left, e.clientY - rect.top);
      } else if (e.button === 0) {
        this.scene?.onLeftClick(e.clientX - rect.left, e.clientY - rect.top);
      }
    };

    this.onMouseMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.scene?.onMouseMove(e.clientX - rect.left, e.clientY - rect.top);
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
