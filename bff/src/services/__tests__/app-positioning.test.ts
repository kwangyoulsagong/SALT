import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appForecastService } from "../app-forecast.service";
import { backendApi } from "../backend-api.service";
import { toPositioningViewModel } from "../positioning.viewmodel";

/** 쏠림 신호 (F008 `BFF-REQ-037` FR-9 · `FC-REQ-007`). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const horizon = (h: number, over: Record<string, unknown> = {}) => ({
  horizonDays: h,
  renderable: true,
  asOf: "2026-09-27T00:00:00.000Z",
  sample: 20,
  range: { q05: -0.05, q25: -0.01, q50: 0.01, q75: 0.03, q95: 0.15 },
  upRate: 0.6,
  baseline: { q05: -0.04, q50: 0.001, q95: 0.05 },
  moveRatio: 1.2,
  preReturn5dMedian: null,
  misses: [{ eventAt: "2025-01-01T00:00:00.000Z", realized: 0.2, low: -0.05, high: 0.1 }],
  recent: [{ eventAt: "2026-09-20T00:00:00.000Z", realized: 0.01 }],
  ...over,
});

const server = (over: Record<string, unknown> = {}) => ({
  symbol: "BTC",
  label: "쏠림 신호 (매매 신호 아님)",
  disclaimer: "면책",
  asOf: "2026-09-27T00:00:00.000Z",
  blockedReason: null,
  funding: {
    state: "long_crowded",
    rate: 0.00012,
    percentile1y: 0.95,
    sample: 365,
    openInterest: { usd: 7.9e9, at: "2026-09-27T04:00:00.000Z", change7d: -0.08 },
  },
  kimchi: {
    premium: 0.004,
    confirmedState: "discount",
    since: "2026-09-20T00:00:00.000Z",
    fxUsdKrw: 1355.05,
    fxObservedAt: "2026-09-25T00:00:00.000Z",
  },
  reactions: [
    { kind: "funding_long_crowded", current: true, horizons: [horizon(1), horizon(5), horizon(20)] },
    { kind: "kimchi_cross_down", current: true, horizons: [horizon(1)] },
  ],
  ...over,
});

describe("toPositioningViewModel", () => {
  it("상태 두 칸과 반응을 옮기고, 빠진 기간은 not_generated", () => {
    const v = toPositioningViewModel(server());
    assert.ok(v.status === "ok");
    assert.equal(v.funding?.state, "long_crowded");
    assert.equal(v.kimchi?.confirmedState, "discount");
    assert.deepEqual(
      v.reactions[1]?.horizons.map((h) => (h.renderable ? h.horizonDays : h.blockedReason)),
      [1, "not_generated", "not_generated"],
    );
  });

  it("모르는 상태 코드 · 범위 밖 백분위면 펀딩 칸과 펀딩 반응을 통째로 뺀다", () => {
    for (const funding of [{ ...server().funding, state: "overheated" }, { ...server().funding, percentile1y: 1.4 }]) {
      const v = toPositioningViewModel(server({ funding }));
      assert.ok(v.status === "ok");
      assert.equal(v.funding, null);
      assert.deepEqual(
        v.reactions.map((r) => r.kind),
        ["kimchi_cross_down"],
      );
    }
  });

  it("막을 수만 있다 — 빗나간 때가 비면 contract_incomplete, 모르는 종류는 버린다", () => {
    const v = toPositioningViewModel(
      server({
        reactions: [
          { kind: "funding_long_crowded", current: true, horizons: [horizon(1, { misses: [] })] },
          { kind: "whale_dump", current: true, horizons: [horizon(1)] },
        ],
      }),
    );
    assert.ok(v.status === "ok");
    assert.equal(v.reactions.length, 1);
    assert.deepEqual(v.reactions[0]?.horizons[0], {
      horizonDays: 1,
      renderable: false,
      blockedReason: "contract_incomplete",
    });
  });

  it("면책이 없으면 전체 unavailable", () => {
    assert.deepEqual(toPositioningViewModel(server({ disclaimer: "" })), { status: "unavailable" });
  });
});

describe("AppForecastService.getPositioning", () => {
  afterEach(() => mock.restoreAll());

  it("서버 /coach/positioning?symbol= 을 부른다", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return ok(server());
    });
    const v = await appForecastService.getPositioning("tok", "BTC");
    assert.equal(calls[0]?.[1], "/coach/positioning?symbol=BTC");
    assert.ok(v.status === "ok" && v.reactions[0]?.horizons.every((h) => h.renderable));
  });

  it("404(소유자 아님)는 그대로 던진다 — unavailable 로 바꾸지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(404);
    });
    await assert.rejects(appForecastService.getPositioning("tok", "BTC"), /404/);
  });

  it("5xx 는 unavailable", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503);
    });
    assert.deepEqual(await appForecastService.getPositioning("tok", "BTC"), { status: "unavailable" });
  });
});
