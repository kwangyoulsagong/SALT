import type { DecisionOutcome as DecisionOutcomeRow, Prisma } from "@prisma/client";
import Decimal from "decimal.js";

import prisma from "../../shared/infrastructure/prisma";
import {
  ADHERENCE_LABELS,
  type AdherenceLabel,
  type DecisionOutcome,
  type DecisionOutcomeDraft,
  type DecisionOutcomeStore,
  type SampleOrigin,
} from "../domain";

/**
 * 결정 결과 저장 — `decision_outcomes` (`DB-REQ-031` FR-8~10).
 *
 * 배치가 쓰는 계산 열과 사용자가 쓰는 태그 열의 주인이 다르다. `replaceForUser` 의 update 데이터에
 * `userTags` · `userTagsConfirmedAt` 이 **없는 것**이 그 경계다.
 */

const toDecimal = (value: Prisma.Decimal): Decimal => new Decimal(value.toString());
const toDecimalOrNull = (value: Prisma.Decimal | null): Decimal | null =>
  value === null ? null : toDecimal(value);
const toAdherence = (value: string | null): AdherenceLabel | null =>
  ADHERENCE_LABELS.includes(value as AdherenceLabel) ? (value as AdherenceLabel) : null;
const toOrigin = (value: string): SampleOrigin =>
  value === "live" || value === "backtest" ? value : "synthetic";

const toDomain = (row: DecisionOutcomeRow): DecisionOutcome => ({
  id: row.id,
  userId: row.userId,
  planId: row.planId,
  closingTransactionId: row.closingTransactionId,
  symbol: row.symbol,
  openedAt: row.openedAt,
  closedAt: row.closedAt,
  holdingDays: toDecimal(row.holdingDays),
  quantity: toDecimal(row.quantity),
  netPnlKrw: toDecimal(row.netPnlKrw),
  feesKrw: toDecimal(row.feesKrw),
  netReturn: toDecimal(row.netReturn),
  rMultiple: toDecimalOrNull(row.rMultiple),
  benchmarkReturn: toDecimalOrNull(row.benchmarkReturn),
  adherenceLabel: toAdherence(row.adherenceLabel),
  autoTags: row.autoTags,
  userTags: row.userTags,
  userTagsConfirmedAt: row.userTagsConfirmedAt,
  sampleOrigin: toOrigin(row.sampleOrigin),
  computedAt: row.computedAt,
});

/** 열 정밀도(`Decimal(18, 8)`)에 맞춘다 — 넘치는 자릿수로 쓰기가 실패하지 않게 */
const ratio = (value: Decimal): string => value.toDecimalPlaces(8).toFixed();
const ratioOrNull = (value: Decimal | null): string | null => (value === null ? null : ratio(value));

const computedColumns = (draft: DecisionOutcomeDraft, computedAt: Date) => ({
  planId: draft.planId,
  symbol: draft.symbol,
  openedAt: draft.openedAt,
  closedAt: draft.closedAt,
  holdingDays: ratio(draft.holdingDays),
  quantity: draft.quantity.toFixed(),
  netPnlKrw: draft.netPnlKrw.toDecimalPlaces(10).toFixed(),
  feesKrw: draft.feesKrw.toDecimalPlaces(10).toFixed(),
  netReturn: ratio(draft.netReturn),
  rMultiple: ratioOrNull(draft.rMultiple),
  benchmarkReturn: ratioOrNull(draft.benchmarkReturn),
  adherenceLabel: draft.adherenceLabel,
  autoTags: draft.autoTags,
  sampleOrigin: draft.sampleOrigin,
  computedAt,
});

export class PrismaDecisionOutcomeStore implements DecisionOutcomeStore {
  async replaceForUser(
    userId: string,
    drafts: DecisionOutcomeDraft[],
    computedAt: Date
  ): Promise<{ written: number; removed: number }> {
    const { count: removed } = await prisma.decisionOutcome.deleteMany({
      where: {
        userId,
        closingTransactionId: { notIn: drafts.map((draft) => draft.closingTransactionId) },
      },
    });
    for (const draft of drafts) {
      await prisma.decisionOutcome.upsert({
        where: { closingTransactionId: draft.closingTransactionId },
        create: { userId, closingTransactionId: draft.closingTransactionId, ...computedColumns(draft, computedAt) },
        update: computedColumns(draft, computedAt),
      });
    }
    return { written: drafts.length, removed };
  }

  async listOwned(userId: string, limit: number): Promise<DecisionOutcome[]> {
    const rows = await prisma.decisionOutcome.findMany({
      where: { userId },
      // (user_id, closed_at DESC) 인덱스
      orderBy: [{ closedAt: "desc" }, { id: "desc" }],
      take: limit,
    });
    return rows.map(toDomain);
  }

  async confirmTags(
    userId: string,
    outcomeId: string,
    tags: string[],
    confirmedAt: Date
  ): Promise<DecisionOutcome | null> {
    const { count } = await prisma.decisionOutcome.updateMany({
      where: { id: outcomeId, userId },
      data: { userTags: tags, userTagsConfirmedAt: confirmedAt },
    });
    if (count === 0) return null;
    const row = await prisma.decisionOutcome.findFirstOrThrow({ where: { id: outcomeId, userId } });
    return toDomain(row);
  }
}
