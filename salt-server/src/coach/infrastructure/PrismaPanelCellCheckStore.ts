import prisma from "../../shared/infrastructure/prisma";
import type { PanelCellCheckRow, PanelCellCheckStore } from "../domain";

/** 패널 칸 채움 실측(OPS-004) — `panel_cell_check`. 회차 하나 = `createMany` 한 문장 */
export class PrismaPanelCellCheckStore implements PanelCellCheckStore {
  async latestRunSymbols(): Promise<Set<string>> {
    const latest = await prisma.panelCellCheck.findFirst({ orderBy: { runAt: "desc" }, select: { runAt: true } });
    if (!latest) return new Set();
    const rows = await prisma.panelCellCheck.findMany({
      where: { runAt: latest.runAt },
      select: { symbol: true },
      distinct: ["symbol"],
      // 추적 종목 상한(코인 100 + 국내 수십) — 칸 11 이라 회차당 2천 행 안쪽
      take: 5000,
    });
    return new Set(rows.map((r) => r.symbol));
  }

  async saveRun(runAt: Date, rows: readonly PanelCellCheckRow[]): Promise<number> {
    if (rows.length === 0) return 0;
    const result = await prisma.panelCellCheck.createMany({
      data: rows.map((r) => ({
        runAt,
        market: r.market,
        symbol: r.symbol,
        cellKey: r.cellKey,
        tier: r.tier,
        stale: r.stale,
        newSymbol: r.newSymbol,
      })),
    });
    return result.count;
  }

  async pruneBefore(before: Date): Promise<number> {
    const result = await prisma.panelCellCheck.deleteMany({ where: { runAt: { lt: before } } });
    return result.count;
  }
}
