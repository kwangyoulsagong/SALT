import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appForecastService } from "../app-forecast.service";
import { backendApi } from "../backend-api.service";
import { toForecastViewModel } from "../forecast.viewmodel";

/** 가격 변동 범위 (F008 `BFF-REQ-037` · `ADR-003`). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const horizon = (h: number, over: Record<string, unknown> = {}) => ({
  horizonWeeks: h,
  renderable: true,
  asOf: "2026-09-23T00:00:00.000Z",
  basePrice: 115_650_000,
  range: { low: 107_087_430, lowerQuartile: 111_000_000, median: 115_800_948, upperQuartile: 120_000_000, high: 125_382_948, coverage: 90 },
  scenario: { quantity: 0.05, valueChangeLow: -428_128, valueChangeMedian: 7_547, valueChangeHigh: 486_647 },
  trackRecord: { kind: "backtest", sample: 52, coverage90: 0.865, width90: 0.151, baselineWidth90: 0.139, pinballSkill: -0.02,
    misses: [{ asOf: "2026-08-10", realizedReturn: -0.14, lowReturn: -0.08, highReturn: 0.08 }] },
  ...over,
});

const server = (horizons: unknown[]) => ({ symbol: "BTC", label: "변동 범위 (방향 예측 아님)", disclaimer: "면책", horizons });

describe("toForecastViewModel", () => {
  it("기간 4개를 항상 주고, 서버가 빠뜨린 기간은 not_generated", () => {
    const v = toForecastViewModel(server([horizon(1)]));
    assert.equal(v.status, "ok");
    if (v.status !== "ok") return;
    assert.deepEqual(v.horizons.map((h) => [h.horizonWeeks, h.renderable]), [[1, true], [2, false], [3, false], [4, false]]);
    assert.deepEqual(v.horizons[1], { horizonWeeks: 2, renderable: false, blockedReason: "not_generated" });
  });

  it("전망 3종이 빠지면 막는다 — 빗나간 사례 · 기준 폭 · 표본", () => {
    for (const bad of [
      { trackRecord: { ...horizon(1).trackRecord, misses: [] } },
      { trackRecord: { ...horizon(1).trackRecord, baselineWidth90: null } },
      { trackRecord: { ...horizon(1).trackRecord, sample: 0 } },
      { range: { low: 1 } },
    ]) {
      const v = toForecastViewModel(server([horizon(1, bad)]));
      assert.ok(v.status === "ok" && v.horizons[0] && !v.horizons[0].renderable && v.horizons[0].blockedReason === "contract_incomplete", JSON.stringify(bad));
    }
  });

  it("막힌 기간에는 가격이 새지 않는다 — 서버가 실수로 실어도", () => {
    const v = toForecastViewModel(server([{ ...horizon(1), renderable: false, blockedReason: "miscalibrated" }]));
    assert.ok(v.status === "ok");
    if (v.status !== "ok") return;
    assert.deepEqual(v.horizons[0], { horizonWeeks: 1, renderable: false, blockedReason: "miscalibrated" });
  });

  it("방향은 서버가 줄 때만 — 없으면 필드 자체가 없다", () => {
    const v = toForecastViewModel(server([horizon(1)]));
    assert.ok(v.status === "ok" && v.horizons[0]?.renderable && !("direction" in v.horizons[0]));
  });

  it("과거 종가는 모양이 맞는 점만 옮긴다 — 없으면 빈 배열", () => {
    const v = toForecastViewModel({
      ...server([horizon(1)]),
      history: [{ date: "2026-09-22", close: 100 }, { date: "2026-09-23", close: "x" }, { close: 5 }, null],
    });
    assert.ok(v.status === "ok");
    assert.deepEqual(v.history, [{ date: "2026-09-22", close: 100 }]);
    const empty = toForecastViewModel(server([horizon(1)]));
    assert.ok(empty.status === "ok" && empty.history.length === 0);
  });

  it("면책이 없으면 전체 unavailable", () => {
    assert.deepEqual(toForecastViewModel({ ...server([horizon(1)]), disclaimer: "" }), { status: "unavailable" });
  });
});

describe("AppForecastService", () => {
  afterEach(() => mock.restoreAll());

  it("서버 /coach/forecast?symbol= 을 800ms 로 부른다", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return ok(server([horizon(1)]));
    });
    const v = await appForecastService.getForecast("tok", "BTC");
    assert.equal(calls[0][1], "/coach/forecast?symbol=BTC");
    assert.equal((calls[0][4] as { timeout: number }).timeout, 800);
    assert.equal(v.status, "ok");
  });

  it("404(소유자 아님)는 그대로 올린다 — unavailable 로 바꾸면 기능의 존재가 드러난다", async () => {
    let calls = 0;
    mock.method(backendApi, "proxyAuthRequest", async () => {
      calls += 1;
      throw httpError(404);
    });
    await assert.rejects(appForecastService.getForecast("tok", "BTC"), /status 404/);
    assert.equal(calls, 1);
  });

  it("5xx 는 한 번 다시 부르고 그래도 실패하면 unavailable", async () => {
    let calls = 0;
    mock.method(backendApi, "proxyAuthRequest", async () => {
      calls += 1;
      throw httpError(503);
    });
    assert.deepEqual(await appForecastService.getForecast("tok", "BTC"), { status: "unavailable" });
    assert.equal(calls, 2);
  });
});
