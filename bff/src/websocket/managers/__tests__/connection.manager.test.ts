import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ExtendedWebSocket } from "../../../types/websocket.types";
import { connectionManager } from "../connection.manager";

/**
 * 연결 관리 — 키가 **소켓**이어야 한다.
 *
 * 원래는 토큰을 키로 써서 같은 사용자의 두 번째 탭이 첫 탭을 덮어썼다
 * (2026-09-21 재현: 두 번째 탭을 연 뒤 첫 탭 수신 0건).
 */
const fakeSocket = (connectionId: string, symbols: string[]) => {
  const sent: string[] = [];
  const ws = {
    connectionId,
    authenticated: true,
    OPEN: 1,
    readyState: 1,
    subscribedSymbols: new Set(symbols),
    send: (msg: string) => sent.push(msg),
  } as unknown as ExtendedWebSocket;
  return { ws, sent };
};

describe("connectionManager", () => {
  it("같은 사용자의 두 소켓이 둘 다 받는다", () => {
    const a = fakeSocket("tab-a", ["BTC"]);
    const b = fakeSocket("tab-b", ["BTC"]);
    connectionManager.addConnection(a.ws);
    connectionManager.addConnection(b.ws);

    connectionManager.broadcastToSubscribers("BTC", { type: "price_update" });

    assert.equal(a.sent.length, 1);
    assert.equal(b.sent.length, 1);
    connectionManager.removeConnection("tab-a");
    connectionManager.removeConnection("tab-b");
  });

  it("한 소켓이 닫혀도 다른 소켓은 계속 받는다", () => {
    const a = fakeSocket("tab-a", ["ETH"]);
    const b = fakeSocket("tab-b", ["ETH"]);
    connectionManager.addConnection(a.ws);
    connectionManager.addConnection(b.ws);

    connectionManager.removeConnection("tab-b");
    connectionManager.broadcastToSubscribers("ETH", { type: "price_update" });

    assert.equal(a.sent.length, 1);
    assert.equal(b.sent.length, 0);
    connectionManager.removeConnection("tab-a");
  });

  it("닫힌 소켓의 심볼은 구독 합집합에서 빠진다", () => {
    const a = fakeSocket("tab-a", ["SOL"]);
    connectionManager.addConnection(a.ws);
    assert.ok(connectionManager.getAllSubscribedSymbols().includes("SOL"));

    connectionManager.removeConnection("tab-a");

    assert.ok(!connectionManager.getAllSubscribedSymbols().includes("SOL"));
  });

  it("같은 id 를 두 번 지워도 안전하다 (heartbeat 종료 + close 이벤트)", () => {
    const a = fakeSocket("tab-a", []);
    connectionManager.addConnection(a.ws);
    connectionManager.removeConnection("tab-a");
    connectionManager.removeConnection("tab-a");
    assert.equal(connectionManager.getConnectionCount(), 0);
  });
});
