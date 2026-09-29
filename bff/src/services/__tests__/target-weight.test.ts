import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appTargetWeightService } from "../app-target-weight.service";
import { backendApi } from "../backend-api.service";
import { TargetWeightContractError, toTargetWeightViewModel } from "../target-weight.viewmodel";

/** F010 슬라이스 5 — 목표 비중 안내 중계 (`BFF-REQ-041`) · `target-weight@2` 알트 규칙 밖 · 라이브 원장(`BFF-REQ-041` FR-4~6). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const row = (over: Record<string, unknown> = {}) => ({
  symbol: "BTC",
  held: false,
  core: true,
  sigma: 0.5,
  btcBeta: 1,
  priceKrw: 100_000_000,
  targetWeight: 0.1,
  currentWeight: 0,
  gapWeight: 0.1,
  targetValueKrw: 1_000_000,
  currentValueKrw: 0,
  gapValueKrw: 1_000_000,
  gapQuantity: 0.01,
  status: "under",
  stopPriceKrw: 91_000_000,
  lossAtStopKrw: 91_000,
  sigmaBand: { low: 0.375, high: 0.625 },
  volatilityAsOf: "2026-09-29T00:00:00.000Z",
  ...over,
});

const month = (m: string, strategy: number, btc: number) => ({ month: m, strategy, btc, exposure: 0.24 });
const record = (over: Record<string, unknown> = {}) => ({
  target: 0.15,
  strategy: { cagr: 0.115, vol: 0.163, mdd: 0.36, upside: 0.33, downside: 0.27, exposureMean: 0.3 },
  constant: { cagr: 0.1, vol: 0.182, mdd: 0.457, upside: 0.33, exposureMean: 0.3 },
  deltaMddVsBtc: [0.5, 0.278, 0.584],
  deltaCalmarVsConstant: [0.1, -0.25, 0.37],
  claims: { lessDrawdown: true, timing: false, targetHit: true },
  missedUpside: [month("2019-05", 0.162, 0.697)],
  worstMonths: [month("2018-11", -0.16, -0.363)],
  ...over,
});

const body = (over: Record<string, unknown> = {}) => ({
  status: "ok",
  basis: "investable_capital",
  capitalKrw: 10_000_000,
  capitalBelowHoldings: false,
  rows: [row()],
  excluded: [{ symbol: "SOL", held: true, reason: "volatility_unavailable", currentValueKrw: 1_000_000 }],
  totals: {
    targetExposure: 0.1,
    currentExposure: 0.1,
    cashTargetWeight: 0.9,
    sleeveSigma: 0.5,
    targetBetaSum: 0.1,
    betaCoveredWeight: 1,
    lossAtStopTotalKrw: 91_000,
    lossAtStopMonthlyBudgetRate: 0.18,
  },
  expiresAt: "2026-10-05T00:00:00.000Z",
  volatilityAsOf: "2026-09-29T00:00:00.000Z",
  targetVolatility: 0.15,
  targetVolatilityIsDefault: true,
  maxSingleAssetWeight: 0.6,
  record: record(),
  backtest: {
    preregKey: "target-weight@1",
    report: "salt-forecast/reports/x.md",
    window: { from: "2018-01-09", to: "2026-09-28" },
    cadence: "weekly",
    feeRatePerSide: 0.0005,
    holdBtc: { cagr: 0.186, vol: 0.576, mdd: 0.86, upside: 1, downside: 1, exposureMean: 1 },
  },
  renderable: true,
  blockedReason: null,
  asOf: "2026-09-30T05:00:00.000Z",
  orderExecution: false,
  ...over,
});

describe("toTargetWeightViewModel", () => {
  it("비중 · 3종 고지를 옮기고 금액은 서버 값 그대로", () => {
    const view = toTargetWeightViewModel(body());
    assert.equal(view.status, "ok");
    if (view.status !== "ok") return;
    assert.equal(view.rows[0]?.gapValueKrw, 1_000_000);
    assert.equal(view.record.holdBtc.mdd, 0.86);
    assert.deepEqual(view.record.claims, { lessDrawdown: true, timing: false, targetHit: true });
    assert.equal(view.record.preregKey, "target-weight@1");
    assert.deepEqual(view.excluded, [
      { symbol: "SOL", held: true, reason: "volatility_unavailable", currentValueKrw: 1_000_000 },
    ]);
  });

  it("실패 사례 · 과거 성적이 빠지면 비중을 옮기지 않는다", () => {
    assert.deepEqual(toTargetWeightViewModel(body({ record: record({ missedUpside: [] }) })), {
      status: "blocked",
      reason: "disclosure_missing",
    });
    assert.deepEqual(toTargetWeightViewModel(body({ record: record({ strategy: { cagr: 0.1 } }) })), {
      status: "blocked",
      reason: "disclosure_missing",
    });
    assert.deepEqual(toTargetWeightViewModel(body({ backtest: {} })), { status: "blocked", reason: "disclosure_missing" });
  });

  it("주장은 서버 판정만 — 모르면 false", () => {
    const view = toTargetWeightViewModel(body({ record: record({ claims: { lessDrawdown: "yes" } }) }));
    assert.equal(view.status === "ok" && view.record.claims.lessDrawdown, false);
  });

  it("깨진 행(σ 없음 · 모르는 상태 · 1 넘는 비중)은 빼고, 남은 행이 없으면 blocked", () => {
    const view = toTargetWeightViewModel(
      body({ rows: [row(), row({ sigma: null }), row({ status: "buy" }), row({ targetWeight: 1.4 })] }),
    );
    assert.equal(view.status === "ok" && view.rows.length, 1);
    assert.deepEqual(toTargetWeightViewModel(body({ rows: [row({ sigma: 0 })] })), {
      status: "blocked",
      reason: "no_volatility",
    });
  });

  it("서버가 renderable false 면 blocked · 행 배열 · 주문 없음 표시가 없으면 던진다", () => {
    assert.deepEqual(toTargetWeightViewModel(body({ renderable: false, rows: [] })), {
      status: "blocked",
      reason: "no_volatility",
    });
    assert.throws(() => toTargetWeightViewModel(body({ rows: null })), TargetWeightContractError);
    assert.throws(() => toTargetWeightViewModel(body({ orderExecution: true })), TargetWeightContractError);
  });
});

const altShare = {
  preregKey: "target-weight@2",
  report: "salt-forecast/reports/y.md",
  adopted: null,
  primaryTarget: 0.15,
  candidates: [
    { altShare: 0.1, deltaCalmar: [-0.032, -0.106, -0.005], cagr: 0.101, coreCagr: 0.115 },
    { altShare: 0.2, deltaCalmar: [-0.065, -0.215, -0.009], cagr: 0.087, coreCagr: 0.115 },
  ],
  survivorshipBias: true,
};
const live = (over: Record<string, unknown> = {}) => ({
  target: 0.15,
  asOf: "2027-05-03T00:00:00.000Z",
  firstRebalanceAt: "2026-10-05T00:00:00.000Z",
  nWeeks: 30,
  nExcluded: 1,
  cumReturn: 0.04,
  btcCumReturn: 0.12,
  mdd: 0.09,
  btcMdd: 0.25,
  vol: 0.16,
  upside: 0.31,
  downside: 0.27,
  worstWeeks: [{ rebalanceAt: "2026-11-09T00:00:00+00:00", strategy: -0.05, btc: -0.14, exposure: 0.3 }],
  ...over,
});

describe("toTargetWeightViewModel — target-weight@2", () => {
  it("알트 no_record · 판정 기록 · no_room · 줄인 부족분을 옮긴다", () => {
    const view = toTargetWeightViewModel(
      body({
        rows: [row({ status: "no_room", gapCapped: true, gapValueKrw: 0, gapQuantity: 0 })],
        excluded: [{ symbol: "SOL", held: true, reason: "no_record", currentValueKrw: 1_000_000 }],
        totals: { ...body().totals, outsideRuleWeight: 0.1, fundableKrw: 0 },
        altShare,
      }),
    );
    assert.equal(view.status, "ok");
    if (view.status !== "ok") return;
    assert.equal(view.rows[0]?.status, "no_room");
    assert.equal(view.rows[0]?.gapCapped, true);
    assert.equal(view.excluded[0]?.reason, "no_record");
    assert.equal(view.totals.outsideRuleWeight, 0.1);
    assert.equal(view.altShare?.adopted, null);
    assert.equal(view.altShare?.candidates.length, 2);
    assert.equal(view.live, null);
    assert.equal(view.recordSource, "backtest");
  });

  it("라이브는 서버가 live 라고 하고 온전할 때만 과거 성적 자리에", () => {
    const pick = (over: Record<string, unknown>) => {
      const view = toTargetWeightViewModel(body(over));
      return view.status === "ok" ? view.recordSource : null;
    };
    assert.equal(pick({ live: live(), recordSource: "live", liveMinWeeks: 30 }), "live");
    assert.equal(pick({ live: live({ nWeeks: 12 }), recordSource: "live" }), "backtest");
    assert.equal(pick({ live: live({ mdd: null }), recordSource: "live" }), "backtest");
    assert.equal(pick({ live: live({ worstWeeks: [] }), recordSource: "live" }), "backtest");
    // 서버가 문턱을 낮춰 보내도 등록 문턱 30 아래로는 내리지 않는다
    assert.equal(pick({ live: live({ nWeeks: 10 }), recordSource: "live", liveMinWeeks: 5 }), "backtest");
    assert.equal(pick({ live: live(), recordSource: "backtest" }), "backtest");
  });

  it("라이브 진행 n/30 을 옮기고 깨진 판정 기록은 null", () => {
    const view = toTargetWeightViewModel(body({ live: live({ nWeeks: 3 }), altShare: { preregKey: "x" } }));
    assert.equal(view.status === "ok" && view.live?.nWeeks, 3);
    assert.equal(view.status === "ok" && view.live?.minWeeks, 30);
    assert.equal(view.status === "ok" && view.altShare, null);
  });
});

describe("AppTargetWeightService", () => {
  afterEach(() => mock.restoreAll());

  it("서버 /coach/target-weights 를 부른다", async () => {
    const calls: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, path: string) => {
      calls.push(path);
      return ok(body());
    });
    const result = await appTargetWeightService.get("t");
    assert.deepEqual(calls, ["/coach/target-weights"]);
    assert.equal(result.status, "ok");
  });

  it("5xx · 계약 깨짐은 200 unavailable, 4xx 는 그대로", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    assert.deepEqual(await appTargetWeightService.get("t"), { status: "unavailable" });
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => ok(body({ rows: "x" })));
    assert.deepEqual(await appTargetWeightService.get("t"), { status: "unavailable" });
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(401);
    });
    await assert.rejects(() => appTargetWeightService.get("t"));
  });
});
