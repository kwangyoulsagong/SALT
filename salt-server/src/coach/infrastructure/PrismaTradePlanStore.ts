import type { Prisma, TradePlan as TradePlanRow } from "@prisma/client";
import Decimal from "decimal.js";

import prisma from "../../shared/infrastructure/prisma";
import {
  ADHERENCE_LABELS,
  type AdherenceLabel,
  type SampleOrigin,
  type TradePlan,
  type TradePlanDraft,
  type TradePlanPatch,
  type TradePlanStore,
} from "../domain";

/**
 * 거래 계획 저장 — `trade_plans` (`DB-REQ-031`).
 *
 * 모든 쿼리에 `userId` 가 들어간다. 남의 계획 id 로 부르면 "없음"이다 — 존재를 알리지 않는다.
 */

const toDecimal = (value: Prisma.Decimal | null): Decimal | null =>
  value === null ? null : new Decimal(value.toString());

const toAdherence = (value: string | null): AdherenceLabel | null =>
  ADHERENCE_LABELS.includes(value as AdherenceLabel) ? (value as AdherenceLabel) : null;

/** CHECK 제약이 세 값만 허용한다. 모르는 값이 오면 실측으로 세지 않도록 `synthetic` 으로 본다 */
const toOrigin = (value: string): SampleOrigin =>
  value === "live" || value === "backtest" ? value : "synthetic";

const toDomain = (row: TradePlanRow): TradePlan => ({
  id: row.id,
  userId: row.userId,
  transactionId: row.transactionId,
  symbol: row.symbol,
  side: row.side === "sell" ? "sell" : "buy",
  stopPrice: toDecimal(row.stopPrice),
  targetPrice: toDecimal(row.targetPrice),
  plannedQuantity: toDecimal(row.plannedQuantity),
  thesis: row.thesis,
  invalidation: row.invalidation,
  reviewAt: row.reviewAt,
  probabilityUp: toDecimal(row.probabilityUp),
  plannedAt: row.plannedAt,
  sampleOrigin: toOrigin(row.sampleOrigin),
  adherenceLabel: toAdherence(row.adherenceLabel),
  adherenceEvaluatedAt: row.adherenceEvaluatedAt,
  userAdherenceLabel: toAdherence(row.userAdherenceLabel),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const decimalField = (value: Decimal | null | undefined) =>
  value === undefined ? undefined : value === null ? null : value.toFixed();

export class PrismaTradePlanStore implements TradePlanStore {
  async create(draft: TradePlanDraft): Promise<TradePlan> {
    const row = await prisma.tradePlan.create({
      data: {
        userId: draft.userId,
        transactionId: draft.transactionId,
        symbol: draft.symbol,
        side: draft.side,
        stopPrice: decimalField(draft.stopPrice),
        targetPrice: decimalField(draft.targetPrice),
        plannedQuantity: decimalField(draft.plannedQuantity),
        thesis: draft.thesis,
        invalidation: draft.invalidation,
        reviewAt: draft.reviewAt,
        probabilityUp: decimalField(draft.probabilityUp),
        plannedAt: draft.plannedAt,
        sampleOrigin: draft.sampleOrigin,
      },
    });
    return toDomain(row);
  }

  async findOwned(userId: string, planId: string): Promise<TradePlan | null> {
    const row = await prisma.tradePlan.findFirst({ where: { id: planId, userId } });
    return row ? toDomain(row) : null;
  }

  async listOwned(
    userId: string,
    query: { symbol?: string; limit: number }
  ): Promise<TradePlan[]> {
    const rows = await prisma.tradePlan.findMany({
      where: { userId, ...(query.symbol ? { symbol: query.symbol } : {}) },
      // (user_id, symbol, planned_at DESC) 인덱스. 종목 없는 조회는 user_id 접두사만 탄다
      orderBy: [{ plannedAt: "desc" }, { id: "desc" }],
      take: query.limit,
    });
    return rows.map(toDomain);
  }

  /**
   * 소유 확인과 수정이 한 문장이다. `requireUnlinked` 면 "아직 거래에 연결 안 됨"도 같은 문장의 조건이다 —
   * 검사와 쓰기 사이에 다른 요청이 연결해도 잠금이 뚫리지 않는다. 조건에 걸리면 `null`.
   */
  async update(
    userId: string,
    planId: string,
    patch: TradePlanPatch,
    guard: { requireUnlinked: boolean }
  ): Promise<TradePlan | null> {
    const { count } = await prisma.tradePlan.updateMany({
      where: { id: planId, userId, ...(guard.requireUnlinked ? { transactionId: null } : {}) },
      data: {
        transactionId: patch.transactionId,
        stopPrice: decimalField(patch.stopPrice),
        targetPrice: decimalField(patch.targetPrice),
        plannedQuantity: decimalField(patch.plannedQuantity),
        thesis: patch.thesis,
        invalidation: patch.invalidation,
        reviewAt: patch.reviewAt,
        probabilityUp: decimalField(patch.probabilityUp),
      },
    });
    if (count === 0) return null;
    const row = await prisma.tradePlan.findFirstOrThrow({ where: { id: planId, userId } });
    return toDomain(row);
  }
}
