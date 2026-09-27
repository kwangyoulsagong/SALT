import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import {
  benchmarkMirror,
  brierSummary,
  buildMonthlyReview,
  entryChecklist,
  episodeScenario,
  HISTORICAL_EPISODES,
  ipsDeviation,
  isReviewMonthClosed,
  languageViolations,
  oneThingSentence,
  portfolioScenarios,
  PREMORTEM_QUESTION,
  previousReviewMonth,
  replayLedger,
  reviewMonthWindow,
  shockScenarios,
  type BrierPlan,
  type CoachLedgerEntry,
  type DailyBar,
  type DecisionOutcome,
  type TagCost,
} from "..";

/**
 * F009 슬라이스 6 (`SRV-REQ-038` FR-10) — 월 경계 · 시나리오 · Brier · 체크리스트 · IPS 이탈 · 복기를 손계산과 대조한다.
 */

const at = (iso: string) => new Date(iso);
const bar = (day: string, close: number): DailyBar => ({ openTime: at(`${day}T00:00:00Z`), close: new Decimal(close) });
const tx = (
  id: string,
  side: "buy" | "sell",
  iso: string,
  quantity: number,
  price: number,
  symbol = "BTC",
  fee = 0
): CoachLedgerEntry => ({
  id,
  symbol,
  side,
  quantity,
  price,
  totalAmount: quantity * price,
  fee,
  transactionDate: at(iso),
});

// 고정 세트 — 손계산
// 12-31 01:00Z(KST 12-31 10시) BTC 1 @100 → 1월 전
// 01-02 01:00Z ETH 1 @100 → 1월 안
// BTC 종가 12-31 100 · 01-01 90 · 01-02 80 · 01-03 120 / ETH 01-02 100 · 01-03 100
// 평가금 12-31 100 · 01-01 90 · 01-02 180(순입금 100) · 01-03 220
const entries = [tx("b1", "buy", "2025-12-31T01:00:00Z", 1, 100), tx("e1", "buy", "2026-01-02T01:00:00Z", 1, 100, "ETH")];
const bars = new Map<string, DailyBar[]>([
  ["BTC", [bar("2025-12-31", 100), bar("2026-01-01", 90), bar("2026-01-02", 80), bar("2026-01-03", 120)]],
  ["ETH", [bar("2026-01-02", 100), bar("2026-01-03", 100)]],
]);
const now = at("2026-01-04T01:00:00Z"); // 닫힌 마지막 일봉 = 01-03
const january = reviewMonthWindow("2026-01");

describe("월 경계 — KST", () => {
  it("2026-01 = KST 1월 1일 0시 ~ 2월 1일 0시", () => {
    assert.equal(january.from.toISOString(), "2025-12-31T15:00:00.000Z");
    assert.equal(january.to.toISOString(), "2026-01-31T15:00:00.000Z");
  });

  it("지난달은 KST 로 센다 · 1월이면 전년 12월", () => {
    // UTC 1월 31일 16시 = KST 2월 1일 01시 → 지난달 1월
    assert.equal(previousReviewMonth(at("2026-01-31T16:00:00Z")), "2026-01");
    assert.equal(previousReviewMonth(at("2026-01-10T00:00:00Z")), "2025-12");
  });

  it("끝나지 않은 달은 닫히지 않았다", () => {
    assert.equal(isReviewMonthClosed("2026-01", at("2026-01-31T14:59:00Z")), false);
    assert.equal(isReviewMonthClosed("2026-01", at("2026-01-31T15:00:00Z")), true);
  });
});

