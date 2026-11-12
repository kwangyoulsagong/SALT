import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appForecastService } from "../app-forecast.service";
import { backendApi } from "../backend-api.service";
import { toScenarioViewModel } from "../scenario.viewmodel";

/** 시나리오 카드 — 단타 방향 확률(F017 v2 단계 5 · `BFF-REQ-052` FR-4 · `ADR-003`). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const open = (h: string, over: Record<string, unknown> = {}) => ({
  horizon: h,
  horizonLabel: `다음 ${h}`,
  renderable: true,
  blockedReason: null,
  pUp: 0.613,
  range: { lowPct: -0.8, midPct: 0.2, highPct: 1.9 },
  invalidation: 99.2,
  refPrice: 100,
  asOf: "2026-11-11T08:00:00.000Z",
  expiresAt: "2026-11-11T09:00:00.000Z",
  track: {
    origin: "backtest",
    calls: 400,
    hits: 230,
    alwaysUpHits: 200,
    window: { from: "2025-07-01T00:00:00.000Z", to: "2026-11-10T00:00:00.000Z" },
    misses: [{ asOf: "2026-11-09T03:00:00Z", symbol: "KRW-ETH", pUp: 0.61, realizedPct: -1.2 }],
  },
  ...over,
});
const server = (horizons: unknown[]) => ({ symbol: "BTC", market: "crypto", disclaimer: "면책", horizons });

describe("toScenarioViewModel", () => {
  it("지평 셋을 늘 주고 빠진 지평은 not_tested · 100번 중 칸 수 · 적중률", () => {
    const v = toScenarioViewModel(server([open("1h")]));
    assert.equal(v.status, "ok");
    if (v.status !== "ok") return;
    assert.deepEqual(v.horizons.map((h) => [h.horizon, h.renderable, h.blockedReason]), [
      ["1h", true, null],
      ["4h", false, "not_tested"],
      ["1d", false, "not_tested"],
    ]);
    assert.equal(v.horizons[0]!.upOutOf100, 61);
    assert.equal(v.horizons[0]!.track?.hitRate, 230 / 400);
    assert.equal(v.horizons[0]!.track?.alwaysUpRate, 0.5);
    assert.equal(v.horizons[0]!.track?.alwaysNotUpRate, 0.5); // 늘 안 오른다 = 확신 행 − 늘 오른다 맞힘
  });

  it("막을 수만 있다 — 열린 지평에 재료가 하나라도 없으면 contract_incomplete", () => {
    const bads: Record<string, unknown>[] = [
      { pUp: null },
      { pUp: 1.2 },
      { range: { lowPct: 1, midPct: 0, highPct: 2 } },
      { invalidation: null },
      { track: null },
      { track: { ...open("1h").track, misses: [] } },
      { track: { ...open("1h").track, hits: 401 } },
    ];
    for (const bad of bads) {
      const v = toScenarioViewModel(server([open("1h", bad)]));
      assert.equal(v.status, "ok");
      if (v.status !== "ok") return;
      assert.equal(v.horizons[0]!.renderable, false, JSON.stringify(bad));
      assert.equal(v.horizons[0]!.blockedReason, "contract_incomplete");
      assert.equal(v.horizons[0]!.pUp, null);
    }
  });

  it("닫힌 지평은 서버 사유 그대로 · 시험 성적은 실어 둔다 · renderable 을 열지 않는다", () => {
    const v = toScenarioViewModel(server([open("4h", { renderable: false, blockedReason: "no_skill", pUp: 0.7 })]));
    if (v.status !== "ok") return assert.fail();
    const h = v.horizons[1]!;
    assert.equal(h.blockedReason, "no_skill");
    assert.equal(h.pUp, null);
    assert.equal(h.track?.calls, 400);
  });

  it("모양이 깨졌으면 unavailable", () => {
    assert.deepEqual(toScenarioViewModel(null), { status: "unavailable" });
    assert.deepEqual(toScenarioViewModel({ horizons: "x" }), { status: "unavailable" });
  });
});

describe("appForecastService.getScenario", () => {
  afterEach(() => mock.restoreAll());

  it("404(소유자 아님)는 그대로 올린다 — unavailable 로 바꾸지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(404);
    });
    await assert.rejects(() => appForecastService.getScenario("t", "BTC"), /404/);
  });

  it("5xx 는 200 unavailable · 서버 경로는 /coach/scenario", async () => {
    const paths: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, path: string) => {
      paths.push(path);
      throw httpError(503);
    });
    assert.deepEqual(await appForecastService.getScenario("t", "BTC"), { status: "unavailable" });
    assert.ok(paths.every((p) => p === "/coach/scenario?symbol=BTC"));
  });

  it("성공은 뷰모델로", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ok(server([open("1h")])));
    const v = await appForecastService.getScenario("t", "BTC");
    assert.equal(v.status, "ok");
  });
});
