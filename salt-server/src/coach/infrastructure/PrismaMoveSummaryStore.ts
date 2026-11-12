import prisma from "../../shared/infrastructure/prisma";
import type { MoveAsset, MoveSummaryRecord, MoveSummaryStore, StoredMoveSummary } from "../domain";

/** 거래일 문자열(KST `YYYY-MM-DD`) → date 열 값. 시각 0 의 UTC 로 두면 Postgres date 가 같은 날이다 */
const dateValue = (date: string): Date => new Date(`${date}T00:00:00Z`);

/**
 * 오늘 등락 한 줄 스냅샷(`DB-REQ-041` FR-8). 읽기는 그날 행 전부 한 번(인덱스 `move_explanation_day_idx` — 종목 · 하루 시도 상한 4라 몇 행).
 * 쓰기는 `ON CONFLICT DO NOTHING` 한 문장(경합은 오류가 안 나게, `prisma-database.md`)
 */
export class PrismaMoveSummaryStore implements MoveSummaryStore {
  async day(asset: MoveAsset, symbol: string, date: string, fingerprint: string) {
    const rows = await prisma.moveExplanation.findMany({
      where: { assetClass: asset, symbol, tradeDate: dateValue(date) },
      orderBy: { generatedAt: "desc" },
      select: { fingerprint: true, gate: true, text: true, citations: true, generatedAt: true },
      take: 50,
    });
    const toStored = (r: (typeof rows)[number]): StoredMoveSummary => ({
      fingerprint: r.fingerprint,
      gate: r.gate as StoredMoveSummary["gate"],
      text: r.text,
      citations: r.citations,
      generatedAt: r.generatedAt,
    });
    const current = rows.find((r) => r.fingerprint === fingerprint);
    const latestOk = rows.find((r) => r.gate === "ok");
    return { current: current ? toStored(current) : null, latestOk: latestOk ? toStored(latestOk) : null, attempts: rows.length };
  }

  async save(r: MoveSummaryRecord): Promise<boolean> {
    const inserted = await prisma.moveExplanation.createMany({
      data: [
        {
          assetClass: r.asset,
          symbol: r.symbol,
          tradeDate: dateValue(r.date),
          fingerprint: r.fingerprint,
          gate: r.gate,
          text: r.text,
          citations: r.citations,
          factCount: r.factCount,
          rejections: r.rejections,
          provider: r.provider,
          model: r.model,
          promptVersion: r.promptVersion,
          verifierVersion: r.verifierVersion,
          generatedAt: r.generatedAt,
        },
      ],
      skipDuplicates: true,
    });
    return inserted.count > 0;
  }
}
