import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PANEL_HORIZONS, priceLike, scenarioBaseRate, toScenarioCells, wilson95 } from "../policy/scenarioBaseRate";
import type { ScenarioHorizonView } from "../policy/shortHorizon";
import type { BaseRateRow } from "../policy/tradeCheck";

/**
 * 시나리오 늘 — 내려가는 순서 경계 표(F017 v4 · `SRV-REQ-053` FR-10).
 * 불변식: 지평 넷 어느 입력에서도 칸이 비지 않고(baseRate 또는 model) 어느 단을 썼는지 실린다.
 */

const AS_OF = new Date("2026-11-13T01:15:00Z");
const row = (p: Partial<BaseRateRow>): BaseRateRow => ({
  market: "kr",
  conditionId: "ALL",
  horizon: 1,
  asOf: AS_OF,
  kind: "usual",
  status: "ok",
  sample: 1_001_659,
  sampleEff: 6798,
  sampleDays: 996,
  upRate: 0.396,
  upLow: 0.384,
  upHigh: 0.407,
  mean: 0,
  q10: -0.0448,
  q50: -0.0057,
  q90: 0.0362,
  holdUpRate: 0.444,
  holdQ10: -0.0412,
  holdQ50: -0.0021,
  holdQ90: 0.0397,
  differs: null,
  recentDiffers: null,
  ...p,
});
const USUAL_1 = row({});
const USUAL_5 = row({ horizon: 5, holdUpRate: 0.442, holdQ10: -0.0972, holdQ50: -0.0073, holdQ90: 0.0882 });
const K1_1 = row({ conditionId: "K1", kind: "test", sample: 26_248, sampleEff: 492, holdUpRate: 0.506, differs: "higher" });
const K1_5 = row({ conditionId: "K1", kind: "test", horizon: 5, sampleEff: 641, holdUpRate: 0.506, differs: "higher" });
const K3_1 = row({ conditionId: "K3", kind: "test", sampleEff: 791, holdUpRate: 0.448 });

