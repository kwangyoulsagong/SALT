import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { after, describe, it } from "node:test";
import { WebSocketServer } from "ws";

import { KisRealtimeClient } from "../KisRealtimeClient";

/**
 * 가짜 KIS WS 서버로 장애 경로를 본다(F011 FR-93) — 실제 KIS 는 끊을 수 없다.
 * 시간은 주입한다(무응답 150ms · 백오프 20ms).
 */
const servers: WebSocketServer[] = [];
after(() => servers.forEach((s) => s.close()));

const startServer = (onConnection: (socket: import("ws").WebSocket, index: number) => void) =>
  new Promise<{ url: string; connections: () => number }>((resolve) => {
    let count = 0;
    const wss = new WebSocketServer({ port: 0 }, () => {
      const port = (wss.address() as { port: number }).port;
      resolve({ url: `ws://127.0.0.1:${port}`, connections: () => count });
    });
    wss.on("connection", (socket) => onConnection(socket, count++));
    servers.push(wss);
  });

const client = (url: string) =>
  new KisRealtimeClient({
    url,
    approvalKey: async () => "approval-test",
    secrets: [],
    idleTimeoutMs: 150,
    backoffBaseMs: 20,
    watchdogIntervalMs: 30,
    subscribeGapMs: 1,
  });

const until = async (check: () => boolean, ms = 3_000) => {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("시간 안에 조건이 안 됐다");
    await delay(10);
  }
};

describe("KisRealtimeClient 장애 경로 (FR-93)", () => {
  it("아무 메시지도 없이 무응답 시간이 지나면 끊고 다시 붙는다", async () => {
    const server = await startServer(() => {});
    const c = client(server.url);
    await c.connect(() => {});
    await until(() => server.connections() >= 2);
    await c.disconnect();
  });

  it("연속 3회 접속 실패면 degraded — 그동안 폴링이 받는다", async () => {
    const server = await startServer((socket) => socket.terminate());
    const c = client(server.url);
    await c.connect(() => {});
    await until(() => c.state() === "degraded");
    assert.ok(server.connections() >= 3);
    await c.disconnect();
    assert.equal(c.state(), "idle");
  });

  it("PINGPONG 은 같은 프레임으로 돌려준다", async () => {
    const ping = JSON.stringify({ header: { tr_id: "PINGPONG", datetime: "20261007153000" } });
    let echoed = "";
    const server = await startServer((socket) => {
      socket.on("message", (data) => (echoed = data.toString()));
      socket.send(ping);
    });
    const c = client(server.url);
    await c.connect(() => {});
    await until(() => echoed === ping);
    await c.disconnect();
    assert.equal(server.connections(), 1);
  });

  it("구독은 집합 차이만 보낸다 — 빠진 것 해제(tr_type 2) · 새것 등록(1)", async () => {
    const sent: Array<{ trType: string; code: string }> = [];
    const server = await startServer((socket) => {
      socket.on("message", (data) => {
        const m = JSON.parse(data.toString());
        sent.push({ trType: m.header.tr_type, code: m.body.input.tr_key });
      });
    });
    const c = client(server.url);
    await c.connect(() => {});
    await until(() => c.state() === "open");
    await c.subscribe(["005930", "000660"]);
    await until(() => sent.length === 2);
    await c.subscribe(["000660", "035720"]);
    await until(() => sent.length === 4);
    assert.deepEqual(sent.slice(2), [
      { trType: "2", code: "005930" },
      { trType: "1", code: "035720" },
    ]);
    assert.deepEqual(c.subscribed().sort(), ["000660", "035720"]);
    await c.disconnect();
  });

  it("등록 거부(OPSP0008 MAX SUBSCRIBE OVER — 42번째, 2026-10-07 실측)면 그 종목을 구독에서 뺀다 — 폴링이 받는다", async () => {
    const server = await startServer((socket) => {
      socket.on("message", (data) => {
        const m = JSON.parse(data.toString());
        const code = m.body.input.tr_key;
        const rejected = code === "000002";
        socket.send(
          JSON.stringify({
            header: { tr_id: "H0STCNT0", tr_key: code },
            body: { rt_cd: rejected ? "1" : "0", msg_cd: rejected ? "OPSP0008" : "OPSP0000", msg1: rejected ? "MAX SUBSCRIBE OVER" : "SUBSCRIBE SUCCESS" },
          })
        );
      });
    });
    const c = client(server.url);
    await c.connect(() => {});
    await until(() => c.state() === "open");
    await c.subscribe(["000001", "000002"]);
    await until(() => c.subscribed().length === 1);
    assert.deepEqual(c.subscribed(), ["000001"]);
    await c.disconnect();
  });
});

