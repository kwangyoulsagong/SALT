import Decimal from "decimal.js";

import {
  buildDecisionOutcomes,
  CHASING_LOOKBACK_MS,
  isChasing,
  judgeAdherence,
  type AdherenceLabel,
  type DecisionOutcomeStore,
  type ForecastReader,
  type MarketProbe,
  type PortfolioProbe,
  type TradePlan,
  type TradePlanStore,
} from "../domain";
import { loadTradeHistory } from "./lib/loadTradeHistory";

/**
 * 준수 판정 · 결정 결과 배치 — FEATURE-009 FR-11 · FR-14 · FR-18 (`SRV-REQ-038` FR-9).
 *
 * 사용자 한 명의 거래 전체를 되감아 (1) 연결된 매수 계획마다 준수 라벨, (2) 매도마다 결과 · 자동 태그를 **다시** 만든다.
 * 멱등이다 — 같은 입력이면 같은 행. 수동 입력이라 늦게 적은 매도 · 고친 거래도 다음 회차에 반영된다.
 * 사용자가 고친 라벨 · 확정한 태그는 덮지 않는다(저장소 경계).
 *
 * 규칙은 전부 `domain/policy`(`adherence` · `decisionOutcome` · `tradeLedger`)에 있고 여기는 순서만 잡는다.
 */

/** 5분봉 보관(30일)보다 하루 짧게 — 경계에서 반쯤 지워진 구간으로 "추격 아님"을 내지 않게 */
const CHASING_DATA_WINDOW_MS = 29 * 24 * 60 * 60 * 1000;
const OUTCOME_READ_LIMIT = 5000;
const CHASING_QUERY_CONCURRENCY = 5;

export interface EvaluateTradeDecisionsResult {
  status: "ok" | "truncated";
  outcomes: number;
  removed: number;
  /** 라벨별 계획 수. `null` 키는 판정 불가 */
  labels: Record<AdherenceLabel | "none", number>;
  unmatchedSells: number;
  /** 5분봉이 없어 추격을 판정하지 못한 매수 수 */
  chasingUnknown: number;
}

export class EvaluateTradeDecisions {
  constructor(
    private readonly portfolio: PortfolioProbe,
    private readonly tradePlans: TradePlanStore,
    private readonly outcomes: DecisionOutcomeStore,
    private readonly forecasts: ForecastReader,
    private readonly market: MarketProbe,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string): Promise<EvaluateTradeDecisionsResult> {
    const now = this.now();
    const labels: EvaluateTradeDecisionsResult["labels"] = {
      honored: 0,
      stop_not_honored: 0,
      stop_slipped: 0,
      size_exceeded: 0,
      none: 0,
    };
    const history = await loadTradeHistory(
      { portfolio: this.portfolio, tradePlans: this.tradePlans, forecasts: this.forecasts },
      userId
    );
    if (history.status === "truncated") {
      return { status: "truncated", outcomes: 0, removed: 0, labels, unmatchedSells: 0, chasingUnknown: 0 };
    }
    const { replay, plans, barsBySymbol } = history;

    // 1. 준수 판정 — 결과가 계획 라벨을 싣기 때문에 먼저
    const judged: TradePlan[] = [];
    const judgements = plans.map((plan) => {
      const judgement = judgeAdherence(
        plan,
        plan.transactionId ? replay.lots.get(plan.transactionId) : undefined,
        barsBySymbol.get(plan.symbol) ?? [],
        now
      );
      labels[judgement.label ?? "none"] += 1;
      judged.push({ ...plan, adherenceLabel: judgement.label });
      return { planId: plan.id, label: judgement.label };
    });
    await this.tradePlans.saveAdherence(userId, judgements, now);

    // 같은 거래에 계획이 여럿이면 나중에 적은 것(목록이 오래된 순)
    const plansByTransaction = new Map(judged.map((plan) => [plan.transactionId!, plan]));

    // 2. 추격 — 청산에 쓰인 매수 중 5분봉이 남은 것만
    const buyIds = new Set(replay.closings.flatMap((closing) => closing.pieces.map((piece) => piece.buyTransactionId)));
    const recentBuys = [...buyIds]
      .map((id) => replay.lots.get(id)!.buy)
      .filter((buy) => now.getTime() - buy.transactionDate.getTime() <= CHASING_DATA_WINDOW_MS);
    const chasingByBuy = new Map<string, boolean>();
    for (let i = 0; i < recentBuys.length; i += CHASING_QUERY_CONCURRENCY) {
      await Promise.all(
        recentBuys.slice(i, i + CHASING_QUERY_CONCURRENCY).map(async (buy) => {
          const at = buy.transactionDate;
          const high = await this.market.highestCloseBetween(
            buy.symbol,
            new Date(at.getTime() - CHASING_LOOKBACK_MS),
            at
          );
          if (high !== null) chasingByBuy.set(buy.id, isChasing(new Decimal(buy.price), new Decimal(high)));
        })
      );
    }

    // 3. 결과
    const previous = await this.outcomes.listOwned(userId, OUTCOME_READ_LIMIT);
    const drafts = buildDecisionOutcomes({
      userId,
      replay,
      plansByTransaction,
      chasingByBuy,
      previousAutoTags: new Map(previous.map((outcome) => [outcome.closingTransactionId, outcome.autoTags])),
      barsBySymbol,
      now,
    });
    const { written, removed } = await this.outcomes.replaceForUser(userId, drafts, now);

    return {
      status: "ok",
      outcomes: written,
      removed,
      labels,
      unmatchedSells: replay.unmatchedSellIds.length,
      chasingUnknown: buyIds.size - chasingByBuy.size,
    };
  }
}
