import {
  adherenceMirror,
  chaseMirror,
  lossAsymmetryMirror,
  streakMirror,
  tagCosts,
  tradeTimingMirror,
  dispositionMirror,
  isForecastOwner,
  krClosingHoldings,
  krTradingDays,
  krTurnoverMirror,
  krWallClock,
  KR_LOTTERY_BUY_WINDOW_DAYS,
  KR_LOTTERY_MIN_RETURNS,
  KR_RETURN_BREAK_BOUNDS,
  KrStockJudgmentNotAvailableError,
  lotteryMirror,
  lotteryWindowFor,
  MIRROR_MIN_SAMPLE,
  nextDaySellMirror,
  replayLedger,
  sortLedgerAscending,
  toKrTradingClock,
  CHASE_BASELINE,
  LOTTERY_EVIDENCE,
  NEXT_DAY_SELL_BASELINE,
  TURNOVER_BASELINE,
  type AdherenceMirror,
  type ChaseMirror,
  type DecisionOutcomeStore,
  type DispositionMirror,
  type LossAsymmetryMirror,
  type StreakMirror,
  type TagCost,
  type TradePlanStore,
  type TradeTimingMirror,
  type ForecastReader,
  type KrReturnProfile,
  type KrTurnoverMirror,
  type LotteryMirror,
  type MarketProbe,
  type NextDaySellMirror,
  type PortfolioProbe,
} from "../domain";
import { TRADE_HISTORY_LIMIT } from "./lib/loadTradeHistory";

/**
 * 국내 주식 행동 미러 — `GET /api/coach/mirror/kr-stock` (F011 `SRV-REQ-040` FR-47).
 *
 * 코인 미러(`GetBehaviorMirror`)와 따로다 — 예측과 같은 "같은 엔진, 다른 데이터": 국내 거래만 읽고, 창은 거래일이다.
 * 네 지표(회전율 · 처분효과 · 추격 · 복권형)는 요청 때 거래와 일봉에서 센다. 준수 · 태그 · 연승 · 시간대 · 손실 비대칭은
 * 판정 배치가 국내 회차로 저장한 결과(`decision_outcomes` 중 국내 청산)를 읽는다 — 코인 미러와 같은 규칙.
 *
 * 소유자 전용 — 추격 · 복권형이 국내 시세에서 나온 숫자다(시세 경로와 같은 `FORECAST_OWNER_EMAILS`, FR-37).
 *
 * 쿼리: 거래 1 · 연결 계획 1 · 국내 결과 1 · 일봉 1 · 복권형 단면 ≤ 13(최근 1년 매수 달, 구간마다 0.5초 · 어댑터가 캐시).
 */

/** 40거래일 앞 종가까지 — 추석 · 설 연휴를 넣어도 40거래일은 70일 안이다 */
const CHASE_BARS_LEAD_MS = 100 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** 단면 조회 동시 수 — 순차 스캔이라 DB 를 한꺼번에 누르지 않는다 */
const SECTION_CONCURRENCY = 2;
const OUTCOME_READ_LIMIT = 5000;
const LINKED_PLAN_LIMIT = 5000;

export interface KrBehaviorMirrorView {
  status: "ok" | "truncated";
  turnover: { mirror: KrTurnoverMirror | null; baseline: typeof TURNOVER_BASELINE };
  disposition: DispositionMirror | null;
  nextDaySell: { mirror: NextDaySellMirror | null; baseline: typeof NEXT_DAY_SELL_BASELINE };
  chase: { mirror: ChaseMirror | null; baseline: typeof CHASE_BASELINE };
  lottery: { mirror: LotteryMirror | null; evidence: typeof LOTTERY_EVIDENCE };
  /** 배치 결과 기반 — 코인 미러와 같은 모양. 원장이 잘리면 준수율만 `null`, 나머지는 저장된 결과로 센다 */
  adherence: AdherenceMirror | null;
  tagCosts: TagCost[];
  streak: StreakMirror;
  timing: TradeTimingMirror;
  lossAsymmetry: LossAsymmetryMirror;
  outcomeCount: number;
  outcomesComputedAt: Date | null;
  tradeCount: number;
  minSample: number;
  asOf: Date;
}

export class GetKrBehaviorMirror {
  constructor(
    private readonly portfolio: PortfolioProbe,
    private readonly forecasts: ForecastReader,
    private readonly market: MarketProbe,
    private readonly tradePlans: TradePlanStore,
    private readonly outcomes: DecisionOutcomeStore,
    /** 국내 주식을 볼 수 있는 이메일 — 시세 경로와 같은 목록 */
    private readonly krViewerEmails: readonly string[] = [],
    private readonly now: () => Date = () => new Date()
  ) {}

