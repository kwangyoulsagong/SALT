import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type { CauseSnapshotRecord, CauseSnapshotStore } from "../domain";

/**
 * 원인 스냅샷(F017 v4 5a · `DB-REQ-043` FR-8) — `cause_snapshot`. 회차 하나 = `createMany` 한 문장 + `skipDuplicates`
 * (ON CONFLICT DO NOTHING — 같은 지문은 행이 늘지 않는다 · 경합도 오류 0, `prisma-database.md`). 표는 UPDATE 를 트리거가 막는다
 */
export class PrismaCauseSnapshotStore implements CauseSnapshotStore {
  async saveMany(rows: readonly CauseSnapshotRecord[]): Promise<number> {
    if (rows.length === 0) return 0;
    const result = await prisma.causeSnapshot.createMany({
      data: rows.map((r) => ({
        market: r.market,
        symbol: r.symbol,
        tradeDate: new Date(`${r.tradeDate}T00:00:00Z`),
        fingerprint: r.fingerprint,
        topKind: r.topKind,
        topStrength: r.topStrength,
        changeRate: r.changeRate,
        split: r.split === null ? Prisma.DbNull : (r.split as unknown as Prisma.InputJsonValue),
        candidates: r.candidates as unknown as Prisma.InputJsonValue,
        capturedAt: r.capturedAt,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }
}
