import { describe, expect, it } from "vitest";

import { firstCardHolders, isSameCard, type CoachCard } from "./conversation";

const blocked = (at: string): CoachCard => ({ renderable: false, blockedReason: "insufficient_sample", trackSample: 3, generatedAt: at });
const ok = (at: string, symbol = "BTC") =>
  ({ renderable: true, action: "hold", symbol, generatedAt: at }) as unknown as CoachCard;

describe("firstCardHolders — 한 화면에 같은 카드는 한 번", () => {
  it("같은 판단이 세 자리(지난 답 · 브리핑 · 새 답)면 처음 자리만", () => {
    const a = blocked("2026-11-18T06:13:22.948Z");
    expect([...firstCardHolders([{ id: "h1", card: a }, { id: "briefing", card: a }, { id: "n1", card: a }])]).toEqual(["h1"]);
  });

  it("판단 시각 · 종목 · 통과 여부가 다르면 다른 카드", () => {
    const items = [
      { id: "a", card: ok("2026-11-17T00:00:00Z") },
      { id: "b", card: ok("2026-11-18T00:00:00Z") },
      { id: "c", card: ok("2026-11-18T00:00:00Z", "ETH") },
      { id: "d", card: blocked("2026-11-18T00:00:00Z") },
    ];
    expect([...firstCardHolders(items)]).toEqual(["a", "b", "c", "d"]);
  });

  it("카드 없는 자리는 세지 않는다", () => {
    expect([...firstCardHolders([{ id: "q", card: null }, { id: "x", card: blocked("t") }])]).toEqual(["x"]);
  });
});

describe("isSameCard — PC 격자 옆 칸 카드와 대화 안 카드", () => {
  it("firstCardHolders 와 같은 열쇠 — 판단 시각 · 종목 · 통과 여부", () => {
    expect(isSameCard(blocked("t1"), blocked("t1"))).toBe(true);
    expect(isSameCard(ok("t1"), ok("t1"))).toBe(true);
    expect(isSameCard(ok("t1"), ok("t2"))).toBe(false);
    expect(isSameCard(ok("t1"), ok("t1", "ETH"))).toBe(false);
    expect(isSameCard(ok("t1"), blocked("t1"))).toBe(false);
  });

  it("옆 칸 카드를 맨 앞에 두면 대화 안 같은 카드는 전부 접힌다", () => {
    const a = ok("2026-11-19T00:00:00Z");
    expect([...firstCardHolders([{ id: "aside", card: a }, { id: "briefing", card: a }, { id: "n1", card: a }])]).toEqual(["aside"]);
  });
});
