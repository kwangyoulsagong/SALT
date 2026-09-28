import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyzeNewsSentiment,
  analyzePortfolioState,
  buildBehaviorRules,
  calculateConfidence,
  calculateSeverity,
  detectChasingHigh,
  detectMarketRegime,
  detectOverTrading,
  detectPanicSell,
  generateCandidates,
  languageViolations,
  makeModeDecision,
  type CoachContext,
  type CoachHolding,
  type CoachInsight,
  type CoachTrade,
} from "../index";

/**
 * `coach` 정책 **특성화 테스트** — 점수 엔진 외 나머지 (`score.test.ts` 와 짝이다).
 *
 * 기대값은 원문(`market-regime` · `portfolio-state` · `ai-investment-coach` ·
 * `news-analysis` · `behavior-analysis` · `signal-performance`)의 식을 손으로 푼 값이다.
 */

const NOW = new Date("2026-09-18T00:00:00Z");
const hoursBeforeNow = (h: number) => new Date(NOW.getTime() - h * 3600_000);

const indicator = (rsi14: number | null) => ({
  rsi14,
  ma20: null,
  ma50: null,
  volumeAvg20: null,
  timestamp: NOW,
});

const sentiment = (fearGreedIndex?: number) => ({
  sentimentScore: 50,
  fearGreedIndex,
  sentimentLabel: "neutral",
  priceChange24h: 0,
  calculatedAt: NOW,
});

const holding = (symbol: string, currentValue: number): CoachHolding => ({
  symbol,
  totalQuantity: 1,
  averageBuyPrice: currentValue,
  totalInvested: currentValue,
  currentPrice: currentValue,
  currentValue,
  unrealizedProfit: 0,
  unrealizedProfitRate: 0,
  realizedProfit: 0,
});

const trade = (
  overrides: Partial<CoachTrade> & Pick<CoachTrade, "transactionType">
): CoachTrade => ({
  symbol: "BTC",
  price: 100,
  transactionDate: hoursBeforeNow(1),
  ...overrides,
});

describe("detectMarketRegime — 특성화", () => {
  it("지표도 심리도 없으면 sideways 다", () => {
    assert.equal(detectMarketRegime(null, null), "sideways");
  });

  it("공포지수 20 + RSI 25 는 panic", () => {
    assert.equal(detectMarketRegime(indicator(25), sentiment(20)), "panic");
  });

  it("공포지수 80 + RSI 75 는 euphoric", () => {
    assert.equal(detectMarketRegime(indicator(75), sentiment(80)), "euphoric");
  });

  it("RSI 만으로 60 이상은 bullish, 40 이하는 bearish", () => {
    assert.equal(detectMarketRegime(indicator(60), null), "bullish");
    assert.equal(detectMarketRegime(indicator(40), null), "bearish");
    assert.equal(detectMarketRegime(indicator(50), null), "sideways");
  });

  it("지표 값이 null 이면 RSI 를 50(중립)으로 본다 — '없음'과 '중립'을 같게 본다", () => {
    assert.equal(detectMarketRegime(indicator(null), sentiment(50)), "sideways");
  });
});

describe("analyzePortfolioState — 특성화", () => {
  it("보유가 없으면 전부 0 이고 riskLevel 은 low 다", () => {
    assert.deepEqual(analyzePortfolioState([]), {
      totalValue: 0,
      concentration: 0,
      riskLevel: "low",
      diversificationScore: 0,
    });
  });

  it("최대 비중 80% 는 high · 분산점수 20", () => {
    const state = analyzePortfolioState([
      holding("BTC", 800),
      holding("ETH", 200),
    ]);

    assert.equal(state.totalValue, 1000);
    assert.equal(state.concentration, 0.8);
    assert.equal(state.largestAsset, "BTC");
    assert.equal(state.riskLevel, "high");
    assert.equal(state.diversificationScore, 20);
  });

  it("최대 비중 50% 는 medium (경계는 0.4 초과 · 0.7 초과)", () => {
    const state = analyzePortfolioState([
      holding("BTC", 500),
      holding("ETH", 500),
    ]);

    assert.equal(state.riskLevel, "medium");
    assert.equal(state.diversificationScore, 50);
  });

  it("평가액 합이 0 이면 빈 상태로 본다", () => {
    assert.equal(analyzePortfolioState([holding("BTC", 0)]).totalValue, 0);
  });
});