describe("시나리오 (FR-25) — 확률 없이 원화만", () => {
  const holdings = [
    { symbol: "ETH", value: Money.krw(300) },
    { symbol: "BTC", value: Money.krw(700) },
  ];

  it("−10 · −30 · −50% — 합과 종목별 몫, 큰 종목이 앞", () => {
    const [ten, thirty, fifty] = shockScenarios(holdings);
    assert.equal(ten.loss.toKrwInteger(), -100);
    assert.equal(ten.valueAfter.toKrwInteger(), 900);
    assert.deepEqual(
      ten.bySymbol.map((row) => [row.symbol, row.loss.toKrwInteger()]),
      [
        ["BTC", -70],
        ["ETH", -30],
      ]
    );
    assert.equal(thirty.loss.toKrwInteger(), -300);
    assert.equal(fifty.valueAfter.toKrwInteger(), 500);
  });

  it("과거 구간 — 한 종목이라도 그때 일봉이 없으면 합을 만들지 않는다", () => {
    const episode = HISTORICAL_EPISODES[0];
    const btcOnly = new Map([["BTC", [bar(episode.from, 29_756_000), bar(episode.to, 22_220_000)]]]);
    const partial = episodeScenario(episode, holdings, btcOnly);
    assert.equal(partial.status, "insufficient_data");
    assert.equal(partial.loss, null);
    assert.deepEqual(partial.missingSymbols, ["ETH"]);
    const btcReturn = new Decimal(22_220_000).div(29_756_000).minus(1);
    assert.equal(partial.bySymbol[0].returnRate?.toFixed(6), btcReturn.toFixed(6));

    const full = episodeScenario(
      episode,
      holdings,
      new Map([...btcOnly, ["ETH", [bar(episode.from, 1000), bar(episode.to, 800)]]])
    );
    // 700 × (−25.3%) + 300 × (−20%)
    const expected = btcReturn.times(700).plus(-60);
    assert.equal(full.status, "ok");
    assert.equal(full.loss?.toDecimal().toFixed(6), expected.toFixed(6));
    assert.equal(full.returnRate?.toFixed(6), expected.div(1000).toFixed(6));
  });

  it("보유가 없으면 시나리오가 비어 있다(0 을 만들지 않는다)", () => {
    const empty = portfolioScenarios([], new Map());
    assert.equal(empty.status, "no_holdings");
    assert.deepEqual(empty.shocks, []);
  });
});

describe("Brier (FR-13) — 적은 순간에 알던 종가에서 출발", () => {
  const plan = (overrides: Partial<BrierPlan>): BrierPlan => ({
    id: "p",
    symbol: "BTC",
    probabilityUp: new Decimal("0.7"),
    plannedAt: at("2026-01-01T12:00:00Z"),
    reviewAt: null,
    sampleOrigin: "live",
    ...overrides,
  });
  const plans = [
    // 기준 = 12-31 종가 100(01-01 봉은 적은 뒤에 닫힌다) · 결과 = 01-02 봉 80 → 내림 · 0.7 을 말했으니 빗나감
    plan({ id: "miss", reviewAt: at("2026-01-02T12:00:00Z") }),
    // 결과 = 01-03 봉 120 → 오름 · (0.6 − 1)² = 0.16
    plan({ id: "hit", probabilityUp: new Decimal("0.6"), reviewAt: at("2026-01-03T00:30:00Z") }),
    // 복기일 없으면 30일 → 아직 만기 전
    plan({ id: "pending", probabilityUp: new Decimal("0.2"), plannedAt: at("2026-01-02T12:00:00Z") }),
    plan({ id: "backtest", sampleOrigin: "backtest", reviewAt: at("2026-01-02T12:00:00Z") }),
    plan({ id: "none", probabilityUp: null }),
  ];

  it("평균 · 기준선 대비 · 빗나감 · 만기 전을 손계산대로", () => {
    const summary = brierSummary(plans, bars, now);
    assert.equal(summary.meanScore.value?.toNumber(), 0.325);
    assert.equal(summary.meanScore.sampleSize, 2);
    assert.equal(summary.meanScore.status, "insufficient_sample");
    assert.equal(summary.baseline.toNumber(), 0.25);
    assert.equal(summary.skill?.toNumber(), -0.3);
    assert.equal(summary.missedCount, 1);
    assert.equal(summary.pendingCount, 1);
    assert.deepEqual(
      summary.recentMisses.map((item) => [item.planId, item.referenceClose.toNumber(), item.outcomeClose.toNumber()]),
      [["miss", 100, 80]]
    );
  });

  it("구간을 주면 만기가 그 안에 든 것만 — 만기 전 계획은 1월 복기에 없다", () => {
    const summary = brierSummary(plans, bars, now, january);
    assert.equal(summary.meanScore.sampleSize, 2);
    assert.equal(summary.pendingCount, 0);
  });

  it("종가가 없으면 채점 불가로 센다(0 점을 주지 않는다)", () => {
    const summary = brierSummary([plan({ symbol: "XRP", reviewAt: at("2026-01-02T12:00:00Z") })], bars, now);
    assert.equal(summary.meanScore.value, null);
    assert.equal(summary.meanScore.status, "insufficient_data");
    assert.equal(summary.unscorableCount, 1);
  });
});

