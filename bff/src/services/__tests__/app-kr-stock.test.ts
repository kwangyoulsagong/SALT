import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appKrStockService } from "../app-kr-stock.service";
import { backendApi } from "../backend-api.service";

/** 국내 주식 조회 실패 규칙 (F011 · `BFF-REQ-040` FR-3). */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number, code?: string) =>
  Object.assign(new Error(`status ${status}`), {
    response: { status, data: { message: "x", ...(code ? { code } : {}) }, headers: {} },
  });

const session = {
  session: "regular",
  now: "2026-10-08T01:00:00.000Z",
  lastCloseAt: null,
  nextOpenAt: null,
  calendarKnown: true,
  provider: { status: "ok", since: null, lastSuccessAt: "2026-10-08T00:59:00.000Z", realtime: { state: "open", subscribed: 41, lastTickAt: null } },
};

describe("AppKrStockService", () => {
  afterEach(() => mock.restoreAll());

  it("성공 — status ok + 뷰모델", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ok(session));
    const r = await appKrStockService.getSession("t");
    assert.equal(r.status, "ok");
    assert.ok(r.status === "ok" && r.session === "regular" && !("subscribed" in r.provider.realtime));
  });

  it("503 KR_STOCK_DISABLED → disabled, 다시 부르지 않는다(꺼진 상태지 고장이 아니다)", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(503, "KR_STOCK_DISABLED");
    });
    assert.deepEqual(await appKrStockService.getSession("t"), { status: "disabled" });
    assert.equal(call.mock.callCount(), 1);
  });

  it("404(소유자 아님)는 그대로 올린다 — unavailable 로 바꾸면 기능의 존재를 알린다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(404, "KR_STOCK_NOT_AVAILABLE");
    });
    await assert.rejects(() => appKrStockService.getOverview("t", { limit: 50, offset: 0 }), /status 404/);
  });

  it("5xx 는 한 번 다시 부르고 그래도 실패면 unavailable", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(500);
    });
    assert.deepEqual(await appKrStockService.getDetail("t", "005930"), { status: "unavailable" });
    assert.equal(call.mock.callCount(), 2);
  });

  it("계약이 깨지면 unavailable — 0 으로 채운 표를 주지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () => ok({ session, items: [{ code: "005930" }], nextOffset: null }));
    assert.deepEqual(await appKrStockService.getOverview("t", { limit: 50, offset: 0 }), { status: "unavailable" });
  });

  it("서버 경로 · 쿼리 · 타임아웃", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () =>
      ok({ period: "5m", candles: [], coverage: { from: null, to: null, tradingDays: 0 } }),
    );
    await appKrStockService.getChart("t", "005930", { period: "5m", count: 200 });
    await appKrStockService.search("t", "삼성 전자").catch(() => undefined);
    const [method, path, token, , options] = call.mock.calls[0]!.arguments as [string, string, string, unknown, { timeout: number }];
    assert.deepEqual([method, path, token], ["GET", "/market/kr/005930/chart?period=5m&count=200", "t"]);
    assert.equal(options.timeout, 1_500);
    assert.equal(call.mock.calls[1]!.arguments[1], `/market/kr/search?q=${encodeURIComponent("삼성 전자")}`);
  });

  it("취소는 실패가 아니다 — 그대로 올린다", async () => {
    const aborter = new AbortController();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      aborter.abort();
      throw Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
    });
    await assert.rejects(() => appKrStockService.getSession("t", aborter.signal), /canceled/);
  });
});
