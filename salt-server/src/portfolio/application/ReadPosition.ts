import Decimal from "decimal.js";

import {
  annualizedVolatility,
  buildPositionFlow,
  buildRiskRadar,
  kstDate,
  maxDrawdown,
  periodReturn,
  summarizeHoldings,
  type DailyCloseSource,
  type Holding,
  type HoldingRepository,
  type NewsSentimentSource,
  type RiskRadarPolicy,
  type TransactionRepository,
} from "../domain";

/**
 * 포지션(F006 G절 · `SRV-REQ-028` FR-80~82) — 개요(Hero · 레이더)와 평가금 흐름(기간 버튼)을 **두 유스케이스**로 나눈다.
 * 기간 버튼은 흐름만 다시 부른다(FE FR-91) — 개요를 같이 다시 계산하지 않게.
 */

export type FlowRange = "1w" | "1m" | "3m" | "1y";

export interface PositionWindows {
  /** 30일 수익률 · 변동성 창(일) */
  returnDays: number;
  volatilityDays: number;
  /** 변동성이 값이 되려면 하루 수익률 몇 개 이상 */
  volatilityMinDays: number;
  /** 낙폭 축 창(일) */
  drawdownDays: number;
  /** 뉴스 축 창(일) */
  newsDays: number;
  /** 수량 복원에 읽는 거래 상한 */
  timelineLimit: number;
}

export interface PositionSettings {
  radar: RiskRadarPolicy;
  windows: PositionWindows;
}

const RANGE_DAYS: Record<FlowRange, number> = { "1w": 7, "1m": 30, "3m": 90, "1y": 365 };
const DAY_MS = 24 * 60 * 60 * 1000;

/** `days` 일 구간의 첫날 · 오늘(KST) — 첫 수익률을 재려면 그 앞날 종가가 필요해 하루 더 앞에서 읽는다 */
const windowOf = (now: Date, days: number) => ({
  from: kstDate(new Date(now.getTime() - days * DAY_MS)),
  to: kstDate(now),
  readSince: new Date(now.getTime() - (days + 7) * DAY_MS),
});

const heldItems = (holdings: Holding[]) => holdings.map((h) => ({ symbol: h.symbol, assetType: h.assetType }));

/** 평가금 흐름(기간 버튼 하나) — 그날 실제 수량 × 그날 종가 + 시간가중 MDD */
export class GetPositionFlow {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly closes: DailyCloseSource,
    private readonly windows: Pick<PositionWindows, "timelineLimit">,
  ) {}

  async execute(userId: string, range: FlowRange, now = new Date()) {
    const { trades, truncated } = await this.transactions.findTimeline(userId, this.windows.timelineLimit);
    const window = windowOf(now, RANGE_DAYS[range]);
    const items = [...new Map(trades.map((t) => [`${t.assetType}:${t.symbol}`, { symbol: t.symbol, assetType: t.assetType }])).values()];
    const closes = items.length === 0 ? [] : await this.closes.dailyClosesSince(items, window.readSince);
    const flow = buildPositionFlow(trades, closes, window.from, window.to);

    const degradedReasons = [
      ...(truncated ? ["timeline_truncated"] : []),
      ...(flow.missingSymbols.length > 0 ? ["missing_close"] : []),
    ];
    return {
      range,
      points: flow.points.map((p) => ({ date: p.date, valueKrw: p.valueKrw })),
      maxDrawdown: maxDrawdown(flow.points),
      periodReturnPct: periodReturn(flow.points),
      missingSymbols: flow.missingSymbols,
      degraded: degradedReasons.length > 0,
      degradedReasons,
    };
  }
}

/**
 * 포지션 개요 — Hero 6항목(FR-70) · 리스크 레이더 4축(FR-73). 보유가 0 이면 `empty: true` 이고 Hero · 레이더가 없다(FR-78 — 0 으로 그리지 않는다).
 * 금액은 보유 행의 평가(시세 반영 값) 그대로 — 계산은 `summarizeHoldings` 하나(목록 · 통계와 같은 정의)
 */
export class GetPositionOverview {
  constructor(
    private readonly holdings: HoldingRepository,
    private readonly transactions: TransactionRepository,
    private readonly closes: DailyCloseSource,
    private readonly news: NewsSentimentSource,
    private readonly settings: PositionSettings,
  ) {}

