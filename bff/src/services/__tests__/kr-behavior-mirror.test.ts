import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appBehaviorMirrorService } from "../app-behavior-mirror.service";
import { backendApi } from "../backend-api.service";
import { toKrBehaviorMirrorViewModel } from "../kr-behavior-mirror.viewmodel";

/** F011 FR-47 — 국내 주식 미러 뷰모델 · 서비스 (`BFF-REQ-040` FR-24). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });
const metric = (value: number | null, sampleSize = 25, status = "ok") => ({ value, sampleSize, status });
const src = { source: "KCMI", url: "https://example.com", period: "2020-03~2020-10", market: "국내 주식" };

const krMirror = (over: Record<string, unknown> = {}) => ({
  status: "ok",
  turnover: {
    dailyTurnover: metric(0.0145, 159),
    tradedNotionalKrw: 2_305_000,
    tradeCount: 6,
    windowTradingDays: 250,
    baseline: { ...src, unit: "daily", newRetailDailyTurnover: 0.068, marketDailyTurnover: 0.014 },
  },
  disposition: {
    pgr: metric(0.5, 2, "insufficient_sample"),
    plr: metric(0, 2, "insufficient_sample"),
    counts: {},
    gainHoldingDays: metric(85.5, 2, "insufficient_sample"),
    lossHoldingDays: metric(null, 0, "insufficient_data"),
    dayUnit: "trading_day",
    missingCloses: [],
  },
  nextDaySell: {
    gainSellRate: metric(0.3),
    lossSellRate: metric(0.1),
    counts: {},
    baseline: { ...src, gainSellRate: 0.41, lossSellRate: 0.22 },
  },
  chase: {
    avgPriorReturn: metric(0.454, 4, "insufficient_sample"),
    medianPriorReturn: metric(0.464, 4, "insufficient_sample"),
    counts: { measured: 4, shortHistory: 1, breaks: 2 },
    windowTradingDays: 40,
    baseline: { ...src, priorReturn: 0.258 },
  },
  lottery: {
    buyShare: metric(0, 4, "insufficient_sample"),
    marketShare: 0.149,
    counts: { lotteryBuys: 0, judgedBuys: 4, unknownBuys: 1 },
    lookbackMonths: 6,
    buyWindowDays: 365,
    definition: "kumar2009_total_volatility",
    evidence: { ...src, period: "2016~2023", excessReturn: -0.1042 },
  },
  tradeCount: 6,
  minSample: 20,
  asOf: "2026-10-26T09:00:00.000Z",
  ...over,
});

afterEach(() => mock.restoreAll());

describe("toKrBehaviorMirrorViewModel", () => {
  it("지표 · 기준점을 옮기고 · 못 잰 추격 매수를 합친다", () => {
    const view = toKrBehaviorMirrorViewModel(krMirror());
    assert.equal(view.historyStatus, "ok");
    assert.deepEqual(view.turnover.dailyTurnover, metric(0.0145, 159));
    assert.equal(view.turnover.baseline?.newRetailDailyTurnover, 0.068);
    assert.equal(view.nextDaySell.baseline?.gainSellRate, 0.41);
    assert.equal(view.chase.excluded, 3);
    assert.equal(view.chase.baseline?.priorReturn, 0.258);
    assert.equal(view.lottery.marketShare, 0.149);
    assert.equal(view.lottery.unknownBuys, 1);
    assert.equal(view.lottery.evidence?.excessReturn, -0.1042);
    assert.equal(view.disposition?.lossHoldingDays.value, null);
    assert.equal(view.tradeCount, 6);
  });

  it("출처가 빠진 기준점은 주지 않는다 · 값 없는 ok 는 insufficient_data", () => {
    const raw = krMirror();
    const view = toKrBehaviorMirrorViewModel({
      ...raw,
      chase: { ...raw.chase, baseline: { priorReturn: 0.258 } },
      lottery: { ...raw.lottery, buyShare: metric(null, 4, "ok") },
    });
    assert.equal(view.chase.baseline, null);
    assert.equal(view.lottery.buyShare.status, "insufficient_data");
  });

  it("잘린 원장은 값 없이 그대로 · 뼈대가 깨지면 던진다", () => {
    const view = toKrBehaviorMirrorViewModel({
      status: "truncated",
      turnover: { dailyTurnover: null },
      disposition: null,
      nextDaySell: {},
      chase: {},
      lottery: {},
      minSample: 20,
    });
    assert.equal(view.historyStatus, "truncated");
    assert.equal(view.turnover.dailyTurnover.value, null);
    assert.equal(view.disposition, null);
    assert.throws(() => toKrBehaviorMirrorViewModel({ status: "weird" }));
  });
});

describe("appBehaviorMirrorService.getKrMirror", () => {
  it("국내 경로를 8초 · 재시도 없이 부른다", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok(krMirror()));
    const result = await appBehaviorMirrorService.getKrMirror("t");
    assert.equal(result.status, "ok");
    assert.equal(call.mock.callCount(), 1);
    const [method, path, , , options] = call.mock.calls[0].arguments as unknown as [string, string, string, unknown, { timeout: number }];
    assert.equal(method, "GET");
    assert.equal(path, "/coach/mirror/kr-stock");
    assert.equal(options.timeout, 8_000);
  });

  it("소유자 404 는 그대로 올리고 · 5xx 는 unavailable", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(404);
    });
    await assert.rejects(() => appBehaviorMirrorService.getKrMirror("t"));
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    assert.deepEqual(await appBehaviorMirrorService.getKrMirror("t"), { status: "unavailable" });
  });
});
