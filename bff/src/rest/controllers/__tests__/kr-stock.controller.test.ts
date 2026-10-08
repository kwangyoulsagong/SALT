import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, afterEach, before, describe, it, mock } from "node:test";

import app from "../../app";
import { appKrStockService } from "../../../services/app-kr-stock.service";

/**
 * 국내 주식 경로 (F011 · `BFF-REQ-040`). 실제 Express 앱에 붙여 본다 — 라우터 순서가 계약이다
 * (`/kr` 이 코인 `/:symbol` 에, `/search` 가 `/:code` 에 먹히지 않는다).
 */
let server: Server;
let base: string;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const get = async (path: string, auth = true) => {
  const res = await fetch(`${base}${path}`, { headers: auth ? { Authorization: "Bearer t" } : {} });
  return { status: res.status, body: (await res.json()) as { success?: boolean; data?: unknown; message?: string } };
};

describe("/api/app/market/kr", () => {
  afterEach(() => mock.restoreAll());

  it("인증 없으면 401 — 비회원 응답에 국내 주식 0건", async () => {
    const call = mock.method(appKrStockService, "getSession", async () => ({ status: "disabled" }) as never);
    assert.equal((await get("/api/app/market/kr/session", false)).status, 401);
    assert.equal(call.mock.callCount(), 0);
  });

  it("/kr/session 이 코인 /:symbol 로 새지 않는다", async () => {
    mock.method(appKrStockService, "getSession", async () => ({ status: "disabled" }) as never);
    assert.deepEqual(await get("/api/app/market/kr/session"), { status: 200, body: { success: true, data: { status: "disabled" } } });
  });

  it("/kr/search 가 /:code 로 잡히지 않는다", async () => {
    const call = mock.method(appKrStockService, "search", async () => ({ status: "ok", items: [] }) as never);
    const r = await get(`/api/app/market/kr/search?q=${encodeURIComponent(" 삼성 ")}`);
    assert.equal(r.status, 200);
    assert.equal(call.mock.calls[0]!.arguments[1], "삼성");
  });

  it("상세 · 차트 — 코드는 대문자로, 기본값은 서버와 같다", async () => {
    const detail = mock.method(appKrStockService, "getDetail", async () => ({ status: "unavailable" }) as never);
    const chart = mock.method(appKrStockService, "getChart", async () => ({ status: "unavailable" }) as never);
    const overview = mock.method(appKrStockService, "getOverview", async () => ({ status: "unavailable" }) as never);
    await get("/api/app/market/kr/0001a0");
    await get("/api/app/market/kr/005930/chart");
    await get("/api/app/market/kr/overview");
    await get("/api/app/market/kr/overview?sort=trade_value&order=asc&period=7d");
    assert.equal(detail.mock.calls[0]!.arguments[1], "0001A0");
    assert.deepEqual(chart.mock.calls[0]!.arguments[2], { period: "1d", count: 120 });
    // 코인 표와 같은 필터 문자열(F011 슬라이스 3) — 빈 문자열 = 기본(시가총액 · 실시간)
    assert.deepEqual(overview.mock.calls[0]!.arguments[1], { limit: 50, offset: 0, sort: "", order: "", period: "" });
    assert.deepEqual(overview.mock.calls[1]!.arguments[1], { limit: 50, offset: 0, sort: "trade_value", order: "asc", period: "7d" });
  });

  it("형식이 틀리면 400 — 서버를 부르지 않는다(경로 주입 · 범위)", async () => {
    const calls = [
      mock.method(appKrStockService, "getDetail", async () => ({ status: "ok" }) as never),
      mock.method(appKrStockService, "getChart", async () => ({ status: "ok" }) as never),
      mock.method(appKrStockService, "getOverview", async () => ({ status: "ok" }) as never),
      mock.method(appKrStockService, "search", async () => ({ status: "ok" }) as never),
    ];
    for (const path of [
      "/api/app/market/kr/..%2Fadmin",
      "/api/app/market/kr/5930",
      "/api/app/market/kr/005930/chart?period=1h",
      "/api/app/market/kr/005930/chart?count=501",
      "/api/app/market/kr/overview?limit=101",
      "/api/app/market/kr/overview?offset=-1",
      "/api/app/market/kr/overview?sort=volume",
      "/api/app/market/kr/overview?period=1w",
      "/api/app/market/kr/overview?order=up",
      "/api/app/market/kr/search?q=a",
    ]) {
      assert.equal((await get(path)).status, 400, path);
    }
    assert.equal(calls.reduce((n, c) => n + c.mock.callCount(), 0), 0);
  });

  it("서비스가 올린 4xx(소유자 아님)는 error middleware 가 그대로", async () => {
    mock.method(appKrStockService, "getSession", async () => {
      throw Object.assign(new Error("404"), { response: { status: 404, data: { code: "KR_STOCK_NOT_AVAILABLE", message: "x" }, headers: {} } });
    });
    const r = await get("/api/app/market/kr/session");
    assert.equal(r.status, 404);
    assert.equal((r.body as { code?: string }).code, "KR_STOCK_NOT_AVAILABLE");
  });
});
