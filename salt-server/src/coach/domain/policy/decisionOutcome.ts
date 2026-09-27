/**
 * 결정의 결과 · 자동 실수 태그 — FEATURE-009 FR-14 · FR-18 (`SRV-REQ-038` FR-9 · W06).
 *
 * 매도 기록 한 건 = 결과 한 행. **실현된 것만** 성과에 넣는다(미실현 0건).
 *
 * ## 자동 태그는 후보다
 *
 * 서버가 붙이고 사용자가 확정 · 수정한다. 사용자가 확정하면(`userTagsConfirmedAt`) 그 태그가 쓰이고,
 * 자동 후보는 원본으로 남는다. 태그는 **매수 조각 수량의 과반**이 그 성질을 가질 때 붙는다 —
 * 조각 하나가 추격이었다고 청산 전체의 손익을 추격 비용으로 돌리지 않는다.
 *
 * | 태그 | 자동 규칙 |
 * |---|---|
 * | `chasing` | 매수가 ≥ 매수 전 48시간 5분봉 최고 종가 × 98% |
 * | `averaging_down` | 같은 종목을 들고 있을 때 그 평단(수수료 포함)보다 싸게 추가 매수 |
 * | `revenge` | 같은 종목 손실 청산 뒤 24시간 안의 재매수 |
 * | `off_plan` | 소진한 매수 어디에도 계획이 연결돼 있지 않고, 이 매도에도 계획이 없다 |
 *
 * `late_night` 과 사용자 정의 태그는 사용자만 붙인다.
 */

import Decimal from "decimal.js";

import { DomainError, ErrorKind } from "../../../shared/domain";
import { barCloseTime, type DailyBar } from "./adherence";
import type { SampleOrigin } from "./symbolJudgment";
import type { ClosingTrace, LedgerReplay } from "./tradeLedger";
import type { AdherenceLabel, TradePlan } from "./tradePlan";

const DAY_MS = 24 * 60 * 60 * 1000;
const ZERO = new Decimal(0);

export const AUTO_MISTAKE_TAGS = ["chasing", "averaging_down", "revenge", "off_plan"] as const;
export type AutoMistakeTag = (typeof AUTO_MISTAKE_TAGS)[number];
/** 사용자가 고르는 기본 태그. 여기 없는 문자열은 사용자 정의 태그다 */
export const KNOWN_MISTAKE_TAGS = [...AUTO_MISTAKE_TAGS, "late_night"] as const;

/** 추격 판정: 매수 전 이 시간의 최고 종가를 본다 */
export const CHASING_LOOKBACK_MS = 48 * 60 * 60 * 1000;
export const CHASING_THRESHOLD = new Decimal("0.98");
/** "그냥 들고 있었으면" — 청산 뒤 이 날수의 일봉 종가로 본다 */
export const HOLD_BENCHMARK_DAYS = 30;

export class DecisionOutcomeNotFoundError extends DomainError {
  constructor() {
    super("COACH_DECISION_OUTCOME_NOT_FOUND", ErrorKind.NotFound, "Decision outcome not found");
  }
}

export interface DecisionOutcome {
  id: string;
  userId: string;
  planId: string | null;
  closingTransactionId: string;
  symbol: string;
  openedAt: Date;
  closedAt: Date;
  holdingDays: Decimal;
  quantity: Decimal;
  netPnlKrw: Decimal;
  feesKrw: Decimal;
  netReturn: Decimal;
  rMultiple: Decimal | null;
  benchmarkReturn: Decimal | null;
  adherenceLabel: AdherenceLabel | null;
  autoTags: string[];
  userTags: string[];
  userTagsConfirmedAt: Date | null;
  sampleOrigin: SampleOrigin;
  computedAt: Date;
}

export type DecisionOutcomeDraft = Omit<
  DecisionOutcome,
  "id" | "userTags" | "userTagsConfirmedAt" | "computedAt"
>;

/** 사용자가 확정했으면 사용자 태그, 아니면 자동 후보 */
export const effectiveTags = (
  outcome: Pick<DecisionOutcome, "autoTags" | "userTags" | "userTagsConfirmedAt">
): string[] => (outcome.userTagsConfirmedAt ? outcome.userTags : outcome.autoTags);

export interface OutcomeInputs {
  userId: string;
  replay: LedgerReplay;
  /** 거래에 연결된 계획. 키는 거래 id */
  plansByTransaction: Map<string, TradePlan>;
  /** 매수 id → 추격 여부. 5분봉이 없어(30일 보관) 모르면 키가 없다 */
  chasingByBuy: Map<string, boolean>;
  /** 직전 회차의 자동 태그(매도 id → 태그). 추격을 이번에 모르면 직전 판정을 잇는다 */
  previousAutoTags: Map<string, string[]>;
  /** 종목별 닫힌 일봉(시간순) */
  barsBySymbol: Map<string, DailyBar[]>;
  now: Date;
}

