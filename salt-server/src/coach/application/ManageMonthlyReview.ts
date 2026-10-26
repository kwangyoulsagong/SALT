import Decimal from "decimal.js";

import {
  buildMonthlyReview,
  DEFAULT_MAX_SINGLE_ASSET_WEIGHT,
  isForecastOwner,
  isReviewMonthClosed,
  judgmentAssetClassFor,
  krTradingDays,
  krWallClock,
  KrStockJudgmentNotAvailableError,
  previousReviewMonth,
  reviewMonthWindow,
  type CoachProfileStore,
  type DailyBar,
  type DecisionOutcomeStore,
  type ForecastReader,
  type MarketProbe,
  type MonthlyReviewStore,
  type OutcomeAssetType,
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
 * 쿼리(만들 때): 복기 1 · 거래 1 · 연결 계획 1 · 일봉 1 · 결과 1 · 확률 계획 1 · 프로필 1 · 시세 1 (+ 채점 일봉 1) · 저장 1.
 *
 * ## 자산군마다 한 벌(F011 `SRV-REQ-040` FR-48)
 *
 * 코인판 · 국내판을 따로 만든다 — 거래 · 결과 · 연결 계획 · "오를 확률" 계획을 그 자산군 것만 읽는다(계획 자산군은
 * 종목 시세의 자산군, 모르면 코인 — 사이즈 점검과 같은 규칙). 국내판은 모든 시각을 KST 벽시계로 옮기고 거래일만 걷는다
 * (`domain/policy/monthlyReview` 머리 주석). 국내 화면은 소유자 전용이다(`GetMonthlyReview`) — 배치는 거르지 않고
 * 만들어 두되(국내 거래가 없으면 `no_ledger` 로 안 만든다) 보여 주는 쪽이 막는다.
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
    private readonly market: MarketProbe,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** `month` 가 없으면 KST 지난달 — 월초 배치가 그렇게 부른다. `assetType` 이 없으면 코인 */
  async execute(
    userId: string,
    month?: string,
    assetType: OutcomeAssetType = "crypto"
  ): Promise<BuildMonthlyReviewResult> {
    const now = this.now();
    month ??= previousReviewMonth(now);
    if (!isReviewMonthClosed(month, now)) return { status: "month_not_closed" };

    const existing = await this.reviews.find(userId, month, assetType);
    if (existing) return { status: "ok", review: existing, created: false };

    const kr = assetType === "kr_stock";
    const window = reviewMonthWindow(month);
    const [history, outcomes, allForecastPlans, profile] = await Promise.all([
      loadTradeHistory(
        { portfolio: this.portfolio, tradePlans: this.tradePlans, forecasts: this.forecasts },
        userId,
        assetType,
        "trades"
      ),
      this.outcomes.listOwned(userId, OUTCOME_READ_LIMIT, assetType),
      this.tradePlans.listForecasted(userId, FORECAST_PLAN_LIMIT),
      this.profiles.findByUser(userId),
    ]);
    if (history.status === "truncated") return { status: "truncated" };
    // 국내판 거래 시각은 벽시계다 — 실제 창 끝도 같은 축으로
    const windowEnd = kr ? krWallClock(window.to) : window.to;
    if (!history.entries.some((entry) => entry.transactionDate < windowEnd)) return { status: "no_ledger" };

    const forecastPlans = await this.plansOf(allForecastPlans, assetType);
    const barsBySymbol = await this.withForecastBars(history.barsBySymbol, forecastPlans);
    const live = outcomes.filter((outcome) => outcome.sampleOrigin === "live");
    const review = buildMonthlyReview({
      month,
      entries: history.entries,
      replay: history.replay,
      barsBySymbol,
      linkedPlans: history.plans.filter((plan) => plan.sampleOrigin === "live"),
      outcomes: kr ? live.map((outcome) => ({ ...outcome, closedAt: krWallClock(outcome.closedAt) })) : live,
      forecastPlans: kr
        ? forecastPlans.map((plan) => ({
            ...plan,
            plannedAt: krWallClock(plan.plannedAt),
            reviewAt: plan.reviewAt && krWallClock(plan.reviewAt),
          }))
        : forecastPlans,
      monthlyLossBudget: profile?.monthlyLossBudget ?? null,
      maxSingleAssetWeight: new Decimal(profile?.maxSingleAssetWeight ?? DEFAULT_MAX_SINGLE_ASSET_WEIGHT),
      now: kr ? krWallClock(now) : now,
      kr: kr ? { tradingDays: krTradingDays(history.barsBySymbol) } : undefined,
    });
    const stored = await this.reviews.saveIfAbsent(userId, review, now, assetType);
    return { status: "ok", review: stored, created: stored.generatedAt.getTime() === now.getTime() };
  }

  /** "오를 확률" 계획 중 이 자산군 종목 것만 — 시세의 자산군, 시세를 모르면 코인(사이즈 점검과 같은 규칙) */
  private async plansOf<T extends { symbol: string }>(plans: T[], assetType: OutcomeAssetType): Promise<T[]> {
    if (!plans.length) return plans;
    const symbols = [...new Set(plans.map((plan) => plan.symbol.toUpperCase()))];
    const quotes = await this.market.quotes(symbols).catch(() => new Map<string, { assetType: string }>());
    return plans.filter(
      (plan) => judgmentAssetClassFor(quotes.get(plan.symbol.toUpperCase())?.assetType) === assetType
    );
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
  assetType: OutcomeAssetType;
  month: string;
  status: Exclude<BuildMonthlyReviewResult["status"], "ok"> | "ok";
  review: StoredMonthlyReview | null;
  /** 저장된 달(최신이 앞, 최대 12) — 지난 복기로 넘겨 보는 목록 */
  availableMonths: string[];
  /**
   * 국내판 빗나간 예측의 종목 이름(코드 → 이름). 저장한 복기는 고치지 않으니 읽을 때 붙인다 — 청산 목록과 같은 `assetLabels`.
   * 코인판 · 실패면 빈 객체(화면은 코드 그대로)
   */
  symbolNames: Record<string, string>;
}

/**
 * `GET /api/coach/review/monthly?month=` (코인) · `GET /api/coach/review/monthly/kr-stock?month=` (국내, 소유자 전용 404)
 * — 없으면 그 자리에서 만든다(끝난 달만)
 */
export class GetMonthlyReview {
  constructor(
    private readonly reviews: MonthlyReviewStore,
    private readonly build: BuildMonthlyReview,
    /** 국내 주식을 볼 수 있는 이메일 — 시세 · 국내 미러와 같은 목록(FR-37) */
    private readonly krViewerEmails: readonly string[] = [],
    private readonly labels: Pick<MarketProbe, "assetLabels"> | null = null,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(
    userId: string,
    month?: string,
    options: { assetType?: OutcomeAssetType; viewerEmail?: string } = {}
  ): Promise<MonthlyReviewView> {
    const assetType = options.assetType ?? "crypto";
    if (assetType === "kr_stock" && !isForecastOwner(options.viewerEmail, this.krViewerEmails)) {
      throw new KrStockJudgmentNotAvailableError();
    }
    const target = month ?? previousReviewMonth(this.now());
    const result = await this.build.execute(userId, target, assetType);
    const review = result.status === "ok" ? result.review : null;
    const missSymbols = assetType === "kr_stock" && review ? review.payload.brier.recentMisses.map((miss) => miss.symbol) : [];
    const [availableMonths, labels] = await Promise.all([
      this.reviews.listMonths(userId, AVAILABLE_MONTHS_LIMIT, assetType),
      missSymbols.length && this.labels
        ? this.labels.assetLabels([...new Set(missSymbols)]).catch(() => [])
        : Promise.resolve([]),
    ]);
    return {
      assetType,
      symbolNames: Object.fromEntries(labels.map((label) => [label.symbol, label.name])),
      month: target,
      status: result.status,
      review,
      availableMonths,
    };
  }
}
