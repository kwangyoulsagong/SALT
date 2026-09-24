import {
  BEHAVIOR_DEFAULTS,
  buildBehaviorRules,
  detectChasingHigh,
  detectOverTrading,
  detectPanicSell,
  hoursBefore,
  toBehaviorFact,
  type BehaviorFact,
  type BehaviorFinding,
  type CoachInsight,
  type CoachInsightStore,
  type CoachProfileStore,
  type MarketProbe,
  type PortfolioProbe,
} from "../domain";

/** 한 번에 보는 거래 수 상한. 원문의 `take: 200` 이다. */
const TRADE_LIMIT = 200;
/** 행동 코치 화면이 읽는 인사이트 수. */
const BEHAVIOR_INSIGHT_LIMIT = 10;
/** 이 건수 미만이면 패턴을 말하지 않는다. */
const MIN_TRADES_FOR_ANALYSIS = 3;

/**
 * 투자 행동 분석 — `behavior-analysis.service` 에서 옮겨왔다.
 *
 * ## 조회를 세 판정이 나눠 쓴다
 *
 * 원문은 판정마다 자기 조회를 갖고 있었다 — 특히 추격 매수는 **심볼마다**
 * `priceHistory.aggregate` 를 불렀다(심볼 수만큼 왕복). 지금은 거래를 한 번 읽고,
 * 필요한 시세를 **심볼 목록으로 한 번씩** 가져와 판정에 넘긴다.
 *
 * 판정 자체는 `domain/policy/behavior` 의 순수 함수다.
 */
export class AnalyzeTradingBehavior {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly insights: CoachInsightStore,
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe
  ) {}

  async execute(
    userId: string,
    now: Date = new Date()
  ): Promise<CoachInsight[]> {
    const profile = await this.profiles.findByUser(userId);

    const panicSellWindowHours =
      profile?.panicSellWindowHours ?? BEHAVIOR_DEFAULTS.panicSellWindowHours;

    const windowHours = Math.max(
      BEHAVIOR_DEFAULTS.overTradingWindowHours,
      panicSellWindowHours,
      BEHAVIOR_DEFAULTS.chasingWindowHours
    );

    const trades = await this.portfolio.listTradesSince(
      userId,
      hoursBefore(now, windowHours),
      TRADE_LIMIT
    );

    const sellSymbols = uniqueSymbols(trades, "sell");
    const buySymbols = uniqueSymbols(trades, "buy");

    const [quotes, recentHighs] = await Promise.all([
      this.market.quotes(sellSymbols),
      this.market.highestCloseSince(
        buySymbols,
        hoursBefore(now, BEHAVIOR_DEFAULTS.chasingWindowHours)
      ),
    ]);

    const currentPrices = new Map(
      [...quotes].map(([symbol, quote]) => [symbol, quote.currentPrice])
    );

    const findings = [
      detectOverTrading(
        trades,
        BEHAVIOR_DEFAULTS.overTradingWindowHours,
        BEHAVIOR_DEFAULTS.overTradingThreshold,
        now
      ),
      detectPanicSell(trades, panicSellWindowHours, currentPrices, now),
      detectChasingHigh(
        trades,
        BEHAVIOR_DEFAULTS.chasingWindowHours,
        BEHAVIOR_DEFAULTS.chasingThresholdRatio,
        recentHighs,
        now
      ),
    ].filter((finding): finding is BehaviorFinding => finding !== null);

    // 하나가 저장에 실패해도 나머지는 남는다 — 원문의 `allSettled` 와 같다.
    const saved = await Promise.allSettled(
      findings.map((finding) => this.save(userId, finding, now))
    );

    return saved
      .filter(
        (result): result is PromiseFulfilledResult<CoachInsight> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value);
  }

  private save(
    userId: string,
    finding: BehaviorFinding,
    now: Date
  ): Promise<CoachInsight> {
    return this.insights.saveBehavior({
      userId,
      title: finding.title,
      summary: finding.summary,
      severity: finding.severity,
      confidence: finding.confidence,
      dedupeKey: finding.dedupeKey,
      payload: { ...finding.payload },
      expiresAt: new Date(
        now.getTime() + BEHAVIOR_DEFAULTS.ttlHours * 60 * 60 * 1000
      ),
    });
  }
}

const uniqueSymbols = (
  trades: Array<{ symbol: string; transactionType: "buy" | "sell" }>,
  type: "buy" | "sell"
): string[] =>
  Array.from(
    new Set(trades.filter((t) => t.transactionType === type).map((t) => t.symbol))
  );

export interface BehaviorCoachView {
  status: "insufficient_data" | "active" | "stable";
  tags: string[];
  warnings: Array<{
    id: string;
    title: string;
    message: string;
    severity: number;
    confidence: number | null;
    payload: Record<string, unknown> | null;
    /** `SRV-REQ-025` FR-17 — 기존 필드에 **더한다.** 판정을 못 읽으면 `null` · `{}` */
    factCode: BehaviorFact["factCode"] | null;
    params: BehaviorFact["params"];
  }>;
  recommendedRules: string[];
  evidence: {
    transactionCount: number;
    minimumRequired?: number;
    insightCount?: number;
  };
}

/**
 * 행동 코치 화면 — `behavior-coach.service` 에서 옮겨왔다.
 *
 * ## 표본이 적으면 패턴을 말하지 않는다
 *
 * 거래 3건 미만이면 `insufficient_data` 를 주고 **기록 습관**만 권한다.
 * 표본 3건으로 "당신은 과잉 거래 중"이라고 말하는 것이 이 기능이 할 수 있는
 * 가장 나쁜 일이다.
 */
export class GetBehaviorCoach {
  constructor(
    private readonly insights: CoachInsightStore,
    private readonly portfolio: PortfolioProbe,
    private readonly analyze: AnalyzeTradingBehavior
  ) {}

  async execute(userId: string): Promise<BehaviorCoachView> {
    // 화면을 열 때 갱신한다 — 워커 주기(10분)를 기다리면 방금 한 거래가 안 보인다.
    await this.analyze.execute(userId);

    const [insights, tradeCount] = await Promise.all([
      this.insights.findActiveBehavior(userId, BEHAVIOR_INSIGHT_LIMIT),
      this.portfolio.countTrades(userId),
    ]);

    if (tradeCount < MIN_TRADES_FOR_ANALYSIS) {
      return {
        status: "insufficient_data",
        tags: [],
        warnings: [],
        recommendedRules: [
          "거래 전 진입가 · 손절가 · 익절 구간을 적어 두면 계획 대비 실행을 비교할 수 있습니다.",
          "외부 앱에서 주문한 뒤 SALT에 결과를 기록하세요.",
        ],
        evidence: {
          transactionCount: tradeCount,
          minimumRequired: MIN_TRADES_FOR_ANALYSIS,
        },
      };
    }

    const tags = insights.map(
      (insight) =>
        (insight.payload?.kind as string | undefined) ?? insight.dedupeKey ?? ""
    );

    return {
      status: insights.length ? "active" : "stable",
      tags,
      warnings: insights.map((insight) => {
        const fact = toBehaviorFact(insight.payload);
        return {
          id: insight.id,
          title: insight.title,
          message: insight.summary,
          severity: insight.severity,
          confidence: insight.confidence,
          payload: insight.payload,
          factCode: fact?.factCode ?? null,
          params: fact?.params ?? {},
        };
      }),
      recommendedRules: buildBehaviorRules(tags),
      evidence: {
        transactionCount: tradeCount,
        insightCount: insights.length,
      },
    };
  }
}