describe("generateCandidates — 특성화", () => {
  const base: CoachContext = {
    userId: "u1",
    marketRegime: "sideways",
    portfolioState: {
      totalValue: 1000,
      concentration: 0.5,
      largestAsset: "BTC",
      riskLevel: "medium",
      diversificationScore: 50,
    },
    maxWeight: 0.6,
    holdings: [],
    symbolFeatures: new Map([
      ["BTC", { symbol: "BTC", holding: holding("BTC", 500), riskInsights: [] }],
      ["ETH", { symbol: "ETH", riskInsights: [] }],
    ]),
    behaviorInsights: [],
    candidateSymbols: ["BTC", "ETH"],
    newsAnalysisMap: new Map(),
  };

  it("보유 종목에만 sell 이 생기고 리밸런싱 후보가 하나 붙는다", () => {
    assert.deepEqual(
      generateCandidates(base).map((c) => `${c.action}:${c.symbol}`),
      [
        "buy:BTC",
        "hold:BTC",
        "sell:BTC",
        "buy:ETH",
        "hold:ETH",
        "rebalance:BTC",
      ]
    );
  });
});

describe("makeModeDecision — 특성화 (mode-decision@2)", () => {
  const input = {
    symbol: "BTC",
    change24h: 5,
    whaleBuy: 0,
    whaleSell: 0,
    hasHolding: false,
    missingData: [] as string[],
  };

  it("같은 입력에 단타와 장기가 다른 점수를 준다 — 단타 급등은 @2 에서 감점이다", () => {
    const scalp = makeModeDecision({ ...input, mode: "scalp" });
    const longTerm = makeModeDecision({ ...input, mode: "long_term" });

    assert.equal(scalp.score, 38); // 50 − 12 (@1 은 +12 — IC −0.038 로 반대 판정)
    assert.equal(scalp.action, "avoid");
    assert.deepEqual(scalp.risks, ["하루 3% 넘게 오른 뒤에는 다음 날 되돌림이 더 잦았습니다."]);
    assert.equal("confidence" in scalp, false); // D3 — 신뢰도를 싣지 않는다
    assert.equal(scalp.timeframe, "24h");

    assert.equal(longTerm.score, 44); // 50 − 6 (유지 판정)
    assert.equal(longTerm.action, "avoid");
    assert.equal(longTerm.label, "지금은 피하기");
    assert.equal(longTerm.riskLevel, "high");
    assert.deepEqual(longTerm.reasons, []); // @1 은 감점 항목을 근거로 적었다 — 점수와 문장이 어긋났다
  });

  it("재료가 3종 이상 빠지면 -12 하고 그 사실을 risks 에 적는다", () => {
    const decision = makeModeDecision({
      ...input,
      mode: "scalp",
      missingData: ["price", "sentiment", "whale_flow"],
    });

    assert.equal(decision.score, 26); // 38 − 12
    assert.equal(decision.risks.includes("판단 데이터가 부족합니다."), true);
  });

  it("단타 하락 · 공포는 가점이고, 대형 체결 · 장기 심리는 점수 · 문장에서 빠진다", () => {
    const base = { ...input, change24h: -5, sentimentScore: 30, rsi: 30, whaleBuy: 100, whaleSell: 10 };
    const scalp = makeModeDecision({ ...base, mode: "scalp" });
    const longTerm = makeModeDecision({ ...base, mode: "long_term" });

    assert.equal(scalp.score, 68); // 50 + 10 + 4 + 4 — 대형 체결 0
    assert.equal(longTerm.score, 64); // 50 + 6 + 8 — 심리 · 대형 체결 0
    // 근거 없는 항목만으로는 후보 문턱(70)에 닿지 않는다 — 문턱은 @1 그대로(표본 안 확인: 낮추면 후보 칸 초과수익 0)
    assert.equal(scalp.action, "wait");
    assert.equal(longTerm.action, "wait");
    for (const d of [scalp, longTerm]) {
      assert.equal([...d.reasons, ...d.risks].some((t) => t.includes("대형")), false);
    }
    assert.equal(longTerm.reasons.some((t) => t.includes("공포")), false);
  });

  it("낼 수 있는 모든 근거 · 위험 문장이 문구 가드를 통과한다(확신 · 목표가 0)", () => {
    const sentences = new Set<string>();
    for (const mode of ["scalp", "long_term"] as const) {
      for (const change24h of [-5, 0, 5]) {
        for (const sentimentScore of [20, 50, 80, undefined]) {
          for (const rsi of [20, 50, 80, undefined]) {
            for (const [whaleBuy, whaleSell] of [[100, 10], [10, 100], [0, 0]]) {
              const d = makeModeDecision({
                ...input, mode, change24h, sentimentScore, rsi, whaleBuy, whaleSell,
                missingData: sentimentScore === undefined ? ["sentiment", "whale_flow", "price"] : [],
              });
              [...d.reasons, ...d.risks, d.headline].forEach((t) => sentences.add(t));
            }
          }
        }
      }
    }
    assert.ok(sentences.size >= 10);
    for (const sentence of sentences) {
      assert.deepEqual(languageViolations(sentence), [], sentence);
    }
  });

  it("헤드라인이 손절·분할을 함께 말한다 — 확신 표현이 없다", () => {
    const decision = makeModeDecision({ ...input, mode: "long_term" });

    assert.equal(
      decision.headline,
      "BTC 장기 관점은 지금은 피하기입니다. 한 번에 진입하기보다 분할 기준을 먼저 잡으세요."
    );
  });
});

