import { CANVAS_HEIGHT, CANVAS_WIDTH, Renderer } from '../../engine/types';
import { CorporateWorld, Manager } from './types';

export class AlertManager implements Manager {
  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'alert') return;
    if (key === 'Space') {
      world.uiMode = { kind: 'none' };
      world.attackActive = null;
    }
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'alert') return;
    renderer.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0xffffff, {
      alpha: 0.3,
    });

    const alertWidth = 450;
    const alertHeight = 200;
    renderer.drawRect(
      CANVAS_WIDTH / 2 - alertWidth / 2,
      CANVAS_HEIGHT / 2 - alertHeight / 2,
      alertWidth,
      alertHeight,
      0x000000,
      { alpha: 0.9 },
    );

    const alertTitle = 'Attack!';
    renderer.drawText(alertTitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 85, {
      fontSize: 24,
      color: 0xffffff,
      anchor: 0.5,
    });

    const alertMessage = `You have been attacked by a rival company! Damage Report: Employees Lost ${world.attackActive?.employeesLost} Buildings Lost ${world.attackActive?.buildingsLost}`;
    renderer.drawText(alertMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10, {
      fontSize: 14,
      color: 0xffffff,
      anchor: 0.5,
    });

    const alertSubMessage = 'Space bar to continue...';
    renderer.drawText(
      alertSubMessage,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 60,
      { fontSize: 12, color: 0xffffff, anchor: 0.5 },
    );
  }
}
