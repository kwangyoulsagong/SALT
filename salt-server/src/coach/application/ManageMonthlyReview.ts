import Decimal from "decimal.js";

import {
  buildMonthlyReview,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  isReviewMonthClosed,
  previousReviewMonth,
  reviewMonthWindow,
  type CoachProfileStore,
  type DailyBar,
  type DecisionOutcomeStore,
  type ForecastReader,
  type MonthlyReviewStore,
  type PortfolioProbe,
  type StoredMonthlyReview,
  type TradePlanStore,
} from "../domain";
import { loadTradeHistory } from "./lib/loadTradeHistory";

/**
 * 월간 복기 — FEATURE-009 FR-28 · FR-13 (`SRV-REQ-038` FR-10).
 *
 * 만드는 쪽(`BuildMonthlyReview`)은 월초 배치와 첫 조회가 같이 부른다. 이미 있으면 **읽기만 하고 끝난다** —
 * 저장한 복기는 고치지 않는다(W06). 계산은 `domain/policy/monthlyReview` 이고 여기는 재료만 모은다.
 *
 * 쿼리(만들 때): 복기 1 · 거래 1 · 연결 계획 1 · 일봉 1 · 결과 1 · 확률 계획 1 · 프로필 1 (+ 채점 일봉 1) · 저장 1.
 */

const OUTCOME_READ_LIMIT = 5000;
const FORECAST_PLAN_LIMIT = 2000;
const AVAILABLE_MONTHS_LIMIT = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export type BuildMonthlyReviewResult =
  | { status: "ok"; review: StoredMonthlyReview; created: boolean }
  /** 그달이 아직 안 끝났다 — 반쯤 찬 복기를 저장하면 고칠 수 없다 */
  | { status: "month_not_closed" }
  /** 그달 말까지 거래 기록이 없다 */
  | { status: "no_ledger" }
  /** 거래가 너무 많아 다 읽지 못했다 — 합을 만들지 않는다 */
  | { status: "truncated" };

export class BuildMonthlyReview {
  constructor(
    private readonly reviews: MonthlyReviewStore,
    private readonly profiles: CoachProfileStore,
    private readonly portfolio: PortfolioProbe,
    private readonly tradePlans: TradePlanStore,
    private readonly outcomes: DecisionOutcomeStore,
    private readonly forecasts: ForecastReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** `month` 가 없으면 KST 지난달 — 월초 배치가 그렇게 부른다 */
  async execute(userId: string, month?: string): Promise<BuildMonthlyReviewResult> {
    const now = this.now();
    month ??= previousReviewMonth(now);
    if (!isReviewMonthClosed(month, now)) return { status: "month_not_closed" };

    const existing = await this.reviews.find(userId, month);
    if (existing) return { status: "ok", review: existing, created: false };

    const window = reviewMonthWindow(month);
    const [history, outcomes, forecastPlans, profile] = await Promise.all([
      loadTradeHistory(
        { portfolio: this.portfolio, tradePlans: this.tradePlans, forecasts: this.forecasts },
        userId
      ),
      this.outcomes.listOwned(userId, OUTCOME_READ_LIMIT),
      this.tradePlans.listForecasted(userId, FORECAST_PLAN_LIMIT),
      this.profiles.findByUser(userId),
    ]);
    if (history.status === "truncated") return { status: "truncated" };
    if (!history.entries.some((entry) => entry.transactionDate < window.to)) return { status: "no_ledger" };

    const barsBySymbol = await this.withForecastBars(history.barsBySymbol, forecastPlans);
    const review = buildMonthlyReview({
      month,
      entries: history.entries,
      replay: history.replay,
      barsBySymbol,
      linkedPlans: history.plans.filter((plan) => plan.sampleOrigin === "live"),
      outcomes: outcomes.filter((outcome) => outcome.sampleOrigin === "live"),
      forecastPlans,
      monthlyLossBudget: profile?.monthlyLossBudget ?? null,
      maxSingleAssetWeight: new Decimal(profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT),
      now,
    });
    const stored = await this.reviews.saveIfAbsent(userId, review, now);
    return { status: "ok", review: stored, created: stored.generatedAt.getTime() === now.getTime() };
  }

  /** 거래 없는 종목에 "오를 확률"을 적었을 수 있다 — 그 종목 일봉만 더 읽는다 */
  private async withForecastBars(
    bars: Map<string, DailyBar[]>,
    plans: Array<{ symbol: string; plannedAt: Date }>
  ): Promise<Map<string, DailyBar[]>> {
    const missing = [...new Set(plans.map((plan) => plan.symbol.toUpperCase()))].filter((symbol) => !bars.has(symbol));
    if (!missing.length) return bars;
    const earliest = Math.min(...plans.map((plan) => plan.plannedAt.getTime()));
    const extra = await this.forecasts.dailyCloses(missing, new Date(earliest - 2 * DAY_MS));
    return new Map([...bars, ...extra]);
  }
}

export interface MonthlyReviewView {
  month: string;
  status: Exclude<BuildMonthlyReviewResult["status"], "ok"> | "ok";
  review: StoredMonthlyReview | null;
  /** 저장된 달(최신이 앞, 최대 12) — 지난 복기로 넘겨 보는 목록 */
  availableMonths: string[];
}

/** `GET /api/coach/review/monthly?month=` — 없으면 그 자리에서 만든다(끝난 달만) */
export class GetMonthlyReview {
  constructor(
    private readonly reviews: MonthlyReviewStore,
    private readonly build: BuildMonthlyReview,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string, month?: string): Promise<MonthlyReviewView> {
    const target = month ?? previousReviewMonth(this.now());
    const result = await this.build.execute(userId, target);
    const availableMonths = await this.reviews.listMonths(userId, AVAILABLE_MONTHS_LIMIT);
    return {
      month: target,
      status: result.status,
      review: result.status === "ok" ? result.review : null,
      availableMonths,
    };
  }
}
