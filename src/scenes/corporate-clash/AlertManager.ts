import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type Renderer,
} from '../../engine/types.js';
import type { CorporateWorld, DamageReport, Manager } from './types.js';

export class AlertManager implements Manager {
  private savedReport: DamageReport | null = null;

  update(world: CorporateWorld): void {
    if (world.attackActive && world.uiMode.kind !== 'alert') {
      this.savedReport = world.attackActive;
      world.uiMode = { kind: 'alert' };
    }
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'alert') return;
    if (key === 'Space') {
      this.savedReport = null;
      world.uiMode = { kind: 'none' };
    }
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'alert') return;

    const report = this.savedReport;
    if (!report) return;

    renderer.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, {
      alpha: 0.5,
    });

    const alertWidth = 450;
    const alertHeight = 220;
    renderer.drawRect(
      CANVAS_WIDTH / 2 - alertWidth / 2,
      CANVAS_HEIGHT / 2 - alertHeight / 2,
      alertWidth,
      alertHeight,
      0x16213e,
      { alpha: 0.95 },
    );
    renderer.drawRect(
      CANVAS_WIDTH / 2 - alertWidth / 2,
      CANVAS_HEIGHT / 2 - alertHeight / 2,
      alertWidth,
      3,
      0xfb8000,
    );

    let title: string;
    let subtitle: string;

    if (report.isAttacker) {
      title = 'Attack Report';
      subtitle = `You attacked ${report.defender}!`;
    } else {
      title = 'Under Attack!';
      subtitle = `${report.attackerName} attacked you!`;
    }

    renderer.drawText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 85, {
      fontSize: 24,
      color: 0xfb8000,
      anchor: 0.5,
    });

    renderer.drawText(subtitle, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30, {
      fontSize: 14,
      color: 0xffffff,
      anchor: 0.5,
    });
    renderer.drawText(
      `Employees Lost: ${report.employeesLost}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      { fontSize: 14, color: 0xffffff, anchor: 0.5 },
    );
    renderer.drawText(
      `Buildings Lost: ${report.buildingsLost}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 20,
      { fontSize: 14, color: 0xffffff, anchor: 0.5 },
    );

    renderer.drawText(
      'Space bar to continue...',
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 70,
      {
        fontSize: 12,
        color: 0xffffff,
        anchor: 0.5,
      },
    );
  }
}