describe("analyzeNewsSentiment — 특성화", () => {
  it("기사가 없으면 null 이다", () => {
    assert.equal(analyzeNewsSentiment("BTC", [], NOW), null);
  });

  it("한 제목이 겹치는 키워드 셋에 모두 걸린다 — 원문의 부분 문자열 누적", () => {
    const result = analyzeNewsSentiment(
      "BTC",
      [
        {
          title: "비트코인 ETF 승인",
          summary: null,
          content: null,
          sentiment: "positive",
          publishedAt: NOW,
        },
      ],
      NOW
    );

    // 10(positive) + 15("ETF 승인") + 8("ETF") + 6("승인") = 39, 시간 가중치 1
    assert.equal(result?.score, 39);
    assert.equal(result?.sentiment, "bullish");
    assert.deepEqual(result?.keywords, ["ETF 승인", "ETF", "승인"]);
    assert.equal(
      result?.summary,
      "ETF 승인, ETF 관련 긍정적 뉴스 감지 · 최근 24h 1건 분석 · 뉴스 분위기 우호적"
    );
  });

  it("24시간 전 기사는 가중치가 0.3 까지 내려간다", () => {
    const result = analyzeNewsSentiment(
      "BTC",
      [
        {
          title: "거래소 해킹",
          summary: null,
          content: null,
          sentiment: null,
          publishedAt: hoursBeforeNow(24),
        },
      ],
      NOW
    );

    // -12 * 0.3 = -3.6 → 중립 (|점수| ≤ 15)
    assert.equal(result?.score, -4);
    assert.equal(result?.sentiment, "neutral");
  });

  it("본문에 있는 키워드도 센다 — 목록 요약만 봤다면 놓친다", () => {
    const result = analyzeNewsSentiment(
      "BTC",
      [
        {
          title: "시장 동향",
          summary: null,
          content: "대규모 매도 물량에 폭락",
          sentiment: null,
          publishedAt: NOW,
        },
      ],
      NOW
    );

    // "대규모 매도" -12 · "폭락" -12 = -24. 경계는 ±15 라 -12 하나로는 중립이다
    assert.equal(result?.score, -24);
    assert.equal(result?.sentiment, "bearish");
  });
});

