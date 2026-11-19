import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, afterEach, before, describe, it, mock } from "node:test";

import app from "../../app";
import { backendApi } from "../../../services/backend-api.service";

/** 밴드 적립 중계(F003 v2 순서 3 · `BFF-REQ-019`~`021`) — 실제 Express 앱에 붙여 모양 검사 · 서버 코드 전달 · 재시도 0 */
let server: Server;
let base: string;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());
afterEach(() => mock.restoreAll());

const call = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(`${base}/api/app/plan${path}`, {
    method,
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: res.status,
    cacheControl: res.headers.get("cache-control"),
    body: (await res.json()) as Record<string, unknown>,
  };
};

const upstream = (status: number, data: unknown) =>
  Object.assign(new Error(String(status)), { isAxiosError: true, response: { status, data, headers: {} } });

describe("입력 모양 — 서버를 부르기 전에 400", () => {
  const cases: Array<[string, string, string, unknown]> = [
    ["주 날짜 아님", "POST", "/weekly/complete", { weekOf: "이번 주", executions: [{ asset: "btc" }] }],
    ["실행 0건", "POST", "/weekly/complete", { weekOf: "2026-11-16", executions: [] }],
    ["모르는 자산", "POST", "/weekly/complete", { weekOf: "2026-11-16", executions: [{ asset: "eth" }] }],
    ["자산 겹침", "POST", "/weekly/complete", { weekOf: "2026-11-16", executions: [{ asset: "btc" }, { asset: "btc" }] }],
    ["금액 소수", "POST", "/weekly/complete", { weekOf: "2026-11-16", executions: [{ asset: "btc", amountKrw: 1.5 }] }],
    ["설정 본문 배열", "PATCH", "/settings", [1]],
    ["월 형식", "GET", "/monthly-summary?month=2026-13", undefined],
  ];
  for (const [name, method, path, body] of cases) {
    it(name, async () => {
      const proxied = mock.method(backendApi, "proxyAuthRequest", async () => {
        throw new Error("부르면 안 된다");
      });
      const res = await call(method, path, body);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, "VALIDATION_ERROR");
      assert.equal(proxied.mock.callCount(), 0);
    });
  }
});

