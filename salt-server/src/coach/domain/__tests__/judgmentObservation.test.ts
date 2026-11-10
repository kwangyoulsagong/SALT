import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  judgmentCaveatFacts,
  judgmentObservations,
  MODE_DECISION_THRESHOLDS,
  scoreModeDecision,
  type ModeDecisionInput,
} from "../index";

/**
 * 관측 근거 · 꼬리표 사실 — `SRV-REQ-053` FR-1 · 2 · `ADR-010`.
 *
 * 관측은 새 계산이 아니다 — 원장(`judgment_ledger.components`)에 남는 **같은 기여**에서 만든다. 그래서 대조 테스트는
 * `scoreModeDecision` 이 낸 기여와 관측의 값 · 점수가 같은지를 본다.
 */

const base: ModeDecisionInput = {
  mode: "scalp",
  symbol: "BTC",
  change24h: 1.2,
  sentimentScore: 50,
  rsi: 48,
  whaleBuy: 0,
  whaleSell: 0,
  hasHolding: false,
  missingData: [],
};

describe("judgmentObservations — 원장 기여와 같은 값", () => {
  const cases: Array<[string, Partial<ModeDecisionInput>]> = [
    ["문턱 안(관망)", {}],
    ["RSI 위 문턱과 같음(포함)", { rsi: 70 }],
    ["RSI 아래 문턱과 같음(포함)", { rsi: 35 }],
    ["24시간 변화 위 문턱과 같음(넘지 않음)", { change24h: 3 }],
    ["24시간 변화 문턱 위", { change24h: 4.5 }],
    ["24시간 변화 문턱 아래", { change24h: -3.2 }],
    ["심리 과열", { sentimentScore: 72 }],
    ["RSI 결측", { rsi: undefined }],
  ];
  for (const mode of ["scalp", "long_term"] as const) {
    for (const [name, patch] of cases) {
      it(`${mode} · ${name}`, () => {
        const { components } = scoreModeDecision({ ...base, ...patch, mode });
        const rows = judgmentObservations(mode, components, []);
        for (const row of rows) {
          const c = components.find((x) => x.item === row.item)!;
          assert.equal(row.points, c.points, `${row.item} points`);
          assert.equal(row.value, c.value, `${row.item} value`);
          assert.equal(row.missing, c.value === null);
          assert.equal(row.lower, MODE_DECISION_THRESHOLDS[row.item].lower);
          assert.equal(row.upper, MODE_DECISION_THRESHOLDS[row.item].upper);
        }
      });
    }
  }

  it("장기는 심리를 관측하지 않는다 — 규칙이 점수에 안 쓰는 재료를 근거처럼 말하지 않는다", () => {
    const { components } = scoreModeDecision({ ...base, mode: "long_term" });
    assert.deepEqual(
      judgmentObservations("long_term", components, []).map((r) => r.item).sort(),
      ["change24h", "rsi"]
    );
  });

  it("대량 체결 · 빠진 재료 수는 관측이 아니다", () => {
    const { components } = scoreModeDecision(base);
    const items = judgmentObservations("scalp", components, []).map((r) => r.item);
    assert.ok(!items.includes("whale_flow" as never));
    assert.ok(!items.includes("missing_data" as never));
  });

  it("시세가 빠지면 24시간 변화 0 은 결측이다 — 0 을 관측으로 세면 지어낸 근거", () => {
    const { components } = scoreModeDecision({ ...base, change24h: 0 });
    const change = judgmentObservations("scalp", components, ["price"]).find((r) => r.item === "change24h")!;
    assert.equal(change.missing, true);
    assert.equal(change.value, null);
    assert.equal(change.distance, null);
  });

  it("거리 = 가까운 문턱까지 · 정렬 = 문턱 폭 대비 가까운 순 · 결측은 맨 뒤", () => {
    const { components } = scoreModeDecision({ ...base, change24h: 2.5, rsi: 50, sentimentScore: undefined });
    const rows = judgmentObservations("scalp", components, []);
    assert.deepEqual(
      rows.map((r) => [r.item, r.distance]),
      [
        ["change24h", 0.5], // 0.5 / 6 ≈ 0.083
        ["rsi", 15], // 15 / 35 ≈ 0.43
        ["sentiment", null],
      ]
    );
  });
});

describe("judgmentCaveatFacts — 꼬리표 사실", () => {
  const ctx = {
    history: { dailyBars: 63, requiredDailyBars: 120, dailyIndicator: false },
    staleInputs: ["technical_indicator" as const],
    inputTimes: { price: new Date("2026-11-10T06:00:00Z"), technical_indicator: new Date("2026-11-07T00:00:00Z") },
    exchange: { cautions: ["PRICE_FLUCTUATIONS"], checkedAt: new Date("2026-11-10T05:00:00Z") },
    observations: judgmentObservations(
      "scalp",
      [
        { item: "change24h", points: 0, value: 0 },
        { item: "rsi", points: 0, value: null },
        { item: "sentiment", points: 0, value: null },
      ],
      ["price"]
    ),
    liveSample: 12,
    backtestSample: 2310,
    minSample: 20,
  };
  const table: Array<[Parameters<typeof judgmentCaveatFacts>[0], unknown]> = [
    ["insufficient_history", { reason: "insufficient_history", have: 63, need: 120, dailyIndicator: false }],
    ["exchange_warning", { reason: "exchange_warning", cautions: ["PRICE_FLUCTUATIONS"], checkedAt: "2026-11-10T05:00:00.000Z" }],
    ["stale_inputs", { reason: "stale_inputs", items: [{ item: "technical_indicator", lastAt: "2026-11-07T00:00:00.000Z" }] }],
    ["live_sample_short", { reason: "live_sample_short", live: 12, min: 20, backtest: 2310 }],
    ["track_record_unavailable", { reason: "track_record_unavailable" }],
    ["backtest_missing", { reason: "backtest_missing", live: 12, min: 20 }],
  ];
  for (const [reason, expected] of table) {
    it(reason, () => assert.deepEqual(judgmentCaveatFacts(reason, ctx), expected));
  }

  it("inputs_missing — 결측 관측 항목 전부", () => {
    const facts = judgmentCaveatFacts("inputs_missing", ctx) as { items: string[] };
    assert.deepEqual([...facts.items].sort(), ["change24h", "rsi", "sentiment"]);
  });

  it("투자유의 지정 시각은 모른다 — 지어내지 않고 확인 시각만", () => {
    const facts = judgmentCaveatFacts("exchange_warning", { ...ctx, exchange: undefined });
    assert.deepEqual(facts, { reason: "exchange_warning", cautions: [], checkedAt: null });
  });
});
