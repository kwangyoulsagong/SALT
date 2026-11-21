import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionStatus } from "./types";
import { HIDDEN_CLOSE_MS, WSClient } from "./wsClient";

/** 가짜 소켓 — 연 것 · 닫은 것 · 보낸 것을 센다 */
class FakeSocket {
  static OPEN = 1;
  static all: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  open() {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.();
  }
}

let visibility: "visible" | "hidden" = "visible";
let surface: string | null = null;
const listeners = new Set<() => void>();
const setVisibility = (next: "visible" | "hidden") => {
  visibility = next;
  listeners.forEach((fn) => fn());
};

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.all = [];
  visibility = "visible";
  surface = null;
  listeners.clear();
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", {
    get visibilityState() {
      return visibility;
    },
    documentElement: { getAttribute: () => surface },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const live = () => FakeSocket.all.filter((s) => !s.closed);

describe("화면이 안 보이면 쉰다(`FE-REQ-077` FR-1)", () => {
  it.each([
    ["휴대폰", "mobile", HIDDEN_CLOSE_MS.mobile],
    ["데스크톱", null, HIDDEN_CLOSE_MS.desktop],
  ])("%s — 숨은 채 상한을 넘기면 닫고 재연결 0, 그 전엔 그대로", (_, s, limit) => {
    surface = s;
    const client = new WSClient("ws://t");
    client.subscribePrices(["KRW-BTC"], () => undefined);
    FakeSocket.all[0]!.open();
    setVisibility("hidden");
    vi.advanceTimersByTime(limit - 1);
    expect(live()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(live()).toHaveLength(0);
    expect(client.getStatus()).toBe(ConnectionStatus.Idle);
    vi.advanceTimersByTime(120_000);
    expect(FakeSocket.all).toHaveLength(1); // 재연결 시도 0
  });

  it("다시 보이면 곧바로 연결하고 구독을 다시 보낸다", () => {
    surface = "mobile";
    const client = new WSClient("ws://t");
    client.subscribePrices(["KRW-BTC"], () => undefined);
    FakeSocket.all[0]!.open();
    setVisibility("hidden");
    vi.advanceTimersByTime(HIDDEN_CLOSE_MS.mobile);
    setVisibility("visible");
    expect(FakeSocket.all).toHaveLength(2);
    FakeSocket.all[1]!.open();
    expect(FakeSocket.all[1]!.sent.join()).toContain("KRW-BTC");
    expect(client.getStatus()).toBe(ConnectionStatus.Open);
  });

  it("상한 전에 돌아오면 닫지 않는다(짧은 전환)", () => {
    surface = "mobile";
    const client = new WSClient("ws://t");
    client.subscribePrices(["KRW-BTC"], () => undefined);
    FakeSocket.all[0]!.open();
    setVisibility("hidden");
    vi.advanceTimersByTime(HIDDEN_CLOSE_MS.mobile / 2);
    setVisibility("visible");
    vi.advanceTimersByTime(HIDDEN_CLOSE_MS.mobile * 2);
    expect(live()).toHaveLength(1);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it("쉬는 사이 걸려 있던 재연결 대기도 지운다", () => {
    surface = "mobile";
    const client = new WSClient("ws://t");
    client.subscribePrices(["KRW-BTC"], () => undefined);
    setVisibility("hidden");
    // 쉼 상한 직전에 서버가 끊음 → 재연결 대기가 걸린 채 쉼에 들어간다
    vi.advanceTimersByTime(HIDDEN_CLOSE_MS.mobile - 1);
    live().forEach((s) => s.close());
    const before = FakeSocket.all.length;
    vi.advanceTimersByTime(1 + 120_000);
    expect(FakeSocket.all).toHaveLength(before);
    expect(live()).toHaveLength(0);
  });

  it("쉬는 중 새 구독이 와도 숨은 동안은 열지 않고, 보이면 연다", () => {
    surface = "mobile";
    const client = new WSClient("ws://t");
    client.subscribePrices(["KRW-BTC"], () => undefined);
    FakeSocket.all[0]!.open();
    setVisibility("hidden");
    vi.advanceTimersByTime(HIDDEN_CLOSE_MS.mobile);
    client.subscribeKrPrices(["005930"], () => undefined);
    expect(FakeSocket.all).toHaveLength(1);
    setVisibility("visible");
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("보는 화면(리스너)이 없으면 다시 보여도 열지 않는다", () => {
    surface = "mobile";
    const client = new WSClient("ws://t");
    const off = client.subscribePrices(["KRW-BTC"], () => undefined);
    FakeSocket.all[0]!.open();
    setVisibility("hidden");
    vi.advanceTimersByTime(HIDDEN_CLOSE_MS.mobile);
    off();
    setVisibility("visible");
    expect(FakeSocket.all).toHaveLength(1);
  });
});
