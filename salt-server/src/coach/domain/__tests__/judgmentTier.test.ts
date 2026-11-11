import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toJudgmentTier, type JudgmentTierRow } from "../policy/judgmentTier";

/** 라벨 등급 읽기 — 예측 뷰 값을 믿어도 되나만 본다(문턱 재계산 0, `SRV-REQ-053` FR-7) */
const NOW = new Date("2026-11-11T08:00:00Z");
const row = (patch: Partial<JudgmentTierRow> = {}): JudgmentTierRow => ({
  market: "crypto",
  mode: "scalp",
  asOf: new Date("2026-11-11T07:00:00Z"),
  tier: "reference",
  reason: "no_candidate",
  basisSource: null,
  liveEffectiveN: 7.2,
  liveCiLow: null,
  liveCiHigh: null,
  regimeFirst: null,
  regimeSecond: null,
  backtestCiLow: null,
  backtestCiHigh: null,
  ...patch,
});

describe("toJudgmentTier — 허용 · 거절 경계", () => {
  const cases: Array<[string, JudgmentTierRow | null, string, string | null]> = [
    ["행 없음 → 참고 · not_computed", null, "reference", "not_computed"],
    ["참고 · 이유 그대로", row(), "reference", "no_candidate"],
    ["모르는 이유 → not_computed", row({ reason: "weird" }), "reference", "not_computed"],
    ["모르는 등급 → 참고", row({ tier: "gold" }), "reference", "not_computed"],
    ["3일 넘음 → 참고", row({ tier: "verified", basisSource: "live", asOf: new Date("2026-11-08T07:59:00Z") }), "reference", "not_computed"],
    ["3일 안 → 그대로", row({ tier: "verified", basisSource: "live", reason: null, asOf: new Date("2026-11-08T08:00:00Z") }), "verified", null],
    ["검증됨인데 과거 검산 출처 → 믿지 않음", row({ tier: "verified", basisSource: "backtest_full", reason: null }), "reference", "not_computed"],
    ["주의인데 출처 없음 → 믿지 않음", row({ tier: "caution", basisSource: null, reason: null }), "reference", "not_computed"],
    ["주의 · 과거 검산", row({ tier: "caution", basisSource: "backtest_full", reason: null }), "caution", null],
  ];
  for (const [name, input, tier, reason] of cases) {
    it(name, () => {
      const view = toJudgmentTier(input, NOW);
      assert.equal(view.tier, tier);
      assert.equal(view.tierBasis.reason, reason);
      assert.equal(view.tierBasis.minEffectiveN, 620);
    });
  }

  it("구간은 정한 출처의 것 — 주의(과거 검산)면 과거 검산 구간, 그 밖엔 라이브", () => {
    const caution = toJudgmentTier(
      row({ tier: "caution", basisSource: "backtest_full", reason: null, liveCiLow: -0.1, liveCiHigh: 0.1, backtestCiLow: -0.02, backtestCiHigh: -0.001 }),
      NOW
    );
    assert.deepEqual(caution.tierBasis.spreadCi, { low: -0.02, high: -0.001 });
    assert.equal(caution.tierBasis.source, "backtest_full");
    const ref = toJudgmentTier(row({ liveCiLow: -0.1, liveCiHigh: 0.1, regimeFirst: 0.01, regimeSecond: -0.02 }), NOW);
    assert.deepEqual(ref.tierBasis.spreadCi, { low: -0.1, high: 0.1 });
    assert.deepEqual(ref.tierBasis.regimes, { first: 0.01, second: -0.02 });
    assert.equal(ref.tierBasis.source, null);
    assert.equal(ref.tierBasis.liveEffectiveN, 7.2);
  });
});