describe("시나리오 과거 실제 결과 — 내려가는 순서(SRV-REQ-053 FR-10)", () => {
  type Case = [string, BaseRateRow[], string[], (typeof PANEL_HORIZONS)[number], string, string | null, string | null];
  const cases: Case[] = [
    //  이름 · 행 · 성립 조건 · 지평 → 단 · 빌려 온 지평 · 조건
    ["지금 조건(1d)", [USUAL_1, K1_1], ["K1"], "1d", "now", null, "K1"],
    ["조건 성립 없음 → 평소", [USUAL_1, K1_1], [], "1d", "usual", null, null],
    ["조건 행이 그 지평에 없음(K3 는 1일뿐) → 평소(5d)", [USUAL_1, USUAL_5, K3_1], ["K3"], "5d", "usual", null, null],
    ["조건이 유효 n 미달 → 평소", [USUAL_1, { ...K1_1, status: "below_min" }], ["K1"], "1d", "usual", null, null],
    ["앞 조건이 미달이면 다음 성립 조건", [USUAL_1, { ...K1_1, status: "below_min" }, K3_1], ["K1", "K3"], "1d", "now", null, "K3"],
    ["비율이 null 인 조건은 말하지 않는다 → 평소", [USUAL_1, { ...K1_1, holdUpRate: null }], ["K1"], "1d", "usual", null, null],
    ["장중 지평(1h)은 하루 값으로 — 조건도 따라간다", [USUAL_1, K1_1], ["K1"], "1h", "longer", "1d", "K1"],
    ["장중 지평(4h) · 조건 없음 → 하루 평소", [USUAL_1], [], "4h", "longer", "1d", null],
    ["1일 행이 없으면 한 단계 더(5d)", [USUAL_5], [], "1d", "longer", "5d", null],
    ["1h — 1일이 없으면 5일까지", [USUAL_5, K1_5], ["K1"], "1h", "longer", "5d", "K1"],
    ["5d 평소가 없으면 결함(더 긴 지평 없음)", [USUAL_1], [], "5d", "defect", null, null],
    ["행이 하나도 없음 → 결함", [], ["K1"], "1d", "defect", null, null],
    ["전부 미달 → 결함", [{ ...USUAL_1, status: "below_min" }], [], "1d", "defect", null, null],
  ];
  for (const [name, stats, matched, horizon, tier, fallbackFrom, condition] of cases) {
    it(name, () => {
      const picked = scenarioBaseRate(horizon, { stats, matched, price: 10_000 });
      assert.equal(picked.tier, tier);
      assert.equal(picked.fallbackFrom, fallbackFrom);
      assert.equal(picked.baseRate.condition?.id ?? null, condition);
      // 결함이 아니면 숫자가 다 있다 · 결함이면 비율 · 범위 · 틀리는 선이 없다
      const { upCount100, upRange, range, invalidation, status } = picked.baseRate;
      if (tier === "defect") {
        assert.deepEqual([status, upCount100, upRange, range, invalidation], ["below_min", null, null, null, null]);
      } else {
        assert.equal(status, "ok");
        assert.ok(upCount100 !== null && upRange !== null && range !== null && invalidation !== null);
      }
    });
  }

  it("숫자 = 가격이 실제로 움직인 분포(비용 전) · 틀리는 선 = 지금 가격 × 나빴던 10%", () => {
    const { baseRate } = scenarioBaseRate("1d", { stats: [USUAL_1, K1_1], matched: ["K1"], price: 10_000 });
    assert.equal(baseRate.upCount100, 51); // holdUpRate 0.506 — 비용 뒤 upRate(0.396)가 아니다
    assert.equal(baseRate.usualUp100, 44);
    assert.deepEqual(baseRate.range, { lowPct: -4.04, midPct: -0.21, highPct: 4.05 });
    assert.equal(baseRate.invalidation, Math.round(10_000 * Math.exp(-0.0412))); // 원 단위 — 소수 원 없음
    assert.deepEqual([baseRate.sample, baseRate.sampleEffective, baseRate.sampleDays], [26_248, 492, 996]);
    assert.equal(baseRate.asOf, AS_OF.toISOString());
  });

  it("결함 단은 가장 가까운 행의 표본만(아직 n번뿐)", () => {
    const { baseRate } = scenarioBaseRate("1d", {
      stats: [{ ...USUAL_1, status: "below_min", sampleEff: 37 }],
      matched: [],
      price: null,
    });
    assert.equal(baseRate.sampleEffective, 37);
    assert.equal(baseRate.upCount100, null);
  });

  it("시세가 없으면 틀리는 선만 없다 — 비율 · 범위는 그대로", () => {
    const { tier, baseRate } = scenarioBaseRate("1d", { stats: [USUAL_1], matched: [], price: null });
    assert.equal(tier, "usual");
    assert.equal(baseRate.invalidation, null);
    assert.equal(baseRate.upCount100, 44);
  });

  it("'평소보다'는 Holm 방향이 이 숫자에서도 같은 쪽일 때만", () => {
    const say = (holdUpRate: number, differs: "higher" | "lower" | null) =>
      scenarioBaseRate("1d", { stats: [USUAL_1, { ...K1_1, holdUpRate, differs }], matched: ["K1"], price: 1 }).baseRate
        .differsFromUsual;
    assert.equal(say(0.506, "higher"), "higher");
    assert.equal(say(0.444, "higher"), null); // 100번 중 같은 수 — 말하지 않는다
    assert.equal(say(0.4, "higher"), null); // 방향이 뒤집힘
    assert.equal(say(0.4, "lower"), "lower");
    assert.equal(say(0.506, null), null); // 예측이 통과시키지 않았다
    // 견줄 평소 행이 없으면 말하지 않는다 — "평소(n번)보다"의 n 이 없다(변이 2026-11-13)
    assert.equal(scenarioBaseRate("1d", { stats: [K1_1], matched: ["K1"], price: 1 }).baseRate.differsFromUsual, null);
    assert.equal(
      scenarioBaseRate("1d", { stats: [{ ...USUAL_1, status: "below_min" }, K1_1], matched: ["K1"], price: 1 }).baseRate.differsFromUsual,
      null
    );
    // 평소 행 자신은 늘 null
    assert.equal(scenarioBaseRate("1d", { stats: [USUAL_1], matched: [], price: 1 }).baseRate.differsFromUsual, null);
  });
});

