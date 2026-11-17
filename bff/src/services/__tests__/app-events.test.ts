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

describe("국내 주요 사건 (BFF-REQ-043 FR-1 · FR-2 · FR-4)", () => {
  afterEach(() => mock.restoreAll());

  it("국내 종류 · 범위 · 지역을 그대로 싣는다 — 종류 코드를 문장으로 바꾸지 않는다", () => {
    const v = toEventsViewModel(
      server([
        { ...event([horizon(1)], "kr_bok_rate"), scope: "market", region: "kr" },
        { ...event([horizon(1)], "fomc"), scope: "market", region: "us" },
      ]),
    );
    assert.ok(v.status === "ok");
    assert.deepEqual(
      v.events.map((e) => [e.kind, e.scope, e.region]),
      [
        ["kr_bok_rate", "market", "kr"],
        ["fomc", "market", "us"],
      ],
    );
  });

  it("옛 서버(범위 · 지역 없음)는 미국 시장 일정으로 읽는다", () => {
    const v = toEventsViewModel(server([event([horizon(1)])]));
    assert.ok(v.status === "ok" && v.events[0]?.scope === "market" && v.events[0]?.region === "us");
  });

  it("국내 종목 코드를 그대로 넘기고 404 는 그대로", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      throw httpError(404);
    });
    await assert.rejects(appForecastService.getEvents("tok", "005930"), /404/);
    assert.equal(calls[0]?.[1], "/coach/events?symbol=005930");
  });
});

describe("다음 실적 공시 (F008 슬라이스 24 2단계 · BFF-REQ-043 FR-2)", () => {
  const earnings = (over: Record<string, unknown> = {}) => ({
    periodEnd: "2026-09-30",
    annual: false,
    confirmed: null,
    expected: {
      from: "2026-10-25",
      to: "2026-11-04",
      sample: 30,
      hits: 22,
      judged: 25,
      misses: [{ periodEnd: "2025-03-31", actual: "2025-05-12", from: "2025-04-25", to: "2025-05-05" }, { bad: 1 }],
      deadline: "2026-11-14",
    },
    blockedReason: null,
    horizons: [horizon(1), horizon(5)],
    asOf: "2026-10-20T00:00:00.000Z",
    ...over,
  });
  const vm = (e: unknown) => {
    const r = toEventsViewModel({ ...server([]), symbol: "005930", earnings: e });
    assert.equal(r.status, "ok");
    return r.status === "ok" ? r.earnings : null;
  };

  it("예상 창 — 기간 · 3종 · 기준 그대로, 깨진 빗나감 행은 버리고 빠진 반응 기간은 막힘", () => {
    const e = vm(earnings())!;
    assert.deepEqual(e.expected?.misses, [{ periodEnd: "2025-03-31", actual: "2025-05-12", from: "2025-04-25", to: "2025-05-05" }]);
    assert.deepEqual([e.expected?.from, e.expected?.to, e.expected?.hits, e.expected?.judged, e.expected?.deadline], ["2026-10-25", "2026-11-04", 22, 25, "2026-11-14"]);
    assert.deepEqual(e.horizons.map((h) => h.renderable), [true, true, false]);
    assert.equal(e.blockedReason, null);
  });

  it("확정 일정이 있으면 창을 싣지 않는다", () => {
    const e = vm(earnings({ confirmed: { at: "2026-10-29T01:00:00.000Z", timeKnown: true, source: "ir" } }))!;
    assert.deepEqual(e.confirmed, { at: "2026-10-29T01:00:00.000Z", timeKnown: true, source: "ir" });
    assert.equal(e.expected, null);
  });

  const broken: Array<[string, Record<string, unknown>]> = [
    ["창이 뒤집힘", { from: "2026-11-05", to: "2026-11-04" }],
    ["판정 0", { judged: 0, hits: 0 }],
    ["적중 > 판정", { hits: 26 }],
    ["날짜 모양 아님", { to: "11월 4일" }],
  ];
  for (const [name, over] of broken) {
    it(`창 모양이 깨지면 싣지 않는다 — ${name}`, () => {
      const base = earnings();
      const e = vm({ ...base, expected: { ...(base.expected as object), ...over } })!;
      assert.equal(e.expected, null);
      assert.equal(e.blockedReason, "contract_incomplete");
    });
  }

  it("막힘 사유는 그대로 · 옛 서버(필드 없음)와 코인은 null", () => {
    assert.equal(vm(earnings({ expected: null, blockedReason: "insufficient_sample" }))?.blockedReason, "insufficient_sample");
    assert.equal(vm(undefined), null);
    assert.equal(vm(null), null);
  });

  it("종목 사건 종류(실적 공시 · 확정 일정)를 버리지 않는다", () => {
    const r = toEventsViewModel(server([{ ...event([horizon(1)], "kr_earnings"), scope: "symbol", region: "kr" }, { ...event([], "kr_ir"), scope: "symbol", region: "kr" }]));
    assert.equal(r.status, "ok");
    if (r.status === "ok") assert.deepEqual(r.events.map((e) => [e.kind, e.scope]), [["kr_earnings", "symbol"], ["kr_ir", "symbol"]]);
  });
});