const cost = (tag: string, netPnlKrw: number, count = 1): TagCost => ({
  tag,
  count,
  netPnlKrw: new Decimal(netPnlKrw),
  avgReturn: new Decimal(0),
  avgR: null,
  rSampleSize: 0,
  status: "insufficient_sample",
  noEdge: false,
});

describe("진입 전 체크리스트 (FR-30) — 본인 실수 태그에서 자란다", () => {
  const costs = [cost("chasing", -300, 4), cost("새벽충동", -100), cost("revenge", -50), cost("off_plan", -10), cost("averaging_down", 20)];

  it("손익 합이 음수인 태그를 비용 순으로 셋까지 · 사용자 정의 태그는 이름을 넣은 질문", () => {
    const checklist = entryChecklist(costs);
    assert.deepEqual(
      checklist.items.map((item) => item.tag),
      ["chasing", "새벽충동", "revenge"]
    );
    assert.equal(checklist.items[1].question, "'새벽충동' 태그가 붙을 만한 거래인가요?");
    assert.equal(checklist.items[0].count, 4);
    assert.equal(checklist.premortemQuestion, PREMORTEM_QUESTION);
  });

  it("비용이 없으면 질문도 없다 — 프리모템만", () => {
    assert.deepEqual(entryChecklist([cost("averaging_down", 20)]).items, []);
  });

  it("질문 · 프리모템에 명령형 · 확신 · 목표가 0건", () => {
    const sentences = [
      ...entryChecklist([
        cost("chasing", -1),
        cost("averaging_down", -1),
        cost("revenge", -1),
        cost("off_plan", -1),
        cost("late_night", -1),
      ]).items.map((item) => item.question),
      ...entryChecklist([cost("late_night", -1), cost("x", -1)]).items.map((item) => item.question),
      PREMORTEM_QUESTION,
    ];
    for (const sentence of sentences) assert.deepEqual(languageViolations(sentence), [], sentence);
  });
});

describe("보유 대비 — 구간(월)", () => {
  it("구간 전날 보유가 출발점 · TWR 은 구간 안 날만", () => {
    const result = benchmarkMirror(entries, bars, now, january);
    // 0.9 × (80 ÷ 90) × (220 ÷ 180) − 1
    const expected = new Decimal(0.9).times(new Decimal(80).div(90)).times(new Decimal(220).div(180)).minus(1);
    assert.equal(result.sampleSize, 3);
    assert.equal(result.actualReturn?.toFixed(10), expected.toFixed(10));
    assert.equal(result.holdReturn?.toNumber(), 0.2, "12-31 BTC 100% → 01-03 120");
    assert.equal(result.from?.toISOString(), "2025-12-31T00:00:00.000Z");
    assert.equal(result.endValue?.toNumber(), 220);
  });

  it("구간 없이 부르면 전 기간(슬라이스 4 와 같은 값)", () => {
    const all = benchmarkMirror(entries, bars, now);
    const windowed = benchmarkMirror(entries, bars, now, january);
    assert.equal(all.actualReturn?.toFixed(10), windowed.actualReturn?.toFixed(10));
  });
});

