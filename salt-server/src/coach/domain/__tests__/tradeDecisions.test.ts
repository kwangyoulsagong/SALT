import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import {
  adherenceMirror,
  benchmarkMirror,
  buildDecisionOutcomes,
  dispositionMirror,
  judgeAdherence,
  replayLedger,
  sortLedgerAscending,
  tagCosts,
  type CoachLedgerEntry,
  type DailyBar,
  type DecisionOutcome,
  type TradePlan,
} from "..";

/**
 * F009 슬라이스 4 (`SRV-REQ-038` FR-9) — 되감기 · 준수 판정 · 결과 · 미러를 손계산과 대조한다.
 */

const at = (iso: string) => new Date(iso);

let seq = 0;
const tx = (
  side: "buy" | "sell",
  iso: string,
  quantity: number,
  price: number,
  fee = 0,
  symbol = "BTC",
  id = `t${++seq}`
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

const bar = (day: string, close: number): DailyBar => ({
  openTime: at(`${day}T00:00:00Z`),
  close: new Decimal(close),
});

const plan = (overrides: Partial<TradePlan>): TradePlan => ({
  id: "p1",
  userId: "u1",
  transactionId: null,
  symbol: "BTC",
  side: "buy",
  stopPrice: null,
  targetPrice: null,
  plannedQuantity: null,
  thesis: null,
  invalidation: null,
  reviewAt: null,
  probabilityUp: null,
  plannedAt: at("2026-01-01T00:00:00Z"),
  sampleOrigin: "live",
  adherenceLabel: null,
  adherenceEvaluatedAt: null,
  userAdherenceLabel: null,
  createdAt: at("2026-01-01T00:00:00Z"),
  updatedAt: at("2026-01-01T00:00:00Z"),
  ...overrides,
});

// 고정 거래 세트 — 손계산
// t1 매수 1 @100 수수료 1 → 조각 원가 101
// t2 매수 1 @80  수수료 1 → 81 (평단 101 아래 추가 매수 = 물타기)
// t3 매도 1 @90  수수료 1 → t1 소진: 대금 89 − 원가 101 = −12
// t4 매수 1 @95           → 손실 청산 11시간 뒤 재진입 = 복수 후보
// t5 매도 2 @120 수수료 2 → t2(81) + t4(95) = 176, 대금 238 → +62
const fixture = () => [
  tx("buy", "2026-01-01T01:00:00Z", 1, 100, 1, "BTC", "t1"),
  tx("buy", "2026-01-02T01:00:00Z", 1, 80, 1, "BTC", "t2"),
  tx("sell", "2026-01-05T01:00:00Z", 1, 90, 1, "BTC", "t3"),
  tx("buy", "2026-01-05T12:00:00Z", 1, 95, 0, "BTC", "t4"),
  tx("sell", "2026-01-20T01:00:00Z", 2, 120, 2, "BTC", "t5"),
];

describe("replayLedger — FIFO · 매수 수수료 포함 원가", () => {
  it("손계산 세트의 청산 손익 · 매수 성질", () => {
    const replay = replayLedger(fixture());
    assert.deepEqual(
      replay.closings.map((closing) => [closing.sell.id, closing.netPnlKrw.toNumber()]),
      [
        ["t3", -12],
        ["t5", 62],
      ]
    );
    assert.equal(replay.lots.get("t1")!.averagingDown, false);
    assert.equal(replay.lots.get("t2")!.averagingDown, true);
    assert.equal(replay.lots.get("t4")!.revenge, true);
    assert.equal(replay.lots.get("t1")!.closedAt?.toISOString(), "2026-01-05T01:00:00.000Z");
    assert.equal(replay.openQuantities.size, 0);
  });

  it("매수 기록 없는 매도는 결과를 만들지 않는다 — 원가 0 으로 이익이 되지 않게", () => {
    const replay = replayLedger([tx("sell", "2026-01-01T00:00:00Z", 1, 100, 0, "BTC", "orphan")]);
    assert.deepEqual(replay.unmatchedSellIds, ["orphan"]);
    assert.equal(replay.closings.length, 0);
  });

  it("같은 시각이면 매수가 먼저다", () => {
    const sorted = sortLedgerAscending([
      tx("sell", "2026-01-01T00:00:00Z", 1, 100, 0, "BTC", "s"),
      tx("buy", "2026-01-01T00:00:00Z", 1, 100, 0, "BTC", "b"),
    ]);
    assert.deepEqual(sorted.map((entry) => entry.id), ["b", "s"]);
  });
});

describe("judgeAdherence — 판정 케이스 표 (FR-11)", () => {
  const breachBars = [bar("2026-01-01", 100), bar("2026-01-02", 85), bar("2026-01-03", 88)];

  it("종가가 손절가 아래로 닫히고 하루 안에 팔지 않았으면 stop_not_honored", () => {
    const replay = replayLedger(fixture());
    const judgement = judgeAdherence(
      plan({ transactionId: "t1", stopPrice: new Decimal(90) }),
      replay.lots.get("t1"),
      breachBars,
      at("2026-02-01T00:00:00Z")
    );
    // 01-02 봉이 01-03 00:00 에 85 로 닫힘 → 유예 01-04 00:00 → 매도 01-05
    assert.equal(judgement.label, "stop_not_honored");
    assert.equal(judgement.final, true);
  });

  it("유예 안에 팔았으면 honored", () => {
    const replay = replayLedger([
      tx("buy", "2026-01-01T01:00:00Z", 1, 100, 0, "BTC", "b"),
      tx("sell", "2026-01-03T10:00:00Z", 1, 88, 0, "BTC", "s"),
    ]);
    const judgement = judgeAdherence(
      plan({ transactionId: "b", stopPrice: new Decimal(90) }),
      replay.lots.get("b"),
      breachBars,
      at("2026-02-01T00:00:00Z")
    );
    assert.equal(judgement.label, "honored");
  });

  it("손절가 −5% 이하에 팔았으면 stop_slipped", () => {
    const replay = replayLedger([
      tx("buy", "2026-01-01T01:00:00Z", 1, 100, 0, "BTC", "b"),
      tx("sell", "2026-01-01T20:00:00Z", 1, 85, 0, "BTC", "s"),
    ]);
    const judgement = judgeAdherence(
      plan({ transactionId: "b", stopPrice: new Decimal(90) }),
      replay.lots.get("b"),
      [],
      at("2026-02-01T00:00:00Z")
    );
    assert.equal(judgement.label, "stop_slipped");
  });

  it("계획 수량보다 많이 샀으면 size_exceeded", () => {
    const replay = replayLedger([tx("buy", "2026-01-01T01:00:00Z", 1, 100, 0, "BTC", "b")]);
    const judgement = judgeAdherence(
      plan({ transactionId: "b", plannedQuantity: new Decimal("0.5") }),
      replay.lots.get("b"),
      [],
      at("2026-01-10T00:00:00Z")
    );
    assert.equal(judgement.label, "size_exceeded");
    assert.equal(judgement.final, false, "아직 들고 있다");
  });

  it("유예가 안 끝났으면 위반으로 치지 않는다", () => {
    const replay = replayLedger([tx("buy", "2026-01-01T01:00:00Z", 1, 100, 0, "BTC", "b")]);
    const judgement = judgeAdherence(
      plan({ transactionId: "b", stopPrice: new Decimal(90) }),
      replay.lots.get("b"),
      breachBars,
      at("2026-01-03T05:00:00Z")
    );
    assert.equal(judgement.label, "honored");
    assert.equal(judgement.final, false);
  });

  it("손절가 · 계획 수량이 둘 다 없거나 매도 계획이면 판정하지 않는다", () => {
    const replay = replayLedger([tx("buy", "2026-01-01T01:00:00Z", 1, 100, 0, "BTC", "b")]);
    const lot = replay.lots.get("b");
    assert.equal(judgeAdherence(plan({ transactionId: "b" }), lot, [], new Date()).label, null);
    assert.equal(
      judgeAdherence(plan({ side: "sell", stopPrice: new Decimal(1) }), lot, [], new Date()).label,
      null
    );
  });
});

describe("buildDecisionOutcomes — 결과 · R · 자동 태그 (FR-14 · FR-18)", () => {
  const replay = replayLedger(fixture());
  const build = (overrides: Partial<Parameters<typeof buildDecisionOutcomes>[0]> = {}) =>
    buildDecisionOutcomes({
      userId: "u1",
      replay,
      plansByTransaction: new Map(),
      chasingByBuy: new Map(),
      previousAutoTags: new Map(),
      barsBySymbol: new Map(),
      now: at("2026-02-01T00:00:00Z"),
      ...overrides,
    });

  it("순손익 · 수수료 · 수익률 · 보유일", () => {
    const [first, second] = build();
    assert.equal(first.netPnlKrw.toNumber(), -12);
    assert.equal(first.feesKrw.toNumber(), 2);
    assert.equal(first.netReturn.toFixed(6), new Decimal(-12).div(101).toFixed(6));
    assert.equal(first.holdingDays.toNumber(), 4);
    // t2 18일 · t4 14.5416…일 평균
    assert.equal(second.holdingDays.toFixed(4), new Decimal(18).plus(new Decimal(14 * 24 + 13).div(24)).div(2).toFixed(4));
    assert.equal(second.feesKrw.toNumber(), 3);
  });

  it("R = 순손익 ÷ (수량 × (평단 − 손절가)). 손절가가 없으면 null", () => {
    const withPlan = build({
      plansByTransaction: new Map([["t1", plan({ transactionId: "t1", stopPrice: new Decimal(91) })]]),
    });
    assert.equal(withPlan[0].rMultiple?.toNumber(), -1.2);
    assert.equal(withPlan[0].planId, "p1");
    assert.equal(withPlan[1].rMultiple, null);
  });

  it("계획 없는 청산은 off_plan · 과반 규칙 · 추격은 모르면 직전 판정을 잇는다", () => {
    const outcomes = build({
      plansByTransaction: new Map([["t1", plan({ transactionId: "t1" })]]),
      previousAutoTags: new Map([["t5", ["chasing"]]]),
    });
    assert.deepEqual(outcomes[0].autoTags, []);
    // t5: 물타기(t2) 수량 1 · 복수(t4) 수량 1 — 둘 다 과반이 아니다
    assert.deepEqual(outcomes[1].autoTags, ["chasing", "off_plan"]);

    const known = build({ chasingByBuy: new Map([["t2", false], ["t4", false]]), previousAutoTags: new Map([["t5", ["chasing"]]]) });
    assert.deepEqual(known[1].autoTags, ["off_plan"], "이번에 알면 이번 판정");
  });

  it("청산 30일 뒤 종가로 '그냥 들고 있었으면'", () => {
    const outcomes = build({ barsBySymbol: new Map([["BTC", [bar("2026-02-03", 202)]]]) });
    // t3 청산 01-05 01:00 → 30일 뒤 02-04 01:00. 02-03 봉은 02-04 00:00 에 닫혀 그 전이다 — 아직 없다
    assert.equal(outcomes[0].benchmarkReturn, null);
    const later = build({ barsBySymbol: new Map([["BTC", [bar("2026-02-04", 202)]]]) });
    assert.equal(later[0].benchmarkReturn?.toFixed(6), new Decimal(202).div(101).minus(1).toFixed(6));
  });
});

describe("mirror — 준수율 · 처분효과 · 보유 대비 · 태그 비용", () => {
  it("준수율은 사용자 수정 라벨을 센다 · 준수/위반 평균 수익률", () => {
    const view = adherenceMirror(
      [
        { id: "a", adherenceLabel: "honored", userAdherenceLabel: null },
        { id: "b", adherenceLabel: "stop_not_honored", userAdherenceLabel: "honored" },
        { id: "c", adherenceLabel: "size_exceeded", userAdherenceLabel: null },
        { id: "d", adherenceLabel: null, userAdherenceLabel: null },
      ],
      [
        { planId: "a", netReturn: new Decimal("0.1") },
        { planId: "b", netReturn: new Decimal("0.3") },
        { planId: "c", netReturn: new Decimal("-0.2") },
        { planId: null, netReturn: new Decimal("5") },
      ]
    );
    assert.equal(view.rate.value?.toFixed(4), new Decimal(2).div(3).toFixed(4));
    assert.equal(view.rate.sampleSize, 3);
    assert.equal(view.rate.status, "insufficient_sample", "표본이 적어도 값은 준다");
    assert.equal(view.honoredAvgReturn.value?.toNumber(), 0.2);
    assert.equal(view.violatedAvgReturn.value?.toNumber(), -0.2);
  });

  it("PGR · PLR — Odean 정의 손계산", () => {
    // d1 BTC·ETH 매수 → d3 BTC 이익 실현(ETH 종가 8 < 평단 10 = 장부상 손실) → d5 ETH 손실 실현
    const entries = [
      tx("buy", "2026-03-01T01:00:00Z", 1, 100, 0, "BTC", "b1"),
      tx("buy", "2026-03-01T01:00:00Z", 1, 10, 0, "ETH", "e1"),
      tx("sell", "2026-03-03T01:00:00Z", 1, 110, 0, "BTC", "b2"),
      tx("sell", "2026-03-05T01:00:00Z", 1, 9, 0, "ETH", "e2"),
    ];
    const replay = replayLedger(entries);
    const bars = new Map([["ETH", [bar("2026-03-03", 8)]]]);
    const view = dispositionMirror(replay, bars, [
      { netPnlKrw: new Decimal(10), holdingDays: new Decimal(2) },
      { netPnlKrw: new Decimal(-1), holdingDays: new Decimal(4) },
    ]);
    assert.deepEqual(view.counts, { realizedGains: 1, paperGains: 0, realizedLosses: 1, paperLosses: 1 });
    assert.equal(view.pgr.value?.toNumber(), 1);
    assert.equal(view.plr.value?.toNumber(), 0.5);
    assert.equal(view.gainHoldingDays.value?.toNumber(), 2);
    assert.equal(view.lossHoldingDays.value?.toNumber(), 4);
  });

  it("매도일 종가가 없으면 PGR · PLR 을 만들지 않는다(0 이 아니다)", () => {
    const replay = replayLedger([
      tx("buy", "2026-03-01T01:00:00Z", 1, 100, 0, "BTC"),
      tx("buy", "2026-03-01T01:00:00Z", 1, 10, 0, "ETH"),
      tx("sell", "2026-03-03T01:00:00Z", 1, 110, 0, "BTC"),
    ]);
    const view = dispositionMirror(replay, new Map(), []);
    assert.equal(view.pgr.value, null);
    assert.equal(view.pgr.status, "insufficient_data");
    assert.deepEqual(view.missingCloses, ["ETH"]);
  });

  it("보유 대비 — TWR 손계산 · 수수료 몫", () => {
    // 1일 100 · 2일 110 · 3일 121. 1일 1개 매수, 2일 1개 추가(110, 수수료 1)
    // 실제: (220 − 111)/100 = 1.09 → × 242/220 = 1.199 → +19.9%
    // 수수료 없음: (220 − 110)/100 = 1.1 → × 1.1 = 1.21 → +21%
    // 보유: 121/100 − 1 = +21%
    const entries = [
      tx("buy", "2026-04-01T01:00:00Z", 1, 100, 0, "BTC"),
      tx("buy", "2026-04-02T10:00:00Z", 1, 110, 1, "BTC"),
    ];
    const bars = new Map([["BTC", [bar("2026-04-01", 100), bar("2026-04-02", 110), bar("2026-04-03", 121)]]]);
    const view = benchmarkMirror(entries, bars, at("2026-04-04T05:00:00Z"));
    assert.equal(view.actualReturn?.toFixed(6), "0.199000");
    assert.equal(view.holdReturn?.toFixed(6), "0.210000");
    assert.equal(view.feeComponent?.toFixed(6), "-0.011000");
    assert.equal(view.timingComponent?.toFixed(6), "0.000000");
    assert.equal(view.sampleSize, 2);
    assert.equal(view.status, "insufficient_sample");
  });

  it("보유 종목의 종가가 하나도 없으면 보유 대비를 만들지 않는다", () => {
    const view = benchmarkMirror(
      [tx("buy", "2026-04-01T01:00:00Z", 1, 100, 0, "SOL")],
      new Map(),
      at("2026-04-04T00:00:00Z")
    );
    assert.equal(view.status, "insufficient_data");
    assert.deepEqual(view.missingCloses, ["SOL"]);
  });

  it("태그 비용 — 확정 태그 우선 · 합이 결과 합과 같다 · 표본 20 이상 음의 기대값이면 엣지 없음", () => {
    const outcome = (tags: string[], pnl: number, confirmed: string[] | null = null) =>
      ({
        autoTags: tags,
        userTags: confirmed ?? [],
        userTagsConfirmedAt: confirmed ? new Date() : null,
        netPnlKrw: new Decimal(pnl),
        netReturn: new Decimal(pnl).div(100),
        rMultiple: null,
      }) satisfies Partial<DecisionOutcome>;
    const chasing = Array.from({ length: 20 }, () => outcome(["chasing"], -10));
    const costs = tagCosts([...chasing, outcome(["off_plan"], 5), outcome(["chasing"], 100, [])]);
    const chase = costs.find((cost) => cost.tag === "chasing")!;
    assert.equal(chase.count, 20, "빈 배열로 확정한 결과는 태그가 없다");
    assert.equal(chase.netPnlKrw.toNumber(), -200);
    assert.equal(chase.noEdge, true);
    assert.equal(costs[0].tag, "chasing", "비용이 큰 태그가 앞");
    assert.equal(costs.find((cost) => cost.tag === "off_plan")!.noEdge, false, "표본 부족이면 배지 없음");
  });
});
