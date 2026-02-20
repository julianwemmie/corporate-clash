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
    drawRect(pixelX, pixelY, width, height, color, options) {
      inner.drawRect(
        pixelX + offsetX,
        pixelY + offsetY,
        width,
        height,
        color,
        options,
      );
    },
    drawText(text, pixelX, pixelY, options) {
      inner.drawText(text, pixelX + offsetX, pixelY + offsetY, options);
    },
    drawSprite(texture, pixelX, pixelY, options) {
      inner.drawSprite(texture, pixelX + offsetX, pixelY + offsetY, options);
    },
    drawDiamond(centerX, centerY, width, height, color, options) {
      inner.drawDiamond(
        centerX + offsetX,
        centerY + offsetY,
        width,
        height,
        color,
        options,
      );
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
    options?: { alpha?: number },
  ): void {
    const g = new Graphics();
    g.rect(pixelX, pixelY, width, height);
    g.fill({ color, alpha: options?.alpha ?? 1 });
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
      alpha?: number;
    },
  ): void {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0, 0);
    sprite.x = pixelX;
    sprite.y = pixelY;
    sprite.width = options?.width ?? texture.width;
    sprite.height = options?.height ?? texture.height;
    sprite.alpha = options?.alpha ?? 1;
    this.drawContainer.addChild(sprite);
  }

  drawDiamond(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    color: number,
    options?: { alpha?: number },
  ): void {
    const halfW = width / 2;
    const halfH = height / 2;
    const g = new Graphics();
    g.poly([
      centerX,
      centerY - halfH,
      centerX + halfW,
      centerY,
      centerX,
      centerY + halfH,
      centerX - halfW,
      centerY,
    ]);
    g.fill({ color, alpha: options?.alpha ?? 1 });
    this.drawContainer.addChild(g);
  }

  clear(): void {
    this.drawContainer.removeChildren();
  }
}