/** 수량 과반이 `predicate` 인가. 모르는 조각이 섞여 과반을 못 가르면 `null` */
const majority = (
  closing: ClosingTrace,
  predicate: (buyId: string) => boolean | null
): boolean | null => {
  let yes = ZERO;
  let unknown = ZERO;
  for (const piece of closing.pieces) {
    const value = predicate(piece.buyTransactionId);
    if (value === null) unknown = unknown.plus(piece.quantity);
    else if (value) yes = yes.plus(piece.quantity);
  }
  const half = closing.pieces.reduce((sum, piece) => sum.plus(piece.quantity), ZERO).div(2);
  if (yes.gt(half)) return true;
  if (yes.plus(unknown).lte(half)) return false;
  return null;
};

/** 결과에 붙일 계획 — 조각 수량이 가장 큰 매수의 계획, 없으면 매도에 연결된 계획 */
const planFor = (closing: ClosingTrace, plans: Map<string, TradePlan>): TradePlan | null => {
  const byBuy = new Map<string, Decimal>();
  for (const piece of closing.pieces) {
    if (!plans.has(piece.buyTransactionId)) continue;
    byBuy.set(piece.buyTransactionId, (byBuy.get(piece.buyTransactionId) ?? ZERO).plus(piece.quantity));
  }
  let best: string | null = null;
  for (const [buyId, quantity] of byBuy) {
    if (best === null || quantity.gt(byBuy.get(best)!)) best = buyId;
  }
  return best ? plans.get(best)! : plans.get(closing.sell.id) ?? null;
};

/** `at` 을 포함하는 날부터 `days` 뒤에 닫힌 첫 일봉의 종가. 아직 없으면 `null` */
export const closeAfterDays = (bars: DailyBar[], at: Date, days: number): Decimal | null => {
  const target = at.getTime() + days * DAY_MS;
  const bar = bars.find((candidate) => barCloseTime(candidate).getTime() >= target);
  return bar ? bar.close : null;
};

export const buildDecisionOutcomes = (input: OutcomeInputs): DecisionOutcomeDraft[] =>
  input.replay.closings.map((closing) => {
    const sell = closing.sell;
    const symbol = sell.symbol.toUpperCase();
    const quantity = new Decimal(sell.quantity);
    const closedAt = sell.transactionDate;

    const openedAt = closing.pieces.reduce(
      (min, piece) => (piece.boughtAt < min ? piece.boughtAt : min),
      closedAt
    );
    const holdingDays = closing.pieces
      .reduce(
        (sum, piece) => sum.plus(piece.quantity.times(closedAt.getTime() - piece.boughtAt.getTime())),
        ZERO
      )
      .div(quantity)
      .div(DAY_MS);
    const buyFees = closing.pieces.reduce((sum, piece) => sum.plus(piece.buyFeeKrw), ZERO);
    const netReturn = closing.costKrw.gt(0) ? closing.netPnlKrw.div(closing.costKrw) : ZERO;
    const unitCost = closing.costKrw.div(quantity);

    const plan = planFor(closing, input.plansByTransaction);
    // R = 순손익 ÷ (수량 × (평단 − 손절가)). 손절가가 평단 이상이면 위험 단위가 없다 — 계산 불가
    const rMultiple =
      plan?.side === "buy" && plan.stopPrice !== null && unitCost.gt(plan.stopPrice)
        ? closing.netPnlKrw.div(quantity.times(unitCost.minus(plan.stopPrice)))
        : null;

    const later = closeAfterDays(input.barsBySymbol.get(symbol) ?? [], closedAt, HOLD_BENCHMARK_DAYS);
    const benchmarkReturn = later && unitCost.gt(0) ? later.div(unitCost).minus(1) : null;

    const lots = input.replay.lots;
    const tags: string[] = [];
    const previous = input.previousAutoTags.get(sell.id) ?? [];
    const chasing = majority(closing, (buyId) => input.chasingByBuy.get(buyId) ?? null);
    if (chasing ?? previous.includes("chasing")) tags.push("chasing");
    if (majority(closing, (buyId) => lots.get(buyId)?.averagingDown ?? false)) tags.push("averaging_down");
    if (majority(closing, (buyId) => lots.get(buyId)?.revenge ?? false)) tags.push("revenge");
    if (plan === null) tags.push("off_plan");

    return {
      userId: input.userId,
      planId: plan?.id ?? null,
      closingTransactionId: sell.id,
      symbol,
      openedAt,
      closedAt,
      holdingDays,
      quantity,
      netPnlKrw: closing.netPnlKrw,
      feesKrw: buyFees.plus(sell.fee),
      netReturn,
      rMultiple,
      benchmarkReturn,
      adherenceLabel: plan ? plan.userAdherenceLabel ?? plan.adherenceLabel : null,
      autoTags: tags,
      // 사용자가 앱에서 적은 거래에서 나온 결과다
      sampleOrigin: "live",
    };
  });

/** 추격 판정 — 매수가가 매수 전 48시간 최고 종가의 98% 이상 */
export const isChasing = (buyPrice: Decimal, highBefore: Decimal): boolean =>
  buyPrice.gte(highBefore.times(CHASING_THRESHOLD));

/** 사용자 태그 정리 — 공백 제거 · 중복 제거. 검증(길이 · 개수)은 입력 경계가 한다 */
export const normalizeTags = (tags: string[]): string[] => [
  ...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
];
