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

    renderer.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0xffffff, {
      alpha: 0.3,
    });

    const alertWidth = 450;
    const alertHeight = 220;
    renderer.drawRect(
      CANVAS_WIDTH / 2 - alertWidth / 2,
      CANVAS_HEIGHT / 2 - alertHeight / 2,
      alertWidth,
      alertHeight,
      0x000000,
      { alpha: 0.9 },
    );

    let title: string;
    let message: string;

    if (report.isAttacker) {
      title = 'Attack Report';
      message = `You attacked ${report.defender}! You lost ${report.employeesLost} employees. They lost ${report.buildingsLost} buildings.`;
    } else {
      title = 'Under Attack!';
      message = `${report.attackerName} attacked you! You lost ${report.employeesLost} employees and ${report.buildingsLost} buildings.`;
    }

    renderer.drawText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 85, {
      fontSize: 24,
      color: 0xffffff,
      anchor: 0.5,
    });

    renderer.drawText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10, {
      fontSize: 14,
      color: 0xffffff,
      anchor: 0.5,
    });

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