describe("가격 모양", () => {
  it("100원 이상은 원 단위 · 그 아래는 유효 숫자 넷", () => {
    assert.deepEqual([192_965.562, 123.456, 100, 99.994, 0.0123456, 3.14159].map(priceLike), [192_966, 123, 100, 99.99, 0.01235, 3.142]);
  });
});

describe("Wilson 95%", () => {
  it("유효 표본으로 — 예측 뷰의 비용 뒤 범위와 셋째 자리까지 맞는다(뷰는 반올림 전 비율)", () => {
    // v_base_rate kr ALL 1: up 0.396 · n_eff 6798 → 0.384 ~ 0.407
    const r = wilson95(0.396, 6798)!;
    assert.equal(r.low.toFixed(3), "0.384");
    assert.equal(r.high.toFixed(3), "0.408");
  });
  it("경계 — n 0 · 범위 밖 비율은 null · 0 과 1 은 범위 안", () => {
    assert.equal(wilson95(0.5, 0), null);
    assert.equal(wilson95(1.2, 10), null);
    assert.equal(wilson95(0, 100)!.low, 0);
    assert.equal(wilson95(1, 100)!.high, 1);
  });
});

describe("지평 넷 — 모델 칸과 과거 실제 결과", () => {
  const model = (horizon: "1h" | "4h" | "1d", renderable: boolean): ScenarioHorizonView => ({
    horizon,
    horizonLabel: "x",
    renderable,
    blockedReason: renderable ? null : "awaiting_live",
    pUp: renderable ? 0.61 : null,
    range: null,
    invalidation: null,
    refPrice: null,
    asOf: null,
    expiresAt: null,
    track: null,
  });
  const input = { stats: [USUAL_1, USUAL_5], matched: [], price: 10_000 };

  it("소유자가 아니면(models null) 넷 다 과거 실제 결과 · 모델 칸 없음", () => {
    const cells = toScenarioCells("kr", null, input);
    assert.deepEqual(cells.map((c) => c.horizon), ["1h", "4h", "1d", "5d"]);
    assert.deepEqual(cells.map((c) => c.source), ["base_rate", "base_rate", "base_rate", "base_rate"]);
    assert.deepEqual(cells.map((c) => c.tier), ["longer", "longer", "usual", "usual"]);
    assert.ok(cells.every((c) => c.model === null && c.baseRate !== null));
    assert.equal(cells[3].horizonLabel, "5거래일 뒤 종가까지");
  });

  it("화면 허가를 받은 모델 칸만 model — 막힌 칸은 시험 상태를 달고 과거 실제 결과", () => {
    const cells = toScenarioCells("crypto", [model("1h", true), model("4h", false), model("1d", false)], {
      ...input,
      stats: input.stats.map((r) => ({ ...r, market: "crypto" as const })),
    });
    assert.deepEqual(cells.map((c) => c.source), ["model", "base_rate", "base_rate", "base_rate"]);
    assert.equal(cells[0].baseRate, null);
    assert.equal(cells[1].model?.blockedReason, "awaiting_live");
    assert.equal(cells[3].model, null); // 5일 모델은 없다
  });

  it("어느 입력에서도 칸이 비지 않는다(행 0 · 시세 0)", () => {
    for (const c of toScenarioCells("kr", null, { stats: [], matched: [], price: null })) {
      assert.equal(c.tier, "defect");
      assert.ok(c.baseRate);
    }
  });
});
