import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { __resetDetailMemory, appAICoachService } from "../app-ai-coach.service";
import { backendApi } from "../backend-api.service";

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
    validity: { code: "scalp_24h" },
    riskLevel: "medium",
    headline: "h",
    reasons: ["r"],
    risks: [],
  },
  signalType: "scalp.wait",
  observations: [{ item: "rsi", value: 48, lower: 35, upper: 70, distance: 13, points: 0, missing: false }],
  caveats: [],
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

describe("toModeViewModel — 판단은 늘 있다 (ADR-010 v2 · BFF-REQ-052 FR-1)", () => {
  it("판단 · 관측 · 성적표 · 실패사례 · 꼬리표 · 구간을 싣는다", () => {
    const vm = toModeViewModel(modeView());
    assert.equal(vm?.judgment.score, 52);
    assert.equal(vm?.failureCases.length, 1);
    assert.deepEqual(vm?.observations[0], { item: "rsi", value: 48, lower: 35, upper: 70, distance: 13, points: 0, missing: false });
    assert.deepEqual(vm?.caveats, []);
    assert.deepEqual(vm?.zone, zone);
  });

  it("라벨 등급 — 서버 값 그대로, 모르는 값 · 옛 서버 · 출처가 어긋나면 참고(not_computed) (BFF-REQ-052 FR-1)", () => {
    const basis = { source: null, reason: "no_candidate", liveEffectiveN: 7, minEffectiveN: 620, spreadCi: null, regimes: { first: null, second: null } };
    const ref = toModeViewModel(modeView({ tier: "reference", tierBasis: basis }));
    assert.equal(ref?.tier, "reference");
    assert.deepEqual(ref?.tierBasis, { source: null, reason: "no_candidate", liveEffectiveN: 7, minEffectiveN: 620, spreadCi: null });
    const caution = toModeViewModel(
      modeView({ tier: "caution", tierBasis: { ...basis, source: "backtest_full", reason: null, spreadCi: { low: -0.02, high: -0.001 } } }),
    );
    assert.equal(caution?.tier, "caution");
    assert.deepEqual(caution?.tierBasis.spreadCi, { low: -0.02, high: -0.001 });
    const cases: Array<[unknown, unknown]> = [
      [undefined, undefined],
      ["gold", basis],
      ["verified", { ...basis, source: "backtest_full" }],
      ["caution", basis],
      ["reference", { ...basis, liveEffectiveN: "7" }],
    ];
    for (const [tier, tierBasis] of cases) {
      const vm = toModeViewModel(modeView({ tier, tierBasis }));
      assert.equal(vm?.tier, "reference", String(tier));
      assert.equal(vm?.tierBasis.reason, "not_computed");
    }
    assert.equal(toModeViewModel(modeView({ tier: "reference", tierBasis: { ...basis, reason: "weird" } }))?.tierBasis.reason, "not_computed");
  });

  it("성적 출처 — backtest 는 그대로, 없으면(옛 서버) live, 모르는 값은 모의 라벨 쪽 (F011 슬라이스 7b)", () => {
    const origin = (sampleOrigin: unknown) =>
      toModeViewModel(modeView({ trackRecord: { ...trackRecord, sampleOrigin } as ServerModeView["trackRecord"] }))
        ?.trackRecord.sampleOrigin ?? null;
    assert.equal(origin("backtest"), "backtest");
    assert.equal(origin("live"), "live");
    assert.equal(origin(undefined), "live");
    assert.equal(origin("synthetic"), "backtest");
  });

  it("confidence 를 서버가 보내도 옮기지 않는다 (D3)", () => {
    const view = modeView();
    (view.judgment as unknown as Record<string, unknown>).confidence = 0.8;
    const vm = toModeViewModel(view);
    assert.ok(vm);
    assert.equal(JSON.stringify(vm).includes("confidence"), false);
  });

  it("꼬리표는 서버 사실 그대로 · 모르는 사유는 unknown 으로 남긴다(버리지 않음)", () => {
    const caveats = [
      { reason: "live_sample_short", live: 12, min: 20, backtest: 2310 },
      { reason: "stale_inputs", items: [{ item: "technical_indicator", lastAt: "2026-11-07T00:00:00.000Z" }] },
      { reason: "brand_new_reason", x: 1 },
    ];
    const vm = toModeViewModel(modeView({ caveats }));
    assert.deepEqual(vm?.caveats, [caveats[0], caveats[1], { reason: "unknown" }]);
  });

  it("3종 결함이면 실패사례가 비어도 판단을 내보낸다 — 숨기지 않는다", () => {
    const vm = toModeViewModel(
      modeView({ failureCases: [], caveats: [{ reason: "backtest_missing", live: 0, min: 20 }] }),
    );
    assert.ok(vm);
    assert.equal(vm?.judgment.label, "관망");
    assert.deepEqual(vm?.caveats, [{ reason: "backtest_missing", live: 0, min: 20 }]);
  });

  it("국내 주식 — 자산군 · 이력 수치를 옮기고, 모양이 틀린 이력은 null (F011 슬라이스 4)", () => {
    const history = { ready: false, dailyBars: 63, requiredDailyBars: 120, dailyIndicator: true };
    const vm = toModeViewModel(modeView({ assetClass: "kr_stock", history }));
    assert.equal(vm?.assetClass, "kr_stock");
    assert.deepEqual(vm?.history, history);
    assert.equal(toModeViewModel(modeView({ assetClass: "kr_stock", history: { dailyBars: "63" } }))?.history, null);
    // 모르는 자산군은 코인으로 읽는다(서버가 옛 버전)
    assert.equal(toModeViewModel(modeView({ assetClass: "x" }))?.assetClass, "crypto");
  });

  /** 모양이 깨진 모드만 내보내지 않는다 (`BFF-REQ-025` FR-40 v2) — 판단을 숨기는 경로가 아니다 */
  it("꼬리표가 배열이 아니면(옛 서버 · 깨짐) null", () => {
    assert.equal(toModeViewModel(modeView({ caveats: undefined })), null);
    assert.equal(toModeViewModel(modeView({ caveats: "none" })), null);
    assert.equal(toModeViewModel(undefined), null);
  });

  it("결함 꼬리표 없이 실패사례가 비거나 · 성적표 · scoreNote 가 없으면 null", () => {
    assert.equal(toModeViewModel(modeView({ failureCases: [] })), null);
    assert.equal(toModeViewModel(modeView({ trackRecord: null })), null);
    const noNote = modeView();
    noNote.judgment!.scoreNote = "";
    assert.equal(toModeViewModel(noNote), null);
  });

  it("보유 구간 basis 는 아는 값만 남긴다(F010 슬라이스 3)", () => {
    const held = (basis: unknown) => ({
      kind: "held_rule" as const,
      notPrediction: true as const,
      currentPrice: 100,
      stages: [],
      status: "hold_plan",
      basis,
    });
    const known = toModeViewModel(modeView({ zone: held("volatility") as never }));
    const unknownBasis = toModeViewModel(modeView({ zone: held("atr") as never }));
    assert.equal(known?.zone.kind === "held_rule" && known.zone.basis, "volatility");
    assert.equal(unknownBasis !== null && "basis" in unknownBasis.zone, false);
  });

  it("zone 이 없으면 null (FR-45 계약)", () => {
    assert.equal(toModeViewModel(modeView({ zone: undefined })), null);
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

    assert.ok(vm.modes.scalp?.judgment);
    assert.ok(vm.modes.longTerm?.judgment);
    assert.deepEqual(vm.gaugeTrackRecords, [{ ...gauge, baselinePositiveRate: null, claim: null }]);
    assert.deepEqual(vm.degradedFields, []);
    assert.ok(vm.disclaimer);
  });

  it("뉴스 실패는 degradedFields: ['news'] 이고 판단은 응답한다", () => {
    const vm = toSymbolCoachViewModel(serverCoach(), null);

    assert.deepEqual(vm.evidence.news, []);
    assert.deepEqual(vm.degradedFields, ["news"]);
    assert.ok(vm.modes.scalp?.judgment);
  });

  it("계약이 깨진 모드는 null 이고 degradedFields 에 이름이 있다", () => {
    const vm = toSymbolCoachViewModel(
      serverCoach({ modes: { scalp: modeView({ caveats: undefined }) } }),
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
      "exchangeFlag",
      "gaugeTrackRecords",
      "missingData",
      "mode",
      "modes",
      "preflightDefaults",
      "riskGuard",
      "staleSince",
      "symbol",
    ]);
    assert.equal(JSON.stringify(vm).includes("confidence"), false);
    assert.equal(vm.modes.scalp?.zone.kind, "observation");
  });
});

