import { Money } from "../../shared/domain";
import {
  adherenceMirror,
  benchmarkMirror,
  brierSummary,
  dispositionMirror,
  MIRROR_MIN_SAMPLE,
  streakMirror,
  tagCosts,
  tradeTimingMirror,
  TURNOVER_BASELINE,
  turnoverGauge,
  type AdherenceMirror,
  type BenchmarkMirror,
  type BrierSummary,
  type DecisionOutcomeStore,
  type DispositionMirror,
  type ForecastReader,
  type PortfolioProbe,
  type StreakMirror,
  type TagCost,
  type TradeTimingMirror,
  type TradePlanStore,
  type TurnoverGauge,
} from "../domain";
import { kstPeriodStarts } from "./lib/loadRiskSnapshot";
import { loadTradeHistory } from "./lib/loadTradeHistory";

/**
 * 내 거래 미러 — `GET /api/coach/mirror` (FEATURE-009 FR-12 · FR-15~19, `SRV-REQ-038` FR-9).
 *
 * 준수 라벨 · 결과 · 태그는 **배치가 저장한 것**을 읽는다(사용자 수정 포함). 처분효과 · 보유 대비는 거래와 일봉에서
 * 요청 때 센다 — 저장할 표가 없고(`DB-REQ-031` 은 결과 · 계획만), 재료 쿼리가 넷이라 요청 시 계산이 싸다.
 * 배치가 실패한 날은 전날 결과 + `outcomesComputedAt` 이 그대로 보인다.
 *
 * 연승 · 연패(FR-20) · 시간대(FR-22, 슬라이스 7)는 이미 읽은 결과 · 거래에서 센다 — 쿼리가 늘지 않는다.
 *
 * "오를 확률" 채점(FR-13, 슬라이스 6)은 적은 계획이 있을 때만 일봉을 한 번 더 읽는다(거래가 없는 종목에 적었을 수 있다).
 *
 * 쿼리: 거래 1 · 연결 계획 1 · 일봉 1 · 결과 1 · 코인 보유 1 · 확률 계획 1 (+ 채점 일봉 1).
 */

const OUTCOME_READ_LIMIT = 5000;
const FORECAST_PLAN_LIMIT = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface BehaviorMirrorView {
  status: "ok" | "truncated";
  adherence: AdherenceMirror | null;
  disposition: DispositionMirror | null;
  benchmark: BenchmarkMirror | null;
  tagCosts: TagCost[];
  turnover: { gauge: TurnoverGauge | null; baseline: typeof TURNOVER_BASELINE };
  /** 내가 적은 "오를 확률"의 채점(전 기간) */
  brier: BrierSummary;
  /** 연승 · 연패(FR-20). 원장이 잘리면 사이즈 비교만 빠진다 */
  streak: StreakMirror;
  /** 진입 시각 · 요일별 청산 성과(FR-22) */
  timing: TradeTimingMirror;
  outcomeCount: number;
  /** 결과를 만든 마지막 배치 시각. 결과가 없으면 `null` */
  outcomesComputedAt: Date | null;
  minSample: number;
  asOf: Date;
}

export class GetBehaviorMirror {
  constructor(
    private readonly portfolio: PortfolioProbe,
    private readonly tradePlans: TradePlanStore,
    private readonly outcomes: DecisionOutcomeStore,
    private readonly forecasts: ForecastReader,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** 채점할 계획 종목의 일봉 — 가장 이른 계획 이틀 전부터(기준 종가가 적은 날 전 마지막 봉이다) */
  private async forecastBars(plans: Array<{ symbol: string; plannedAt: Date }>) {
    if (!plans.length) return new Map();
    const symbols = [...new Set(plans.map((plan) => plan.symbol.toUpperCase()))];
    const earliest = Math.min(...plans.map((plan) => plan.plannedAt.getTime()));
    return this.forecasts.dailyCloses(symbols, new Date(earliest - 2 * DAY_MS));
  }

  async execute(userId: string): Promise<BehaviorMirrorView> {
    const now = this.now();
    const [history, outcomes, holdings, forecastPlans] = await Promise.all([
      loadTradeHistory(
        { portfolio: this.portfolio, tradePlans: this.tradePlans, forecasts: this.forecasts },
        userId
      ),
      this.outcomes.listOwned(userId, OUTCOME_READ_LIMIT),
      this.portfolio.listHoldings(userId, "crypto"),
      this.tradePlans.listForecasted(userId, FORECAST_PLAN_LIMIT),
    ]);
    const live = outcomes.filter((outcome) => outcome.sampleOrigin === "live");
    const brier = brierSummary(forecastPlans, await this.forecastBars(forecastPlans), now);
    const base = {
      brier,
      tagCosts: tagCosts(live),
      timing: tradeTimingMirror(live),
      outcomeCount: live.length,
      outcomesComputedAt: live.reduce<Date | null>(
        (latest, outcome) => (latest && latest > outcome.computedAt ? latest : outcome.computedAt),
        null
      ),
      minSample: MIRROR_MIN_SAMPLE,
      asOf: now,
    };

    if (history.status === "truncated") {
      return {
        ...base,
        status: "truncated",
        streak: streakMirror(live, null),
        adherence: null,
        disposition: null,
        benchmark: null,
        turnover: { gauge: null, baseline: TURNOVER_BASELINE },
      };
    }

    const totalValue = holdings.reduce(
      (sum, holding) => sum.plus(Money.krw(holding.currentValue)),
      Money.krw(0)
    );
    const yearAgo = new Date(now.getTime() - YEAR_MS);

    return {
      ...base,
      status: "ok",
      streak: streakMirror(live, history.entries),
      adherence: adherenceMirror(
        history.plans.filter((plan) => plan.sampleOrigin === "live"),
        live
      ),
      disposition: dispositionMirror(history.replay, history.barsBySymbol, live),
      benchmark: benchmarkMirror(history.entries, history.barsBySymbol, now),
      turnover: {
        // 리스크 게이지와 같은 정의(최근 365일) — 두 화면이 다른 회전율을 말하지 않게
        gauge: turnoverGauge({
          trades: history.entries.filter((entry) => entry.transactionDate >= yearAgo),
          totalValue,
          yearStart: kstPeriodStarts(now).yearStart,
          truncated: false,
        }),
        baseline: TURNOVER_BASELINE,
      },
    };
  }
}
