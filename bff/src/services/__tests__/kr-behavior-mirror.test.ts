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

describe("toKrBehaviorMirrorViewModel · 배치 결과 구역", () => {
  it("코인 미러와 같은 조각 함수로 태그 손익 · 준수율 · 손실 비대칭을 옮긴다 · 없으면 비운다", () => {
    const view = toKrBehaviorMirrorViewModel(
      krMirror({
        adherence: {
          rate: metric(0.5, 2, "insufficient_sample"),
          labelCounts: { honored: 1, stop_not_honored: 1 },
          honoredAvgReturn: metric(0.02, 1, "insufficient_sample"),
          violatedAvgReturn: metric(-0.05, 1, "insufficient_sample"),
        },
        tagCosts: [{ tag: "off_plan", count: 2, netPnlKrw: -10_000, avgReturn: -0.01, avgR: null, rSampleSize: 0, status: "insufficient_sample", noEdge: false }],
        lossAsymmetry: { ratio: metric(0.5, 2, "insufficient_sample"), maxLossKrw: -10_000, maxGainKrw: 20_000, window: 20 },
        outcomeCount: 2,
        outcomesComputedAt: "2026-10-26T00:00:00.000Z",
      }),
    );
    assert.equal(view.adherence?.labelCounts.stop_slipped, 0, "빠진 라벨은 0");
    assert.equal(view.tagCosts[0].tag, "off_plan");
    assert.equal(view.lossAsymmetry?.maxGainKrw, 20_000);
    assert.equal(view.outcomeCount, 2);
    const empty = toKrBehaviorMirrorViewModel(krMirror());
    assert.equal(empty.adherence, null);
    assert.deepEqual(empty.tagCosts, []);
    assert.equal(empty.streak, null);
    assert.equal(empty.outcomeCount, 0);
  });
});

describe("appBehaviorMirrorService.listOutcomes · 자산군", () => {
  it("assetType 을 쿼리로 넘기고 · 없으면 붙이지 않는다", async () => {
    const row = { id: "o1", symbol: "005930", openedAt: "2026-08-02T15:00:00.000Z", closedAt: "2026-08-31T15:00:00.000Z", netPnlKrw: 215000, name: "삼성전자", logoUrl: "https://img.example/005930.png" };
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok({ outcomes: [row] }));
    const listed = await appBehaviorMirrorService.listOutcomes("t", 20, undefined, "kr_stock");
    assert.equal(listed.status === "ok" && listed.outcomes[0].name, "삼성전자", "국내 종목 이름 · 로고를 옮긴다");
    await appBehaviorMirrorService.listOutcomes("t", undefined);
    assert.equal(call.mock.calls[0].arguments[1], "/coach/outcomes?limit=20&assetType=kr_stock");
    assert.equal(call.mock.calls[1].arguments[1], "/coach/outcomes");
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