describe("거래소 표시 (F010 슬라이스 6 · FR-6)", () => {
  const AT = "2026-09-30T00:00:00.000Z";

  it("서버가 단 exchange_warning 꼬리표는 그대로 · 판단도 그대로 · 표시가 실린다 (ADR-010 v2)", () => {
    const warned = modeView({ caveats: [{ reason: "exchange_warning", cautions: [], checkedAt: AT }] });
    const vm = toSymbolCoachViewModel(
      serverCoach({
        modes: { scalp: warned, longTerm: warned },
        exchangeFlag: { warning: true, cautions: [], fetchedAt: AT },
      }),
      { articles: [] },
    );
    assert.equal(vm.modes.scalp?.judgment.label, "관망");
    assert.deepEqual(vm.modes.scalp?.caveats, [{ reason: "exchange_warning", cautions: [], checkedAt: AT }]);
    assert.deepEqual(vm.exchangeFlag, { warning: true, cautions: [], fetchedAt: AT });
  });

  it("투자유의인데 서버 꼬리표에 없으면 꼬리표를 더하는 쪽으로만 고친다 — 판단은 숨기지 않는다", () => {
    const vm = toSymbolCoachViewModel(
      serverCoach({ exchangeFlag: { warning: true, cautions: [], fetchedAt: AT } }),
      { articles: [] },
    );
    assert.equal(vm.modes.scalp?.caveats[0].reason, "exchange_warning");
    assert.equal(vm.modes.longTerm?.caveats[0].reason, "exchange_warning");
    assert.equal(vm.modes.scalp?.judgment.label, "관망");
  });

  it("주의만이면 꼬리표 없음 · 모르는 주의 코드는 버린다", () => {
    const vm = toSymbolCoachViewModel(
      serverCoach({
        exchangeFlag: { warning: false, cautions: ["NEW_CODE", "PRICE_FLUCTUATIONS"], fetchedAt: AT },
      }),
      { articles: [] },
    );
    assert.deepEqual(vm.modes.scalp?.caveats, []);
    assert.deepEqual(vm.exchangeFlag?.cautions, ["PRICE_FLUCTUATIONS"]);
  });

  it("표시가 없거나 모양이 틀리면 null", () => {
    assert.equal(toSymbolCoachViewModel(serverCoach(), { articles: [] }).exchangeFlag, null);
    assert.equal(
      toSymbolCoachViewModel(serverCoach({ exchangeFlag: { warning: "yes", fetchedAt: AT } }), { articles: [] })
        .exchangeFlag,
      null,
    );
  });
});

