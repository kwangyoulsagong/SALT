import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SCENARIO_CELL_MAX_AGE_MS,
  toScenarioHorizon,
  toScenarioHorizons,
  type ShortHorizonCellRow,
  type ShortHorizonPredictionRow,
} from "../policy/shortHorizon";

const NOW = new Date("2026-11-11T09:00:00Z");
const cell = (over: Partial<ShortHorizonCellRow> = {}): ShortHorizonCellRow => ({
  market: "crypto",
  horizon: "1h",
  asOf: new Date("2026-11-11T00:00:00Z"),
  modelVersion: "short-direction@1+abc",
  status: "pass",
  blockedReason: null,
  liveReady: true,
  windowFrom: new Date("2025-07-01T00:00:00Z"),
  windowTo: new Date("2026-11-10T00:00:00Z"),
  evalRows: 1000,
  trackOrigin: "backtest",
  confidentCalls: 400,
  confidentHits: 230,
  alwaysUpHits: 205,
  misses: [{ asOf: "2026-11-09T03:00:00Z", symbol: "KRW-ETH", pUp: 0.61, realized: -0.012 }, { broken: true }],
  ...over,
});
const pred = (over: Partial<ShortHorizonPredictionRow> = {}): ShortHorizonPredictionRow => ({
  horizon: "1h",
  asOf: new Date("2026-11-11T08:00:00Z"),
  modelVersion: "short-direction@1+abc",
  pUp: 0.61,
  q10: -0.008,
  q50: 0.002,
  q90: 0.019,
  refPrice: 100,
  invalidation: 99.2,
  expiresAt: new Date("2026-11-11T09:00:01Z"),
  renderable: true,
  blockedReason: null,
  ...over,
});

describe("시나리오 지평 — 막힘 경계 표(SRV-REQ-053 FR-5)", () => {
  const cases: Array<[string, ShortHorizonCellRow | undefined, ShortHorizonPredictionRow | undefined, string | null]> = [
    ["칸 없음", undefined, pred(), "not_tested"],
    ["칸 3일 넘음", cell({ asOf: new Date(NOW.getTime() - SCENARIO_CELL_MAX_AGE_MS - 1) }), pred(), "stale"],
    ["칸 정확히 3일 — 믿는다", cell({ asOf: new Date(NOW.getTime() - SCENARIO_CELL_MAX_AGE_MS) }), pred(), null],
    ["칸 시험 못 넘음", cell({ status: "fail", blockedReason: "no_skill" }), pred(), "no_skill"],
    ["칸 모르는 사유", cell({ status: "fail", blockedReason: "weird" }), pred(), "not_tested"],
    ["국내 장중 이력 부족", cell({ status: "not_tested", blockedReason: "insufficient_history", evalRows: 0 }), undefined, "insufficient_history"],
    ["칸 통과 · 라이브 증명 전(예측은 있어도)", cell({ liveReady: false }), pred(), "awaiting_live"],
    ["칸 통과 · 라이브 증명 전 · 예측 없음", cell({ liveReady: false }), undefined, "awaiting_live"],
    ["칸 통과 · 종목 예측 없음", cell(), undefined, "outside_universe"],
    ["예측 만료(= now)", cell(), pred({ expiresAt: NOW }), "stale"],
    ["뷰가 renderable false", cell(), pred({ renderable: false, blockedReason: "stale" }), "stale"],
    ["모델 버전 다름", cell(), pred({ modelVersion: "short-direction@1+old" }), "stale"],
    ["통과 · 만료 전", cell(), pred(), null],
  ];
  for (const [name, c, p, reason] of cases) {
    it(name, () => {
      const v = toScenarioHorizon("crypto", "1h", c, p, NOW);
      assert.equal(v.blockedReason, reason);
      assert.equal(v.renderable, reason === null);
      if (reason !== null) {
        // 막히면 확률 · 범위 · 무효선은 없다 — 대칭 범위로 채우지 않는다
        assert.equal(v.pUp, null);
        assert.equal(v.range, null);
        assert.equal(v.invalidation, null);
      }
    });
  }

  it("통과면 범위를 기준 가격 대비 %로 · 성적 · 깨진 사례는 버림", () => {
    const v = toScenarioHorizon("crypto", "1h", cell(), pred(), NOW);
    assert.deepEqual(v.range, { lowPct: -0.8, midPct: 0.2, highPct: 1.92 });
    assert.equal(v.track?.origin, "backtest");
    assert.deepEqual(v.track?.misses, [{ asOf: "2026-11-09T03:00:00Z", symbol: "KRW-ETH", pUp: 0.61, realizedPct: -1.19 }]);
  });

  it("막혀도 시험 성적은 싣는다 — 왜 말하지 않는지의 근거", () => {
    const v = toScenarioHorizon("crypto", "4h", cell({ status: "fail", blockedReason: "no_skill" }), undefined, NOW);
    assert.equal(v.track?.calls, 400);
  });

  it("지평은 늘 셋 · 국내 1d 문구는 거래일", () => {
    const vs = toScenarioHorizons("kr", [cell({ market: "kr", horizon: "1d", status: "fail", blockedReason: "no_skill" })], [], NOW);
    assert.deepEqual(vs.map((v) => [v.horizon, v.blockedReason]), [
      ["1h", "not_tested"],
      ["4h", "not_tested"],
      ["1d", "no_skill"],
    ]);
    assert.equal(vs[2]!.horizonLabel, "다음 거래일 종가까지");
  });
});