describe("서버로 — 한 번만 · 코드 그대로", () => {
  it("완료 체크 — 받은 금액 그대로 한 번(재시도 0) · 연속은 서버 값", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return { data: { data: { weekOf: "2026-11-16", streakWeeks: 1, cumulativeKrw: 151_234 } } };
    });
    const body = { weekOf: "2026-11-16", executions: [{ asset: "btc", amountKrw: 151_234 }, { asset: "kospi" }] };
    const res = await call("POST", "/weekly/complete", body);
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].slice(0, 4), ["POST", "/plan/weekly/complete", "t", body]);
    assert.deepEqual(res.body.data, { weekOf: "2026-11-16", streakWeeks: 1, cumulativeKrw: 151_234 });
  });

  it("지난 주 체크 422 — 코드 · currentWeek 그대로 · 한 번만", async () => {
    const proxied = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw upstream(422, { success: false, code: "PLAN_WEEK_NOT_CURRENT", message: "x", currentWeek: "2026-11-16" });
    });
    const res = await call("POST", "/weekly/complete", { weekOf: "2026-11-09", executions: [{ asset: "btc" }] });
    assert.equal(res.status, 422);
    assert.equal(res.body.code, "PLAN_WEEK_NOT_CURRENT");
    assert.equal(res.body.currentWeek, "2026-11-16");
    assert.equal(proxied.mock.callCount(), 1);
  });

  it("설정 — 밴드 키를 걸러 내지 않고 서버로(422 PLAN_BAND_READ_ONLY 그대로, FR-62)", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      throw upstream(422, { success: false, code: "PLAN_BAND_READ_ONLY", message: "x", field: "bands" });
    });
    const res = await call("PATCH", "/settings", { monthlyBaseKrw: 1_300_000, bands: [] });
    assert.equal(res.status, 422);
    assert.equal(res.body.code, "PLAN_BAND_READ_ONLY");
    assert.deepEqual(calls[0][3], { monthlyBaseKrw: 1_300_000, bands: [] });
  });

  it("설정 422 하한 · 상한 · 단위가 화면까지 온다(FR-61)", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw upstream(422, { success: false, code: "PLAN_BASE_AMOUNT_INVALID", message: "x", field: "monthlyBaseKrw", min: 10_000, max: 100_000_000, unit: 1_000 });
    });
    const res = await call("PATCH", "/settings", { monthlyBaseKrw: 500 });
    assert.deepEqual([res.status, res.body.field, res.body.min, res.body.max, res.body.unit], [422, "monthlyBaseKrw", 10_000, 100_000_000, 1_000]);
  });

  it("주간 계획 — 비트코인 로고는 시세 목록에서 · 시세 목록이 실패해도 계획은 그대로(로고 null)", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ({
      data: { data: { weekOf: "2026-11-16", configured: true, totalKrw: 1, items: [{ asset: "btc", multiplier: 1, reasonCode: "gate_not_passed", renderable: false }, { asset: "kospi", multiplier: 1, reasonCode: "gate_not_passed", renderable: false }] } },
    }));
    const market = mock.method(backendApi, "getMarketOverview", async () => ({ items: [{ symbol: "BTC", logoUrl: "https://x/btc.png" }] }));
    const ok = await call("GET", "/weekly");
    assert.deepEqual((ok.body.data as { items: Array<{ logoUrl: string | null }> }).items.map((i) => i.logoUrl), ["https://x/btc.png", null]);
    market.mock.mockImplementation(async () => {
      throw new Error("시세 목록 실패");
    });
    const failed = await call("GET", "/weekly");
    assert.equal(failed.status, 200);
    assert.deepEqual((failed.body.data as { items: Array<{ logoUrl: string | null }> }).items.map((i) => i.logoUrl), [null, null]);
  });

  it("주간 계획 실패는 상태 코드 그대로 — 빈 계획(200)으로 덮지 않는다 · 401 은 401", async () => {
    mock.method(backendApi, "getMarketOverview", async () => ({ items: [] }));
    const proxied = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw upstream(401, { success: false, code: "UNAUTHORIZED", message: "x" });
    });
    const unauth = await call("GET", "/weekly");
    assert.equal(unauth.status, 401);
    proxied.mock.mockImplementation(async () => {
      throw new Error("connect ECONNREFUSED");
    });
    const down = await call("GET", "/weekly");
    assert.ok(down.status >= 500, `5xx 여야 한다: ${down.status}`);
    assert.equal(down.body.data, undefined);
  });

  it("주간 계획 — 봉투 { success, data } · 월 합계는 month 를 그대로 넘긴다", async () => {
    mock.method(backendApi, "getMarketOverview", async () => ({ items: [] }));
    const urls: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      urls.push(url);
      return { data: { data: url.startsWith("/plan/weekly") ? { weekOf: "2026-11-16", configured: false, totalKrw: null, items: [] } : { month: "2026-11", executedKrw: 0, plannedKrw: 0, progressPct: null } } };
    });
    const weekly = await call("GET", "/weekly");
    assert.equal(weekly.body.success, true);
    assert.equal((weekly.body.data as { configured: boolean }).configured, false);
    const summary = await call("GET", "/monthly-summary?month=2026-11");
    assert.equal((summary.body.data as { progressPct: number | null }).progressPct, null);
    assert.deepEqual(urls, ["/plan/weekly", "/plan/monthly-summary?month=2026-11"]);
  });

  it("성공 응답 다섯 경로 모두 no-store — 개인 금액(BFF-REQ-022 FR-34)", async () => {
    mock.method(backendApi, "getMarketOverview", async () => ({ items: [] }));
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => ({
      data: {
        data: url.startsWith("/plan/weekly")
          ? { weekOf: "2026-11-16", configured: false, totalKrw: null, items: [] }
          : url.startsWith("/plan/monthly")
            ? { month: "2026-11", executedKrw: 0, plannedKrw: 0, progressPct: null }
            : {},
      },
    }));
    const responses = [
      await call("GET", "/weekly"),
      await call("POST", "/weekly/complete", { weekOf: "2026-11-16", executions: [{ asset: "btc" }] }),
      await call("GET", "/settings"),
      await call("PATCH", "/settings", { monthlyAmountKrw: 100000 }),
      await call("GET", "/monthly-summary"),
    ];
    for (const res of responses) {
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.cacheControl, "no-store");
    }
  });
});