/** BFF-REQ-052 FR-2 — 판단 호출이 시간을 넘기면 마지막 판단을 기준 시각과 함께(10분 안 · 토큰마다) */
describe("AppAICoachService.getDetail — 마지막 판단", () => {
  afterEach(() => {
    mock.restoreAll();
    mock.timers.reset();
    __resetDetailMemory();
  });
  const timeout = Object.assign(new Error("timeout of 300ms exceeded"), { code: "ECONNABORTED" });
  const backend = (fail: () => boolean) =>
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      if (url.startsWith("/market-intelligence")) return { data: { success: true, data: { items: [] } } } as never;
      if (fail()) throw timeout;
      return { data: { success: true, data: serverCoach() } } as never;
    });

  it("새 판단이면 staleSince null · 실패하면 마지막 판단과 받은 시각", async () => {
    let failing = false;
    backend(() => failing);
    const fresh = await appAICoachService.getDetail("tok-a", { symbol: "BTC" });
    assert.equal(fresh.staleSince, null);
    failing = true;
    const kept = await appAICoachService.getDetail("tok-a", { symbol: "BTC" });
    assert.equal(kept.symbol, "BTC");
    assert.ok(kept.staleSince && !Number.isNaN(Date.parse(kept.staleSince)));
  });

  it("다른 토큰 · 다른 종목 · 다른 모드에는 주지 않는다 — 504 그대로", async () => {
    let failing = false;
    backend(() => failing);
    await appAICoachService.getDetail("tok-a", { symbol: "BTC" });
    failing = true;
    await assert.rejects(appAICoachService.getDetail("tok-b", { symbol: "BTC" }), /timeout/);
    await assert.rejects(appAICoachService.getDetail("tok-a", { symbol: "ETH" }), /timeout/);
    await assert.rejects(appAICoachService.getDetail("tok-a", { symbol: "BTC", mode: "scalp" }), /timeout/);
  });

  it("10분 넘은 판단은 주지 않는다", async () => {
    mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-10T05:00:00Z") });
    let failing = false;
    backend(() => failing);
    await appAICoachService.getDetail("tok-a", { symbol: "BTC" });
    failing = true;
    mock.timers.tick(10 * 60_000);
    assert.ok((await appAICoachService.getDetail("tok-a", { symbol: "BTC" })).staleSince);
    mock.timers.tick(1);
    await assert.rejects(appAICoachService.getDetail("tok-a", { symbol: "BTC" }), /timeout/);
  });
});
