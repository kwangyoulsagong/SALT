import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appForecastService } from "../app-forecast.service";
import { backendApi } from "../backend-api.service";
import { toScenarioViewModel } from "../scenario.viewmodel";

/** 시나리오 — 지평 넷 · 과거 실제 결과 또는 모델 확률(F017 v4 · `BFF-REQ-052` FR-4 개정 · `ADR-003`). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x" }, headers: {} } });

const TRACK = {
  origin: "backtest",
  calls: 400,
  hits: 230,
  alwaysUpHits: 200,
  window: { from: "2025-07-01T00:00:00.000Z", to: "2026-11-10T00:00:00.000Z" },
  misses: [{ asOf: "2026-11-09T03:00:00Z", symbol: "KRW-ETH", pUp: 0.61, realizedPct: -1.2 }],
};
const modelPart = (over: Record<string, unknown> = {}) => ({
  renderable: true,
  blockedReason: null,
  pUp: 0.613,
  range: { lowPct: -0.8, midPct: 0.2, highPct: 1.9 },
  invalidation: 99.2,
  refPrice: 100,
  asOf: "2026-11-11T08:00:00.000Z",
  expiresAt: "2026-11-11T09:00:00.000Z",
  track: TRACK,
  ...over,
});
/** 모델 확률 칸 */
const open = (h: string, over: Record<string, unknown> = {}) => ({
  horizon: h,
  horizonLabel: `다음 ${h}`,
  source: "model",
  tier: "now",
  fallbackFrom: null,
  model: modelPart(over),
  baseRate: null,
});
const rate = (over: Record<string, unknown> = {}) => ({
  condition: null,
  status: "ok",
  sample: 327_804,
  sampleEffective: 5913,
  sampleDays: 3314,
  upCount100: 47,
  upRange: { low100: 45, high100: 48 },
  range: { lowPct: -5.16, midPct: 0, highPct: 5 },
  usualUp100: 47,
  differsFromUsual: null,
  refPrice: 100,
  invalidation: 94.84,
  asOf: "2026-11-13T01:15:44.000Z",
  ...over,
});
/** 과거 실제 결과 칸 */
const past = (h: string, over: Record<string, unknown> = {}, rateOver: Record<string, unknown> = {}) => ({
  horizon: h,
  horizonLabel: `다음 ${h}`,
  source: "base_rate",
  tier: "usual",
  fallbackFrom: null,
  model: null,
  baseRate: rate(rateOver),
  ...over,
});
const server = (horizons: unknown[]) => ({ symbol: "BTC", market: "crypto", disclaimer: "면책", horizons });
const view = (horizons: unknown[]) => {
  const v = toScenarioViewModel(server(horizons));
  if (v.status !== "ok") throw new Error("unavailable");
  return v.horizons;
};

