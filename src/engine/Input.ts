import type { Scene } from "./types.js";

const GAME_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
]);

export class Input {
  private scene: Scene | null = null;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, cellSize: number) {
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

    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const col = Math.floor((e.clientX - rect.left) / cellSize);
      const row = Math.floor((e.clientY - rect.top) / cellSize);
      this.scene?.onMouseMove(col, row);
    });

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  setScene(scene: Scene | null): void {
    this.scene = scene;
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
