import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SymbolCoachContractError,
  toModeViewModel,
  toSymbolCoachViewModel,
  type ServerModeView,
  type ServerSymbolCoach,
} from "../symbol-coach.viewmodel";

const zone = {
  kind: "observation" as const,
  notPrediction: true as const,
  currentPrice: 100,
  lower: 90,
  mid: 100,
  upper: 110,
  priceGap: { lower: -10, mid: 0, upper: 10 },
  ruleCode: "close_p20_p50_p80_m5_24h",
  lookback: { timeframe: "m5" as const, days: 1 },
  sample: 280,
};

const trackRecord = {
  signalType: "scalp.wait",
  sample: 24,
  winRate: 0.5,
  avgReturn: 0.01,
  worstObservedReturn: -0.05,
  lowSample: false,
  horizonHours: 24,
};

const failureCase = {
  date: "2026-09-01",
  symbol: "BTC",
  event: "scalp.wait",
  outcome: "miss" as const,
  returnRate: -0.03,
};

const modeView = (overrides: Partial<ServerModeView> = {}): ServerModeView => ({
  judgment: {
    action: "wait",
    label: "관망",
    score: 52,
    scoreNote: "점수는 확률이 아닙니다",
    validity: { code: "scalp_5m_24h" },
    riskLevel: "medium",
    headline: "h",
    reasons: ["r"],
    risks: [],
  },
  signalType: "scalp.wait",
  renderable: true,
  blockedReason: null,
  trackRecord,
  failureCases: [failureCase],
  zone,
  ...overrides,
});

const serverCoach = (
  overrides: Partial<ServerSymbolCoach> = {},
): ServerSymbolCoach => ({
  symbol: "BTC",
  mode: "scalp",
  modes: { scalp: modeView(), longTerm: modeView() },
  gaugeTrackRecords: [],
  riskGuard: { hasHolding: true, holdingWeightLimit: 0.3 },
  evidence: {
    price: 100,
    change24h: 1,
    sentiment: null,
    technical: null,
    whale: { buyAmountKRW: 0, sellAmountKRW: 0, count: 0 },
  },
  missingData: [],
  dataFreshness: {
    priceUpdatedAt: null,
    sentimentCalculatedAt: null,
    indicatorTimestamp: null,
    generatedAt: "2026-09-22T00:00:00.000Z",
  },
  disclaimer: "과거 판단의 결과이며 앞으로의 수익을 뜻하지 않습니다.",
  ...overrides,
});

describe("toModeViewModel", () => {
  it("renderable: true 는 판단 · 성적표 · 실패사례 · 구간을 싣는다", () => {
    const vm = toModeViewModel(modeView());

    assert.equal(vm?.renderable, true);
    if (vm?.renderable !== true) return;
    assert.equal(vm.judgment.score, 52);
    assert.equal(vm.failureCases.length, 1);
    assert.deepEqual(vm.zone, zone);
  });

  it("confidence 를 서버가 보내도 옮기지 않는다 (D3)", () => {
    const view = modeView();
    (view.judgment as unknown as Record<string, unknown>).confidence = 0.8;

    const vm = toModeViewModel(view);

    assert.ok(vm?.renderable);
    assert.equal(JSON.stringify(vm).includes("confidence"), false);
  });

  it("renderable: false 에는 판단 · 성적표가 없고 표본 수와 구간만 있다 (FR-31)", () => {
    const vm = toModeViewModel(
      modeView({ renderable: false, blockedReason: "insufficient_sample" }),
    );

    assert.deepEqual(vm, {
      renderable: false,
      blockedReason: "insufficient_sample",
      trackSample: 24,
      zone,
    });
  });

  it("성적표가 없으면 trackSample 은 null 이다 — 0 을 만들지 않는다", () => {
    const vm = toModeViewModel(
      modeView({
        renderable: false,
        blockedReason: "signal_track_record_missing",
        trackRecord: null,
      }),
    );

    assert.equal(vm?.renderable === false && vm.trackSample, null);
  });

  /** 게이트 필드가 없는 판단을 내보내지 않는다 (`BFF-REQ-025` FR-40) */
  it("renderable 이 불리언이 아니면 null", () => {
    assert.equal(toModeViewModel(modeView({ renderable: undefined })), null);
    assert.equal(toModeViewModel(modeView({ renderable: "true" })), null);
    assert.equal(toModeViewModel(undefined), null);
  });

  /** 서버가 열었어도 3종 세트가 비었으면 막는다. BFF 가 여는 경로는 없다 */
  it("renderable: true 인데 실패사례 · 성적표 · scoreNote 가 비면 null", () => {
    assert.equal(toModeViewModel(modeView({ failureCases: [] })), null);
    assert.equal(toModeViewModel(modeView({ trackRecord: null })), null);
    const noNote = modeView();
    noNote.judgment!.scoreNote = "";
    assert.equal(toModeViewModel(noNote), null);
  });

  it("zone 이 없으면 null (FR-45 계약)", () => {
    assert.equal(toModeViewModel(modeView({ zone: undefined })), null);
  });

  it("renderable: false 인데 blockedReason 이 없으면 null", () => {
    assert.equal(
      toModeViewModel(modeView({ renderable: false, blockedReason: null })),
      null,
    );
  });
});

