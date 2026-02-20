import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { Renderer } from './Renderer.js';
import { Input } from './Input.js';
import type { Scene, GameContext } from './types.js';
import {
  GRID_SIZE,
  CELL_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TICK_RATE_MS,
  TICK_RATE_S,
  MAX_ACCUMULATOR_MS,
} from './types.js';

export class Game {
  private app: Application;
  private renderer: Renderer;
  private input: Input;
  private scene: Scene | null = null;
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private errorMessage: string | null = null;

  private context: GameContext = {
    gridSize: GRID_SIZE,
    cellSize: CELL_SIZE,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    playerId: '',
  };

  constructor(app: Application) {
    this.app = app;
    this.renderer = new Renderer(app);
    this.input = new Input(this.app.canvas);
  }

  loadScene(scene: Scene, options?: { playerId?: string }): void {
    if (this.scene) {
      this.input.setScene(null);
      this.scene.destroy();
    }

    const ctx: GameContext = {
      ...this.context,
      ...(options?.playerId != null ? { playerId: options.playerId } : {}),
    };

    this.scene = scene;
    this.errorMessage = null;
    this.input.setScene(scene);
    scene.init(ctx);

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  private loop(time: number): void {
    if (!this.running) return;

    const dt = time - this.lastTime;
    this.lastTime = time;
    this.accumulator += Math.min(dt, MAX_ACCUMULATOR_MS);

    if (this.scene && !this.errorMessage) {
      try {
        while (this.accumulator >= TICK_RATE_MS) {
          this.scene.update(TICK_RATE_S);
          this.accumulator -= TICK_RATE_MS;
        }
      } catch (e) {
        this.errorMessage = e instanceof Error ? e.message : String(e);
      }

      try {
        this.renderer.clear();
        this.scene.render(this.renderer);
      } catch (e) {
        this.errorMessage = e instanceof Error ? e.message : String(e);
      }
    }

    if (this.errorMessage) {
      this.renderError(this.errorMessage);
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  private renderError(message: string): void {
    this.app.stage.removeChildren();

    const bg = new Graphics();
    bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bg.fill(0x330000);
    this.app.stage.addChild(bg);

    const title = new Text({
      text: 'Runtime Error',
      style: new TextStyle({
        fontSize: 28,
        fill: 0xff4444,
        fontFamily: 'monospace',
        fontWeight: 'bold',
      }),
    });
    title.x = 20;
    title.y = 20;
    this.app.stage.addChild(title);

    const body = new Text({
      text: message,
      style: new TextStyle({
        fontSize: 16,
        fill: 0xff8888,
        fontFamily: 'monospace',
        wordWrap: true,
        wordWrapWidth: CANVAS_WIDTH - 40,
      }),
    });
    body.x = 20;
    body.y = 60;
    this.app.stage.addChild(body);
  }
}
