import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type { JudgmentLedgerDraft, JudgmentLedgerStore } from "../domain";
import { ledgerKey } from "../domain";

/**
 * 예측 원장 (`judgment_ledger`) — 쓰기만. 읽는 쪽은 `salt-forecast`(규칙 IC)다.
 * 표본 출처는 늘 `live` 다 — 워커가 실시간으로 낸 판단만 여기 온다.
 */
export class PrismaJudgmentLedgerStore implements JudgmentLedgerStore {
  async publishedOn(asOfDate: Date): Promise<Set<string>> {
    const rows = await prisma.judgmentLedgerEntry.findMany({
      where: { asOfDate },
      select: { symbol: true, mode: true },
    });
    return new Set(rows.map((row) => ledgerKey(row.symbol, row.mode === "scalp" ? "scalp" : "long_term")));
  }

  async saveEntries(drafts: JudgmentLedgerDraft[]): Promise<number> {
    if (drafts.length === 0) return 0;
    const result = await prisma.judgmentLedgerEntry.createMany({
      data: drafts.map((draft) => ({
        symbol: draft.symbol,
        mode: draft.mode,
        asOfDate: draft.asOfDate,
        decidedAt: draft.decidedAt,
        ruleVersion: draft.ruleVersion,
        score: draft.score,
        action: draft.action,
        components: draft.components as unknown as Prisma.InputJsonValue,
        materials: draft.materials as unknown as Prisma.InputJsonValue,
        missingData: draft.missingData,
        regime: draft.regime,
        entryPrice: draft.entryPrice,
        entryObservedAt: draft.entryObservedAt,
        sampleOrigin: "live",
      })),
      skipDuplicates: true,
    });
    return result.count;
  }
}
