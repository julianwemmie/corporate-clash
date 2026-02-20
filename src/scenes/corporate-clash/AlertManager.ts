import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type Renderer,
} from '../../engine/types.js';
import type { CorporateWorld, Manager } from './types.js';

export class AlertManager implements Manager {
  update(world: CorporateWorld): void {
    if (world.attackActive && world.uiMode.kind !== 'alert') {
      world.uiMode = { kind: 'alert' };
    }
  }

  onKeyDown(world: CorporateWorld, key: string): void {
    if (world.uiMode.kind !== 'alert') return;
    if (key === 'Space') {
      world.uiMode = { kind: 'none' };
    }
  }

  render(world: CorporateWorld, renderer: Renderer): void {
    if (world.uiMode.kind !== 'alert') return;

    renderer.drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0xffffff, { alpha: 0.3 });

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

    const report = world.attackActive;
    if (!report) return;

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
      fontSize: 24, color: 0xffffff, anchor: 0.5,
    });

    renderer.drawText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10, {
      fontSize: 14, color: 0xffffff, anchor: 0.5,
    });

    renderer.drawText('Space bar to continue...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70, {
      fontSize: 12, color: 0xffffff, anchor: 0.5,
    });
  }
}
