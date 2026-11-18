import { describe, expect, it } from "vitest";

import { firstCardHolders, type CoachCard } from "./conversation";

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