describe("toSymbolCoachViewModel", () => {
  it("두 모드 · 게이지 · 면책을 한 응답에 싣는다", () => {
    const gauge = {
      gauge: "sentiment" as const,
      bucketCode: "60_80",
      currentValue: 70,
      horizonDays: 30,
      sample: 1,
      p25: null,
      median: 0.02,
      p75: null,
      positiveRate: 1,
      lowSample: true,
    };
    const vm = toSymbolCoachViewModel(
      serverCoach({ gaugeTrackRecords: [gauge] }),
      { articles: [] },
    );

    assert.equal(vm.modes.scalp?.renderable, true);
    assert.equal(vm.modes.longTerm?.renderable, true);
    assert.deepEqual(vm.gaugeTrackRecords, [gauge]);
    assert.deepEqual(vm.degradedFields, []);
    assert.ok(vm.disclaimer);
  });

  it("뉴스 실패는 degradedFields: ['news'] 이고 판단은 응답한다", () => {
    const vm = toSymbolCoachViewModel(serverCoach(), null);

    assert.deepEqual(vm.evidence.news, []);
    assert.deepEqual(vm.degradedFields, ["news"]);
    assert.equal(vm.modes.scalp?.renderable, true);
  });

  it("계약이 깨진 모드는 null 이고 degradedFields 에 이름이 있다", () => {
    const vm = toSymbolCoachViewModel(
      serverCoach({ modes: { scalp: modeView({ renderable: undefined }) } }),
      { articles: [] },
    );

    assert.equal(vm.modes.scalp, null);
    assert.equal(vm.modes.longTerm, null);
    assert.deepEqual(vm.degradedFields, ["modes.scalp", "modes.longTerm"]);
  });

  it("면책 문구가 없으면 응답하지 않는다 (FR-22)", () => {
    assert.throws(
      () => toSymbolCoachViewModel(serverCoach({ disclaimer: "" }), null),
      SymbolCoachContractError,
    );
  });

  it("preflightDefaults 에 목표가가 없다 (B1)", () => {
    const vm = toSymbolCoachViewModel(serverCoach(), null);

    assert.deepEqual(vm.preflightDefaults, {
      symbol: "BTC",
      entryPrice: 100,
      mode: "scalp",
    });
  });

  it("riskGuard 는 보유 여부와 비중 한도만 — 보유 금액을 싣지 않는다", () => {
    const coach = serverCoach();
    Object.assign(coach.riskGuard, { currentValue: 5_000_000 });

    const vm = toSymbolCoachViewModel(coach, null);

    assert.deepEqual(vm.riskGuard, { hasHolding: true, holdingWeightLimit: 0.3 });
  });

  it("뉴스는 화면이 쓰는 필드만 옮긴다", () => {
    const vm = toSymbolCoachViewModel(serverCoach(), {
      articles: [
        {
          id: "n1",
          title: "t",
          source: "s",
          url: "https://example.com/a",
          publishedAt: "2026-09-22T00:00:00.000Z",
          summary: "긴 요약",
          sentiment: "positive",
        },
      ],
    });

    assert.deepEqual(Object.keys(vm.evidence.news[0]).sort(), [
      "id",
      "publishedAt",
      "source",
      "title",
      "url",
    ]);
  });

  /** 계약 스냅샷 — 이 키 목록이 바뀌면 프론트가 깨진다 (`BFF-REQ-025` FR-45) */
  it("최상위 키 스냅샷 · confidence 부재", () => {
    const vm = toSymbolCoachViewModel(serverCoach(), { articles: [] });

    assert.deepEqual(Object.keys(vm).sort(), [
      "dataFreshness",
      "degradedFields",
      "disclaimer",
      "evidence",
      "gaugeTrackRecords",
      "missingData",
      "mode",
      "modes",
      "preflightDefaults",
      "riskGuard",
      "symbol",
    ]);
    assert.equal(JSON.stringify(vm).includes("confidence"), false);
    assert.equal(vm.modes.scalp?.zone.kind, "observation");
  });
});