describe("toScenarioViewModel", () => {
  it("지평 넷을 늘 준다 — 서버가 빠뜨린 지평은 결함 단(숫자 없음)", () => {
    const hs = view([past("1d")]);
    assert.deepEqual(hs.map((h) => [h.horizon, h.source, h.tier]), [
      ["1h", "base_rate", "defect"],
      ["4h", "base_rate", "defect"],
      ["1d", "base_rate", "usual"],
      ["5d", "base_rate", "defect"],
    ]);
    assert.deepEqual([hs[0]!.upOutOf100, hs[0]!.range, hs[0]!.basis], [null, null, null]);
  });

  it("과거 실제 결과 — 서버 숫자 그대로 · 두 출처가 같은 칸 이름", () => {
    const h = view([past("1d", { tier: "now" }, { condition: { id: "C3L", phrase: "큰 코인이 크게 내린 때" }, upCount100: 57, upRange: { low100: 51, high100: 63 }, differsFromUsual: "higher" })])[2]!;
    assert.equal(h.upOutOf100, 57);
    assert.deepEqual(h.upRange, { low: 51, high: 63 });
    assert.deepEqual(h.range, { lowPct: -5.16, midPct: 0, highPct: 5 });
    assert.equal(h.invalidation, 94.84);
    assert.deepEqual(h.basis, {
      condition: { id: "C3L", phrase: "큰 코인이 크게 내린 때" },
      sample: 327_804,
      sampleEffective: 5913,
      sampleDays: 3314,
      usualUpOutOf100: 47,
      differsFromUsual: "higher",
    });
    assert.deepEqual([h.pUp, h.track, h.modelBlocked], [null, null, null]);
  });

  it("빌려 온 지평 — 그 지평의 이름을 같이(하루 기준으로 대신)", () => {
    const hs = view([past("1h", { tier: "longer", fallbackFrom: "1d" }), past("1d", { horizonLabel: "다음 거래일 종가까지" })]);
    assert.deepEqual([hs[0]!.tier, hs[0]!.fallbackFrom, hs[0]!.fallbackLabel], ["longer", "1d", "다음 거래일 종가까지"]);
    assert.equal(hs[2]!.fallbackLabel, null);
  });

  it("숫자를 지어내지 않는다 — 말하는 단인데 재료가 틀리면 결함 단", () => {
    const bads: Array<[Record<string, unknown>, Record<string, unknown>]> = [
      [{}, { upCount100: null }],
      [{}, { upCount100: 101 }],
      [{}, { upCount100: 46.5 }],
      [{}, { range: null }],
      [{}, { range: { lowPct: 1, midPct: 0, highPct: 2 } }],
      [{}, { sample: null }],
      [{ tier: "weird" }, {}],
      [{ tier: "defect" }, { upCount100: null, range: null }],
      [{ tier: "longer", fallbackFrom: null }, {}],
      [{ tier: "longer", fallbackFrom: "2w" }, {}],
      [{ baseRate: null }, {}],
    ];
    for (const [over, rateOver] of bads) {
      const h = view([past("1d", over, rateOver)])[2]!;
      assert.equal(h.tier, "defect", JSON.stringify([over, rateOver]));
      assert.deepEqual([h.upOutOf100, h.upRange, h.range, h.invalidation], [null, null, null, null]);
    }
  });

  it("결함 단은 표본만 싣는다(아직 n번뿐)", () => {
    const h = view([past("1d", { tier: "defect" }, { status: "below_min", sampleEffective: 37, upCount100: null, upRange: null, range: null })])[2]!;
    assert.equal(h.tier, "defect");
    assert.equal(h.basis?.sampleEffective, 37);
  });

  it("범위가 비율을 감싸지 않으면 범위만 뺀다 · 시세가 없으면 틀리는 선만 없다", () => {
    const h = view([past("1d", {}, { upRange: { low100: 50, high100: 60 }, invalidation: null })])[2]!;
    assert.deepEqual([h.tier, h.upOutOf100, h.upRange, h.invalidation], ["usual", 47, null, null]);
  });

  it("모델 확률 칸 — 100번 중 칸 수 · 적중률", () => {
    const h = view([open("1h")])[0]!;
    assert.deepEqual([h.source, h.tier, h.upOutOf100, h.pUp], ["model", "now", 61, 0.613]);
    assert.equal(h.track?.hitRate, 230 / 400);
    assert.equal(h.track?.alwaysUpRate, 0.5);
    assert.equal(h.track?.alwaysNotUpRate, 0.5); // 늘 안 오른다 = 확신 행 − 늘 오른다 맞힘
    assert.equal(h.basis, null);
  });

  it("모델 칸은 막을 수만 있다 — 재료가 하나라도 없으면 모델 확률로 나가지 않는다", () => {
    const bads: Record<string, unknown>[] = [
      { pUp: null },
      { pUp: 1.2 },
      { range: { lowPct: 1, midPct: 0, highPct: 2 } },
      { invalidation: null },
      { track: null },
      { track: { ...TRACK, misses: [] } },
      { track: { ...TRACK, hits: 401 } },
      { renderable: false },
    ];
    for (const bad of bads) {
      const h = view([open("1h", bad)])[0]!;
      assert.deepEqual([h.source, h.tier, h.pUp, h.upOutOf100], ["base_rate", "defect", null, null], JSON.stringify(bad));
      assert.equal(h.modelBlocked?.reason, "contract_incomplete");
    }
  });

  it("소유자 — 막힌 모델 칸의 사유 · 시험 성적은 과거 실제 결과 옆에 실린다 · 모델 숫자는 새지 않는다", () => {
    const h = view([past("4h", { model: modelPart({ renderable: false, blockedReason: "no_skill", pUp: 0.7 }) })])[1]!;
    assert.equal(h.source, "base_rate");
    assert.equal(h.modelBlocked?.reason, "no_skill");
    assert.equal(h.modelBlocked?.track?.calls, 400);
    assert.equal(h.pUp, null);
    assert.equal(h.upOutOf100, 47); // 과거 실제 결과 값
  });

  it("서버가 base_rate 라 한 칸은 model 이 열려 있어도 모델 확률로 바꾸지 않는다", () => {
    const h = view([past("1h", { model: modelPart() })])[0]!;
    assert.deepEqual([h.source, h.pUp, h.modelBlocked], ["base_rate", null, null]);
  });

  it("모양이 깨졌으면 unavailable", () => {
    assert.deepEqual(toScenarioViewModel(null), { status: "unavailable" });
    assert.deepEqual(toScenarioViewModel({ horizons: "x" }), { status: "unavailable" });
  });
});

describe("appForecastService.getScenario", () => {
  afterEach(() => mock.restoreAll());

  it("4xx 는 그대로 올린다 — unavailable 로 바꾸지 않는다", async () => {
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
