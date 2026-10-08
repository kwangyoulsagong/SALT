import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";

import type { ExtendedWebSocket } from "../../../types/websocket.types";
import { KrStreamManager, MAX_KR_CODES, type KrStreamOpener } from "../kr-stream.manager";

/**
 * 국내 주식 실시간 중계 (F011 · `BFF-REQ-040` FR-6~9).
 * 서버 SSE 를 `PassThrough` 로 흉내 낸다. 묶음 주기 5ms · 재연결 5ms 로 줄여 돌린다.
 */
const fakeSocket = (connectionId = "c1") => {
  const sent: Array<Record<string, unknown>> = [];
  const ws = {
    connectionId,
    authenticated: true,
    OPEN: 1,
    readyState: 1,
    send: (msg: string) => sent.push(JSON.parse(msg)),
  } as unknown as ExtendedWebSocket;
  return { ws, sent };
};

const tick = (code: string, price: number) => ({ code, price, change: 100, changeRate: 0.5, volume: "1", at: "2026-10-08T01:00:00.000Z" });
const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const setup = (opener: KrStreamOpener) => new KrStreamManager(opener, { flushMs: 5, backoffMs: [5] });

const httpError = (status: number, code?: string) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x", ...(code ? { code } : {}) }, headers: {} } });

describe("KrStreamManager", () => {
  it("구독한 코드만 · 같은 코드는 최신 값 하나로 묶어 price_update 로 보낸다", async () => {
    const upstream = new PassThrough();
    const tokens: string[] = [];
    const m = setup(async (token) => {
      tokens.push(token);
      return upstream;
    });
    const { ws, sent } = fakeSocket();

    assert.deepEqual(m.subscribe(ws, ["005930"], "tok"), ["005930"]);
    await wait(1);
    upstream.write(sse("status", { state: "open" }));
    upstream.write(sse("tick", [tick("005930", 1), tick("000660", 9)]));
    // SSE 조각이 이벤트 중간에서 끊겨 와도 모은다
    const second = sse("tick", [tick("005930", 2)]);
    upstream.write(second.slice(0, 10));
    upstream.write(second.slice(10));
    await wait(20);

    const updates = sent.filter((m) => m.type === "price_update");
    assert.deepEqual(updates, [
      {
        type: "price_update",
        data: { assetType: "kr_stock", symbol: "005930", currentPrice: 2, change24h: 0.5, change24hAmount: 100, timestamp: "2026-10-08T01:00:00.000Z" },
      },
    ]);
    assert.deepEqual(tokens, ["tok"]);
    m.releaseAll();
  });

  it("코드를 더 구독해도 upstream 을 새로 열지 않는다 · 다 빼면 닫는다", async () => {
    let opened = 0;
    let signal: AbortSignal | undefined;
    const m = setup(async (_t, s) => {
      opened += 1;
      signal = s;
      return new PassThrough();
    });
    const { ws } = fakeSocket();
    m.subscribe(ws, ["005930"], "tok");
    await wait(1);
    assert.deepEqual(m.subscribe(ws, ["000660"], "tok"), ["005930", "000660"]);
    assert.equal(opened, 1);

    assert.deepEqual(m.unsubscribe(ws, ["005930", "999999"]), ["005930"]);
    assert.equal(m.activeCount(), 1);
    m.unsubscribe(ws, ["000660"]);
    assert.equal(m.activeCount(), 0);
    assert.equal(signal?.aborted, true);
  });

  it("연결이 끊기면 upstream 도 끊는다 — 유령 스트림이 남지 않는다", async () => {
    let signal: AbortSignal | undefined;
    const m = setup(async (_t, s) => {
      signal = s;
      return new PassThrough();
    });
    const { ws } = fakeSocket();
    m.subscribe(ws, ["005930"], "tok");
    await wait(1);
    m.release(ws.connectionId);
    assert.equal(signal?.aborted, true);
    assert.equal(m.activeCount(), 0);
  });

  it("404(소유자 아님) · 401 · 503 꺼짐은 다시 열지 않고 화면에 code 로 알린다", async () => {
    for (const [status, code] of [
      [404, "KR_STOCK_NOT_AVAILABLE"],
      [401, undefined],
      [503, "KR_STOCK_DISABLED"],
    ] as const) {
      let opened = 0;
      const m = setup(async () => {
        opened += 1;
        throw httpError(status, code);
      });
      const { ws, sent } = fakeSocket();
      m.subscribe(ws, ["005930"], "tok");
      await wait(20);
      assert.equal(opened, 1, String(status));
      assert.equal(m.activeCount(), 0);
      assert.deepEqual(
        sent.map((x) => [x.type, x.assetType, x.code]),
        [["error", "kr_stock", code ?? `HTTP_${status}`]],
      );
    }
  });

  it("401 뒤 새 토큰으로 다시 구독하면 그 토큰으로 연다", async () => {
    const tokens: string[] = [];
    const m = setup(async (token) => {
      tokens.push(token);
      if (token === "old") throw httpError(401);
      return new PassThrough();
    });
    const { ws } = fakeSocket();
    m.subscribe(ws, ["005930"], "old");
    await wait(5);
    m.subscribe(ws, ["005930"], "new");
    await wait(5);
    assert.deepEqual(tokens, ["old", "new"]);
    assert.equal(m.activeCount(), 1);
    m.releaseAll();
  });

  it("5xx · upstream 끊김은 물러서며 다시 연다", async () => {
    const streams: PassThrough[] = [];
    let calls = 0;
    const m = setup(async () => {
      calls += 1;
      if (calls === 1) throw httpError(502);
      const s = new PassThrough();
      streams.push(s);
      return s;
    });
    const { ws, sent } = fakeSocket();
    m.subscribe(ws, ["005930"], "tok");
    await wait(30);
    assert.equal(calls, 2);
    streams[0]!.end();
    await wait(30);
    assert.equal(calls, 3);
    streams[1]!.write(sse("tick", [tick("005930", 7)]));
    await wait(20);
    assert.equal(sent.filter((x) => x.type === "price_update").length, 1);
    assert.equal(sent.filter((x) => x.type === "error").length, 0);
    m.releaseAll();
  });

  it(`연결 하나에 코드 ${MAX_KR_CODES}개까지`, async () => {
    const m = setup(async () => new PassThrough());
    const { ws, sent } = fakeSocket();
    const codes = Array.from({ length: MAX_KR_CODES + 1 }, (_, i) => String(i).padStart(6, "0"));
    assert.equal(m.subscribe(ws, codes, "tok"), null);
    assert.equal(sent[0]!.code, "KR_STREAM_LIMIT");
    m.releaseAll();
  });
});