  async execute(userId: string, now = new Date()) {
    const holdings = await this.holdings.findByUser(userId);
    if (holdings.length === 0) return { empty: true as const, hero: null, radar: null, degraded: false, degradedReasons: [] };

    const { windows, radar: policy } = this.settings;
    const longest = Math.max(windows.returnDays, windows.volatilityDays, windows.drawdownDays);
    const window = windowOf(now, longest);
    // 원천마다 따로 실패한다 — 레이더 재료(일봉 · 뉴스 · 거래 흐름)가 실패해도 Hero(보유 행)는 나온다(`BFF-REQ-027` FR-70).
    // 실패한 원천을 쓰는 칸만 null + degraded 사유 — 0 으로 접지 않는다
    const [timelineResult, closesResult, sentimentResult] = await Promise.allSettled([
      this.transactions.findTimeline(userId, windows.timelineLimit),
      this.closes.dailyClosesSince(heldItems(holdings), window.readSince),
      this.news.sentimentCounts(
        holdings.filter((h) => h.assetType === "crypto").map((h) => h.symbol),
        new Date(now.getTime() - windows.newsDays * DAY_MS),
      ),
    ]);
    const flowOk = timelineResult.status === "fulfilled" && closesResult.status === "fulfilled";
    const truncated = timelineResult.status === "fulfilled" && timelineResult.value.truncated;
    const flow = flowOk
      ? buildPositionFlow(timelineResult.value.trades, closesResult.value, window.from, window.to)
      : { points: [], missingSymbols: [] };
    const sentiment = sentimentResult.status === "fulfilled" ? sentimentResult.value : null;
    const tail = (days: number) => {
      const from = kstDate(new Date(now.getTime() - days * DAY_MS));
      return flow.points.filter((p) => p.date >= from);
    };

    const totals = summarizeHoldings(holdings);
    const total = new Decimal(totals.totalValue);
    const weightOf = (h: Holding) => (total.isZero() ? 0 : new Decimal(h.currentValue).div(total).times(100).toNumber());
    const top = [...holdings].sort((a, b) => b.currentValue - a.currentValue)[0];
    const unvalued = holdings.filter((h) => !(h.currentPrice > 0)).map((h) => h.symbol);
    const counts = new Map((sentiment ?? []).map((s) => [s.symbol, s]));

    const axes = buildRiskRadar(
      {
        topWeight: total.isZero() ? null : { symbol: top.symbol, pct: weightOf(top) },
        volatilityPct: annualizedVolatility(tail(windows.volatilityDays), windows.volatilityMinDays),
        drawdownPct: maxDrawdown(tail(windows.drawdownDays))?.pct ?? null,
        // 뉴스를 못 읽었으면 기사 0 건으로 접지 않고 축을 비운다(커버리지 0 → null)
        news: sentiment === null ? [] : holdings.map((h) => ({
          weightPct: weightOf(h),
          labeled: counts.get(h.symbol)?.labeled ?? 0,
          negative: counts.get(h.symbol)?.negative ?? 0,
        })),
      },
      policy,
    );

    const invested = new Decimal(totals.totalInvested);
    const profit = new Decimal(totals.unrealizedProfit);
    const degradedReasons = [
      ...(unvalued.length > 0 ? ["unvalued_holding"] : []),
      ...(truncated ? ["timeline_truncated"] : []),
      ...(flow.missingSymbols.length > 0 ? ["missing_close"] : []),
      ...(flowOk ? [] : ["flow_unavailable"]),
      ...(sentiment === null ? ["news_unavailable"] : []),
    ];
    return {
      empty: false as const,
      hero: {
        totalValueKrw: totals.totalValue,
        unrealizedProfitKrw: totals.unrealizedProfit,
        unrealizedProfitRatePct: invested.isZero() ? null : profit.div(invested).times(100).toNumber(),
        investedKrw: totals.totalInvested,
        holdingsCount: holdings.length,
        topWeight: total.isZero() ? null : { symbol: top.symbol, assetType: top.assetType, pct: weightOf(top) },
        // 30일 전부터 들고 있었을 때만 — 닷새 들고 있던 수익률을 "30일 수익률"로 부르지 않는다
        return30dPct: (() => {
          const points = tail(windows.returnDays);
          const from = kstDate(new Date(now.getTime() - windows.returnDays * DAY_MS));
          return points[0]?.date === from ? periodReturn(points) : null;
        })(),
      },
      radar: axes,
      unvaluedSymbols: unvalued,
      degraded: degradedReasons.length > 0,
      degradedReasons,
    };
  }
}
