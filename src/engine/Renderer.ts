import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from 'pixi.js';
import { type Renderer as IRenderer } from './types.js';

export function createOffsetRenderer(
  inner: IRenderer,
  offsetX: number,
  offsetY: number,
): IRenderer {
  return {
    get stage() {
      return inner.stage;
    },
    drawRect(pixelX, pixelY, width, height, color) {
      inner.drawRect(pixelX + offsetX, pixelY + offsetY, width, height, color);
    },
    drawText(text, pixelX, pixelY, options) {
      inner.drawText(text, pixelX + offsetX, pixelY + offsetY, options);
    },
    drawSprite(texture, pixelX, pixelY, options) {
      inner.drawSprite(texture, pixelX + offsetX, pixelY + offsetY, options);
    },
    clear() {
      inner.clear();
    },
  };
}

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
    pixelX: number,
    pixelY: number,
    width: number,
    height: number,
    color: number,
  ): void {
    const g = new Graphics();
    g.rect(pixelX, pixelY, width, height);
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
  ): void {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0, 0);
    sprite.x = pixelX;
    sprite.y = pixelY;
    sprite.width = options?.width ?? texture.width;
    sprite.height = options?.height ?? texture.height;
    this.drawContainer.addChild(sprite);
  }

  clear(): void {
    this.drawContainer.removeChildren();
  }
}