describe("행동 판정 — 특성화", () => {
  it("기준과 같은 거래 수는 severity 40 에서 시작한다", () => {
    const trades = Array.from({ length: 12 }, () => trade({ transactionType: "buy" }));
    const finding = detectOverTrading(trades, 24, 12, NOW);

    assert.equal(finding?.severity, 40);
    assert.equal(finding?.dedupeKey, "overtrading:24h");
    assert.equal(
      finding?.summary,
      "최근 24시간 동안 12회 거래가 감지되었습니다. (기준 12회)"
    );
  });

  it("기준의 1.5배면 severity 70", () => {
    const trades = Array.from({ length: 18 }, () => trade({ transactionType: "buy" }));
    assert.equal(detectOverTrading(trades, 24, 12, NOW)?.severity, 70);
  });

  it("기준 미만이면 아무 말도 하지 않는다", () => {
    const trades = Array.from({ length: 11 }, () => trade({ transactionType: "buy" }));
    assert.equal(detectOverTrading(trades, 24, 12, NOW), null);
  });

  it("현재가 대비 10% 낮게 판 매도는 손실 매도로 센다", () => {
    const finding = detectPanicSell(
      [trade({ transactionType: "sell", price: 90 })],
      24,
      new Map([["BTC", 100]]),
      NOW
    );

    // 45 + round(0.1 * 200) + 1 * 5 = 70
    assert.equal(finding?.severity, 70);
    assert.equal(
      finding?.payload.kind === "panic_sell" && finding.payload.lossSellCount,
      1
    );
  });

  it("손실률 3% 미만은 세지 않는다", () => {
    const finding = detectPanicSell(
      [trade({ transactionType: "sell", price: 98 })],
      24,
      new Map([["BTC", 100]]),
      NOW
    );

    assert.equal(finding, null);
  });

  it("고점의 98% 이상에서 산 것은 추격 매수다 — severity 는 100 에서 멈춘다", () => {
    const finding = detectChasingHigh(
      [trade({ transactionType: "buy", price: 99 })],
      48,
      0.98,
      new Map([["BTC", 100]]),
      NOW
    );

    // 40 + round(1 * 70) = 110 → 100
    assert.equal(finding?.severity, 100);
  });

  it("두 번 중 한 번이면 severity 75", () => {
    const finding = detectChasingHigh(
      [
        trade({ transactionType: "buy", price: 99 }),
        trade({ transactionType: "buy", price: 50 }),
      ],
      48,
      0.98,
      new Map([["BTC", 100]]),
      NOW
    );

    assert.equal(finding?.severity, 75);
  });

  it("패턴이 없으면 빈 목록 대신 기록 습관을 권한다", () => {
    assert.deepEqual(buildBehaviorRules([]), [
      "현재 뚜렷한 반복 손실 패턴은 적지만, 거래 전 계획 기록은 유지하세요.",
    ]);
  });

  it("감지된 패턴마다 규칙이 하나씩 붙는다", () => {
    assert.equal(buildBehaviorRules(["over_trading", "panic_sell"]).length, 2);
  });
});

describe("severity · confidence — 특성화", () => {
  it("severity 하한은 35 이고 집중도가 높을수록 올라간다", () => {
    assert.equal(calculateSeverity(10, "low"), 35);
    assert.equal(calculateSeverity(50, "medium"), 55);
    assert.equal(calculateSeverity(95, "high"), 100);
  });

  it("confidence 상한은 0.92 다 — 확신 표현을 하지 않는다", () => {
    assert.equal(calculateConfidence(80, 50), 0.92);
    assert.equal(calculateConfidence(40, 30), 0.75);
    assert.equal(calculateConfidence(10, 10), 0.6);
  });
});
