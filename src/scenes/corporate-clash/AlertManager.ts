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
      world.attackActive = null;
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
    const alertHeight = 330;
    const cx = CANVAS_WIDTH / 2;
    const top = CANVAS_HEIGHT / 2 - alertHeight / 2;

    renderer.drawRect(
      cx - alertWidth / 2,
      top,
      alertWidth,
      alertHeight,
      0x16213e,
      { alpha: 0.95 },
    );
    renderer.drawRect(cx - alertWidth / 2, top, alertWidth, 3, 0xfb8000);

    let title: string;
    let subtitle: string;

    if (report.isAttacker) {
      title = 'Attack Report';
      subtitle = `You attacked ${report.defenderName}!`;
    } else {
      title = 'Under Attack!';
      subtitle = `${report.attackerName} attacked you!`;
    }

    let y = top + 25;
    const lineH = 22;

    renderer.drawText(title, cx, y, {
      fontSize: 24,
      color: 0xfb8000,
      anchor: 0.5,
    });
    y += lineH + 12;

    renderer.drawText(subtitle, cx, y, {
      fontSize: 14,
      color: 0xffffff,
      anchor: 0.5,
    });
    y += lineH;

    if (report.troopsSent > 0) {
      renderer.drawText(`Troops sent: ${report.troopsSent}`, cx, y, {
        fontSize: 13,
        color: 0xaaaaaa,
        anchor: 0.5,
      });
    }
    y += lineH;

    // Your losses
    const yourSide = report.isAttacker ? report.attacker : report.defender;
    renderer.drawText('Your losses:', cx, y, {
      fontSize: 13,
      color: 0xe74c3c,
      anchor: 0.5,
    });
    y += lineH - 4;
    renderer.drawText(
      `${yourSide.employeesLost} employees, ${yourSide.buildingsLost} buildings`,
      cx,
      y,
      { fontSize: 13, color: 0xffffff, anchor: 0.5 },
    );
    y += lineH + 4;

    // Their losses
    const theirSide = report.isAttacker ? report.defender : report.attacker;
    const theirName = report.isAttacker
      ? report.defenderName
      : report.attackerName;
    renderer.drawText(`${theirName}'s losses:`, cx, y, {
      fontSize: 13,
      color: 0x2ecc71,
      anchor: 0.5,
    });
    y += lineH - 4;
    renderer.drawText(
      `${theirSide.employeesLost} employees, ${theirSide.buildingsLost} buildings`,
      cx,
      y,
      { fontSize: 13, color: 0xffffff, anchor: 0.5 },
    );
    y += lineH + 4;

    // Cash stolen
    if (report.cashStolen > 0) {
      const cashText = report.isAttacker
        ? `Funds stolen: +$${report.cashStolen.toLocaleString()}`
        : `Funds lost: -$${report.cashStolen.toLocaleString()}`;
      const cashColor = report.isAttacker ? 0x2ecc71 : 0xe74c3c;
      renderer.drawText(cashText, cx, y, {
        fontSize: 14,
        color: cashColor,
        anchor: 0.5,
      });
    }

    renderer.drawText('Space bar to continue...', cx, top + alertHeight - 30, {
      fontSize: 12,
      color: 0xaaaaaa,
      anchor: 0.5,
    });
  }
}
