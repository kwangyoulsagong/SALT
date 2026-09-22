import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UpbitWebSocketService } from "../upbit-ws.service";

/** 비공개 필드를 읽는다 — 연결을 열었는지는 밖에서 볼 방법이 없다 */
const socketOf = (svc: UpbitWebSocketService) =>
  (svc as unknown as { ws: unknown }).ws;

describe("UpbitWebSocketService", () => {
  it("만들기만 해서는 연결하지 않는다 — import 한 REST · 테스트가 소켓을 열지 않게", () => {
    const svc = new UpbitWebSocketService();
    assert.equal(socketOf(svc), null);
    assert.deepEqual(svc.getSubscribedSymbols(), []);
  });

  it("close() 뒤의 subscribe 는 심볼만 기억하고 연결하지 않는다", () => {
    const svc = new UpbitWebSocketService();
    svc.close();
    svc.subscribe(["btc"]);
    assert.equal(socketOf(svc), null);
    assert.deepEqual(svc.getSubscribedSymbols(), ["BTC"]);
  });
});
