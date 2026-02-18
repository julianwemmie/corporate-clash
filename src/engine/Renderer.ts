import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Renderer as IRenderer } from './types.js';
import { CELL_SIZE } from './types.js';

export class Renderer implements IRenderer {
  private app: Application;
  private drawContainer: Container;

  get stage(): Container {
    return this.app.stage;
  }

  constructor(app: Application) {
    this.app = app;
    this.drawContainer = new Container();
    this.app.stage.addChild(this.drawContainer);
  }

  drawRect(
    gridX: number,
    gridY: number,
    widthCells: number,
    heightCells: number,
    color: number,
  ): void {
    const g = new Graphics();
    g.rect(
      gridX * CELL_SIZE,
      gridY * CELL_SIZE,
      widthCells * CELL_SIZE,
      heightCells * CELL_SIZE,
    );
    g.fill(color);
    this.drawContainer.addChild(g);
  }

  drawText(
    text: string,
    pixelX: number,
    pixelY: number,
    options?: { fontSize?: number; color?: number; anchor?: number },
  ): void {
    const style = new TextStyle({
      fontSize: options?.fontSize ?? 24,
      fill: options?.color ?? 0xffffff,
      fontFamily: 'monospace',
    });
    const t = new Text({ text, style });
    t.anchor.set(options?.anchor ?? 0, 0);
    t.x = pixelX;
    t.y = pixelY;
    this.drawContainer.addChild(t);
  }

  clear(): void {
    this.drawContainer.removeChildren();
  }
}
