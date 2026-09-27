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
  type CoachProfileStore,
  type MarketProbe,
  type PortfolioProbe,
} from "../domain";

/** 한 번에 보는 거래 수 상한. 원문의 `take: 200` 이다. */
const TRADE_LIMIT = 200;
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
 *
 * ## 저장하지 않는다 — 알림이 아니라 측정이다 (FEATURE-009 FR-21)
 *
 * 전에는 워커가 6시간마다 판정을 `behavior_analysis` 인사이트로 저장했고, 그것이 피드 · 대시보드 알림이 됐다.
 * 실험 증거는 "알림만 주는 조건은 효과 0"이다(FEATURE-009 §배경). 지금은 **읽는 쪽이 요청 때 센다** —
 * 행동 코치 화면 · 코치 상세의 미러 줄 · 추천 점수의 행동 감점이 같은 판정을 본다. 남은 행은 TTL(6시간)로 사라진다.
 */
export class AnalyzeTradingBehavior {
  constructor(
    private readonly profiles: CoachProfileStore,
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe
  ) {}

  async execute(
    userId: string,
    now: Date = new Date()
  ): Promise<BehaviorFinding[]> {
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

    return [
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
    private readonly portfolio: PortfolioProbe,
    private readonly analyze: AnalyzeTradingBehavior
  ) {}

  async execute(userId: string): Promise<BehaviorCoachView> {
    // 요청 때 센다 — 저장된 판정이 없다(FR-21). 방금 한 거래도 바로 보인다
    const [findings, tradeCount] = await Promise.all([
      this.analyze.execute(userId),
      this.portfolio.countTrades(userId),
    ]);
    const ranked = [...findings].sort((a, b) => b.severity - a.severity);

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

    const tags = ranked.map((finding) => finding.payload.kind);

    return {
      status: ranked.length ? "active" : "stable",
      tags,
      warnings: ranked.map((finding) => {
        const payload = { ...finding.payload } as Record<string, unknown>;
        const fact = toBehaviorFact(payload);
        return {
          // 저장 행이 없어 판정 키가 id 다 — 같은 판정은 같은 키(`dedupeKey`)
          id: finding.dedupeKey,
          title: finding.title,
          message: finding.summary,
          severity: finding.severity,
          confidence: finding.confidence,
          payload,
          factCode: fact?.factCode ?? null,
          params: fact?.params ?? {},
        };
      }),
      recommendedRules: buildBehaviorRules(tags),
      evidence: {
        transactionCount: tradeCount,
        insightCount: ranked.length,
      },
    };
  }
}