describe("IPS 이탈 일수 — 지금 설정 기준", () => {
  const base = { entries, barsBySymbol: bars, window: january, now, maxSingleAssetWeight: new Decimal("0.6") };

  it("월 손실 · 종목 상한을 넘은 날을 각각 · 합집합으로", () => {
    // 월 손익: 01-01 −10 · 01-02 −20 · 01-03 +20 → 예산 15 를 넘은 날 1
    // 최대 비중: 01-01 100% · 01-02 55.6% · 01-03 54.5% → 60% 를 넘은 날 1
    const result = ipsDeviation({ ...base, monthlyLossBudget: { amount: new Decimal(15), unit: "krw" } });
    assert.equal(result.observedDays, 3);
    assert.equal(result.lossBudget.days, 1);
    assert.equal(result.concentration.days, 1);
    assert.equal(result.days, 2);
    assert.equal(result.basis, "current_settings");
  });

  it("비율 예산은 월초 평가금 대비 — 100 × 15% = 15", () => {
    const result = ipsDeviation({ ...base, monthlyLossBudget: { amount: new Decimal("0.15"), unit: "percent" } });
    assert.equal(result.lossBudget.budget?.toNumber(), 15);
    assert.equal(result.lossBudget.days, 1);
  });

  it("예산이 없으면 손실 쪽은 세지 않는다(0 이 아니다)", () => {
    const result = ipsDeviation({ ...base, monthlyLossBudget: null });
    assert.equal(result.lossBudget.status, "budget_not_set");
    assert.equal(result.lossBudget.days, null);
    assert.equal(result.days, 1);
  });

  it("그달에 들고 있던 종목의 종가가 없으면 세지 않는다", () => {
    const result = ipsDeviation({
      ...base,
      barsBySymbol: new Map([["BTC", bars.get("BTC")!]]),
      monthlyLossBudget: null,
    });
    assert.equal(result.days, null);
    assert.deepEqual(result.missingCloses, ["ETH"]);
  });
});

describe("월간 복기 — 조립", () => {
  const outcome = (id: string, closedAt: string, netPnlKrw: number, tags: string[]): DecisionOutcome => ({
    id,
    userId: "u1",
    planId: null,
    closingTransactionId: id,
    symbol: "BTC",
    openedAt: at("2025-12-01T00:00:00Z"),
    closedAt: at(closedAt),
    holdingDays: new Decimal(3),
    quantity: new Decimal(1),
    netPnlKrw: new Decimal(netPnlKrw),
    feesKrw: new Decimal(0),
    netReturn: new Decimal(netPnlKrw).div(100),
    rMultiple: null,
    benchmarkReturn: null,
    adherenceLabel: null,
    autoTags: tags,
    userTags: [],
    userTagsConfirmedAt: null,
    sampleOrigin: "live",
    computedAt: now,
  });

  it("그달 거래 · 청산만 · 가장 비용이 큰 태그 · 회전율 = 대금 ÷ 2 ÷ 월말 평가금", () => {
    const review = buildMonthlyReview({
      month: "2026-01",
      entries,
      replay: replayLedger(entries),
      barsBySymbol: bars,
      linkedPlans: [],
      outcomes: [
        outcome("o1", "2026-01-02T05:00:00Z", -30, ["chasing"]),
        outcome("o2", "2026-01-03T05:00:00Z", -50, ["off_plan"]),
        outcome("o3", "2025-12-20T05:00:00Z", -999, ["revenge"]), // 12월 청산 — 1월 복기에 없다
      ],
      forecastPlans: [],
      monthlyLossBudget: { amount: new Decimal(15), unit: "krw" },
      maxSingleAssetWeight: new Decimal("0.6"),
      now,
    });

    assert.deepEqual(review.activity, { tradeCount: 1, buyCount: 1, sellCount: 0, closedCount: 2 });
    assert.equal(review.topMistake?.tag, "off_plan");
    assert.deepEqual(
      review.tagCosts.map((item) => item.tag),
      ["off_plan", "chasing"]
    );
    // 1월 대금 100(ETH) ÷ 2 ÷ 220
    assert.equal(review.turnover.value?.toFixed(6), new Decimal(100).div(2).div(220).toFixed(6));
    assert.equal(review.ipsDeviation.days, 2);
    assert.equal(review.oneThing, "1월에 손익을 가장 많이 깎은 태그는 '계획 없음'(1건)이에요.");
  });

  it("'이번 달 한 가지' 문장 — 금액 없음 · 명령형 0건", () => {
    const sentences = [
      oneThingSentence("2026-03", cost("chasing", -310_000, 3), 5),
      oneThingSentence("2026-03", cost("나만의규칙", -1, 1), 5),
      oneThingSentence("2026-03", null, 5),
      oneThingSentence("2026-03", null, 0),
    ];
    assert.equal(sentences[0], "3월에 손익을 가장 많이 깎은 태그는 '급등 추격'(3건)이에요.");
    for (const sentence of sentences) {
      assert.deepEqual(languageViolations(sentence), [], sentence);
      assert.doesNotMatch(sentence, /원|310/, "금액은 숫자 필드로만");
    }
  });
});
