import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appForecastService } from "../app-forecast.service";
import { backendApi } from "../backend-api.service";
import { toEventsViewModel } from "../events.viewmodel";

/** 주요 사건 (F008 `BFF-REQ-037` FR-8 · `FC-REQ-005`). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const horizon = (h: number, over: Record<string, unknown> = {}) => ({
  horizonDays: h,
  renderable: true,
  asOf: "2026-09-24T00:00:00.000Z",
  sample: 48,
  range: { q05: -0.025, q25: -0.008, q50: 0.005, q75: 0.015, q95: 0.045 },
  upRate: 0.65,
  baseline: { q05: -0.029, q50: 0.001, q95: 0.036 },
  moveRatio: 1.25,
  preReturn5dMedian: 0.004,
  misses: [{ eventAt: "2026-03-11T12:30:00.000Z", realized: -0.06, low: -0.03, high: 0.04 }],
  recent: [{ eventAt: "2026-09-11T12:30:00.000Z", realized: 0.01 }],
  ...over,
});

const server = (events: unknown[]) => ({
  symbol: "BTC",
  label: "주요 사건 (호재 · 악재 판정 아님)",
  disclaimer: "면책",
  events,
});
const event = (horizons: unknown[], kind = "cpi") => ({
  kind,
  eventAt: "2026-10-14T12:30:00.000Z",
  announcedAt: "2026-10-07T12:30:00.000Z",
  source: "fred",
  horizons,
});

describe("toEventsViewModel", () => {
  it("기간 3개를 항상 주고, 빠진 기간은 not_generated", () => {
    const v = toEventsViewModel(server([event([horizon(1)])]));
    assert.ok(v.status === "ok");
    assert.deepEqual(
      v.events[0]?.horizons.map((h) => (h.renderable ? h.horizonDays : h.blockedReason)),
      [1, "not_generated", "not_generated"],
    );
  });

  it("막을 수만 있다 — 빗나간 때 · 평소 분포가 비면 contract_incomplete", () => {
    const noMiss = toEventsViewModel(server([event([horizon(1, { misses: [] })])]));
    const noBase = toEventsViewModel(server([event([horizon(1, { baseline: { q05: 0 } })])]));
    for (const v of [noMiss, noBase]) {
      assert.ok(v.status === "ok");
      assert.deepEqual(v.events[0]?.horizons[0], { horizonDays: 1, renderable: false, blockedReason: "contract_incomplete" });
    }
  });

  it("서버가 막은 기간은 사유 그대로 · 모르는 종류는 버린다", () => {
    const v = toEventsViewModel(
      server([event([{ horizonDays: 1, renderable: false, blockedReason: "insufficient_sample" }]), event([], "unlock")]),
    );
    assert.ok(v.status === "ok");
    assert.equal(v.events.length, 1);
    assert.deepEqual(v.events[0]?.horizons[0], { horizonDays: 1, renderable: false, blockedReason: "insufficient_sample" });
  });

  it("면책이 없으면 전체 unavailable", () => {
    assert.deepEqual(toEventsViewModel({ ...server([]), disclaimer: "" }), { status: "unavailable" });
  });
});

describe("AppForecastService.getEvents", () => {
  afterEach(() => mock.restoreAll());

  it("서버 /coach/events?symbol= 을 부른다", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return ok(server([event([horizon(1), horizon(5), horizon(20)])]));
    });
    const v = await appForecastService.getEvents("tok", "BTC");
    assert.equal(calls[0]?.[1], "/coach/events?symbol=BTC");
    assert.ok(v.status === "ok" && v.events[0]?.horizons.every((h) => h.renderable));
  });

  it("404(소유자 아님)는 그대로 던진다 — unavailable 로 바꾸지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(404);
    });
    await assert.rejects(appForecastService.getEvents("tok", "BTC"), /404/);
  });

  it("5xx 는 unavailable", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    assert.deepEqual(await appForecastService.getEvents("tok", "BTC"), { status: "unavailable" });
  });
});
