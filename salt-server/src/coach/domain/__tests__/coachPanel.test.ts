import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PANEL_HORIZON_MODE,
  causeTier,
  explanationTier,
  panelMine,
  panelStatus,
  trackTier,
  verdictTier,
} from "../policy/coachPanel";
import { MIN_JUDGMENT_SAMPLE } from "../policy/symbolJudgment";

/**
 * 한 장 패널 — 칸마다 단 경계 표(F017 v4 1d · `SRV-REQ-053` FR-13 · `OPS-004`).
 * 불변식: 어느 입력이든 단은 넷 중 하나이고, 결함은 "말할 수 없을 때"뿐이다(대신 채운 값은 결함이 아니다).
 */

describe("단 → 화면 상태", () => {
  for (const [tier, status] of [
    ["now", "ok"],
    ["usual", "fallback"],
    ["longer", "fallback"],
    ["defect", "degraded"],
  ] as const) {
    it(`${tier} → ${status}`, () => assert.equal(panelStatus(tier), status));
  }
});

describe("점검 한 줄", () => {
  it("조건이 섰으면 now · 조건 없음은 평소 · 표본 모자람은 결함", () => {
    assert.equal(verdictTier("ok"), "now");
    assert.equal(verdictTier("no_condition"), "usual");
    assert.equal(verdictTier("below_min"), "defect");
  });
});

describe("성적 — 문턱 경계", () => {
  const cases: Array<[number, "live" | "backtest", string]> = [
    [0, "live", "defect"],
    [MIN_JUDGMENT_SAMPLE - 1, "live", "defect"],
    [MIN_JUDGMENT_SAMPLE, "live", "now"],
    [MIN_JUDGMENT_SAMPLE - 1, "backtest", "defect"],
    [MIN_JUDGMENT_SAMPLE, "backtest", "longer"],
    [500, "backtest", "longer"],
  ];
  for (const [sample, sampleOrigin, tier] of cases) {
    it(`${sampleOrigin} ${sample} → ${tier}`, () => assert.equal(trackTier({ sample, sampleOrigin }), tier));
  }
});

describe("해설 4단 — 문장이 늘 있으니 결함 단은 없다", () => {
  it("최신 now · 이전 usual · 사실표 · 소식 없음 longer", () => {
    assert.equal(explanationTier("latest"), "now");
    assert.equal(explanationTier("previous"), "usual");
    assert.equal(explanationTier("template"), "longer");
    assert.equal(explanationTier("none"), "longer");
  });
});

describe("원인", () => {
  it("근거가 받친 원인은 now · '확인된 소식 없음'도 데이터(usual) · 못 읽음만 결함", () => {
    assert.equal(causeTier("likely"), "now");
    assert.equal(causeTier("possible"), "now");
    assert.equal(causeTier("none"), "usual");
    assert.equal(causeTier(null), "defect");
  });
});

describe("기간 탭 → 모드", () => {
  it("1h · 4h 단타 · 1d · 5d 장기", () => {
    assert.deepEqual(PANEL_HORIZON_MODE, { "1h": "scalp", "4h": "scalp", "1d": "long_term", "5d": "long_term" });
  });
});

describe("내 기준(FR-15)", () => {
  const holding = { quantity: 2, averageBuyPrice: 100, unrealizedProfit: 20, unrealizedProfitRate: 10 };

  it("보유가 없거나 0 이면 칸 없음", () => {
    assert.equal(panelMine({ holding: null, price: 110, plan: null, hidePurchasePrice: false }), null);
    assert.equal(panelMine({ holding: { ...holding, quantity: 0 }, price: 110, plan: null, hidePurchasePrice: false }), null);
  });

  it("손절가가 먼저 · 거리는 지금 가격 대비(선이 아래면 음수)", () => {
    const view = panelMine({ holding, price: 110, plan: { stopPrice: 99, targetPrice: 130 }, hidePurchasePrice: false })!;
    assert.deepEqual(view.line, { kind: "stop", price: 99 });
    assert.ok(Math.abs(view.gapToLinePct! - -10) < 1e-9);
    assert.equal(view.averageBuyPrice, 100);
  });

  it("손절가가 없으면 목표가 · 둘 다 없으면 선 없음(평단은 그대로)", () => {
    assert.deepEqual(
      panelMine({ holding, price: 110, plan: { stopPrice: null, targetPrice: 121 }, hidePurchasePrice: false })!.line,
      { kind: "target", price: 121 }
    );
    const none = panelMine({ holding, price: 110, plan: null, hidePurchasePrice: false })!;
    assert.equal(none.line, null);
    assert.equal(none.gapToLinePct, null);
    assert.equal(none.unrealizedProfitRate, 10);
  });

  it("가격을 모르면 거리를 말하지 않는다", () => {
    assert.equal(panelMine({ holding, price: null, plan: { stopPrice: 99, targetPrice: null }, hidePurchasePrice: false })!.gapToLinePct, null);
  });

  it("매입가 숨김이면 평단 · 평가 손익이 빠지고 선까지 거리만", () => {
    const view = panelMine({ holding, price: 110, plan: { stopPrice: 99, targetPrice: null }, hidePurchasePrice: true })!;
    assert.equal(view.averageBuyPrice, null);
    assert.equal(view.unrealizedProfit, null);
    assert.equal(view.unrealizedProfitRate, null);
    assert.notEqual(view.gapToLinePct, null);
  });
});