  private async sections(windows: ReturnType<typeof lotteryWindowFor>[]): Promise<Map<string, KrReturnProfile[]>> {
    const result = new Map<string, KrReturnProfile[]>();
    for (let i = 0; i < windows.length; i += SECTION_CONCURRENCY) {
      await Promise.all(
        windows.slice(i, i + SECTION_CONCURRENCY).map(async (window) => {
          result.set(
            window.key,
            await this.market.krDailyReturnProfiles(window.from, window.to, KR_LOTTERY_MIN_RETURNS, KR_RETURN_BREAK_BOUNDS)
          );
        })
      );
    }
    return result;
  }

  async execute(query: { userId: string; viewerEmail?: string }): Promise<KrBehaviorMirrorView> {
    if (!isForecastOwner(query.viewerEmail, this.krViewerEmails)) throw new KrStockJudgmentNotAvailableError();
    const now = this.now();
    const [ledger, stored, linked] = await Promise.all([
      this.portfolio.listLedgerSince(query.userId, new Date(0), TRADE_HISTORY_LIMIT, ["kr_stock"]),
      this.outcomes.listOwned(query.userId, OUTCOME_READ_LIMIT, "kr_stock"),
      this.tradePlans.listLinked(query.userId, LINKED_PLAN_LIMIT),
    ]);
    const live = stored.filter((outcome) => outcome.sampleOrigin === "live");
    const base = {
      turnover: { mirror: null, baseline: TURNOVER_BASELINE },
      disposition: null,
      nextDaySell: { mirror: null, baseline: NEXT_DAY_SELL_BASELINE },
      chase: { mirror: null, baseline: CHASE_BASELINE },
      lottery: { mirror: null, evidence: LOTTERY_EVIDENCE },
      tagCosts: tagCosts(live),
      timing: tradeTimingMirror(live),
      lossAsymmetry: lossAsymmetryMirror(live),
      outcomeCount: live.length,
      outcomesComputedAt: live.reduce<Date | null>(
        (latest, outcome) => (latest && latest > outcome.computedAt ? latest : outcome.computedAt),
        null
      ),
      minSample: MIRROR_MIN_SAMPLE,
      asOf: now,
    };

    if (ledger.truncated) {
      return { ...base, status: "truncated", adherence: null, streak: streakMirror(live, null), tradeCount: 0 };
    }
    const entryIds = new Set(ledger.entries.map((entry) => entry.id));
    const plans = linked.filter(
      (plan) => plan.sampleOrigin === "live" && plan.transactionId !== null && entryIds.has(plan.transactionId)
    );

    const entries = sortLedgerAscending(toKrTradingClock(ledger.entries));
    const symbols = [...new Set(entries.map((entry) => entry.symbol))];
    // 일봉 `openTime` 은 KST 날짜 00:00 UTC — 벽시계로 옮긴 거래 시각과 같은 축이다
    const from = entries.length ? new Date(entries[0].transactionDate.getTime() - CHASE_BARS_LEAD_MS) : now;
    const barsBySymbol = await this.forecasts.dailyCloses(symbols, from);
    const tradingDays = krTradingDays(barsBySymbol);
    const replay = replayLedger(entries);

    const buys = entries.filter((entry) => entry.side === "buy");
    const buyWindowStart = krWallClock(now).getTime() - KR_LOTTERY_BUY_WINDOW_DAYS * DAY_MS;
    const recentBuys = buys.filter((buy) => buy.transactionDate.getTime() >= buyWindowStart);
    const windows = new Map(recentBuys.map((buy) => lotteryWindowFor(buy.transactionDate)).map((window) => [window.key, window]));

    return {
      ...base,
      status: "ok",
      tradeCount: entries.length,
      adherence: adherenceMirror(plans, live),
      // 연승 뒤 매수 금액은 실제 시각 원장으로 — 결과의 청산 시각과 같은 축
      streak: streakMirror(live, sortLedgerAscending(ledger.entries)),
      turnover: { mirror: krTurnoverMirror(entries, barsBySymbol, tradingDays, now), baseline: TURNOVER_BASELINE },
      disposition: dispositionMirror(replay, barsBySymbol, krClosingHoldings(replay, barsBySymbol), {
        carryForward: true,
      }),
      nextDaySell: { mirror: nextDaySellMirror(replay, barsBySymbol), baseline: NEXT_DAY_SELL_BASELINE },
      chase: { mirror: chaseMirror(buys, barsBySymbol), baseline: CHASE_BASELINE },
      lottery: { mirror: lotteryMirror(recentBuys, await this.sections([...windows.values()])), evidence: LOTTERY_EVIDENCE },
    };
  }
}
