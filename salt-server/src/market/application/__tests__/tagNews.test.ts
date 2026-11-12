import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { preMoveKey, type NewsKindDict, type NewsTagReader } from "../../domain";
import { TagNews } from "../TagNews";

/** F017 단계 6 — 태그는 덧붙임: 읽기가 실패해도 소식 목록은 그대로(SRV-REQ-053 FR-6) */

const DICT: NewsKindDict = {
  preregKey: "news-reaction@1",
  rules: [
    { id: "hack", text: "해킹 · 보안 사고", markets: ["crypto"], include: ["해킹"], exclude: [] },
    { id: "contract", text: "수주 · 공급계약", markets: ["kr"], include: ["수주"], exclude: [] },
  ],
  exclude: { kr: [], crypto: [] },
  newsMaxCodes: 2,
};
const at = new Date("2026-11-12T01:00:00Z");

const reader = (over: Partial<NewsTagReader> = {}): NewsTagReader => ({
  dict: async () => DICT,
  reactions: async () => [],
  preMoves: async (_m, items) => new Map(items.map((i) => [preMoveKey(i.symbol, i.publishedAt), 0.02])),
  cryptoSymbols: async () => new Set(["BTC", "ETH", "XRP"]),
  ...over,
});

describe("TagNews", () => {
  it("코인 — 관련 종목 수는 가격 시계열이 있는 심볼만 센다(태깅 잡음 BIT · CEO 는 빠진다)", async () => {
    const tags = await new TagNews(reader()).execute("crypto", [
      { id: "a", symbol: "BTC", origin: "news", related: ["BTC", "BIT", "CEO"], title: "거래소 해킹", publishedAt: at },
      { id: "b", symbol: "BTC", origin: "news", related: ["BTC", "ETH", "XRP"], title: "거래소 해킹", publishedAt: at },
    ]);
    assert.equal(tags.get("a")?.eventKind, "hack");
    assert.equal(tags.get("a")?.preMove5d, Math.expm1(0.02)); // 로그 → 단순 비율
    assert.equal(tags.has("b"), false); // 실제 코인 셋 = 묶음 기사
  });

  it("사전이 아직 없으면 · 읽기가 실패하면 빈 Map(목록은 태그 없이)", async () => {
    const item = { id: "k", symbol: "005930", origin: "news" as const, related: ["005930"], title: "수주", publishedAt: at };
    assert.equal((await new TagNews(reader({ dict: async () => null })).execute("kr", [item])).size, 0);
    const failing = reader({ reactions: async () => Promise.reject(new Error("relation does not exist")) });
    assert.equal((await new TagNews(failing).execute("kr", [item])).size, 0);
    assert.equal((await new TagNews(reader()).execute("kr", [item])).get("k")?.label, "few");
  });
});
