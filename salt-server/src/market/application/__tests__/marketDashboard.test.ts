import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GetMarketDashboard, MARKET_DASHBOARD_FRESH_MS } from "../AnalyzeMarketIntelligence";

/** SRV-REQ-053 FR-3 — 계산해 둔 값이 있으면 외부 호출을 기다리지 않는다 */
describe("GetMarketDashboard", () => {
  const setup = () => {
    let t = Date.parse("2026-11-10T05:00:00Z");
    let calls = 0;
    let hold: Promise<void> | null = null;
    const sentiment = { execute: async () => { calls++; if (hold) await hold; return { score: calls } as never; } };
    const smartMoney = { execute: async () => ({ index: 1 }) as never };
    const read = new GetMarketDashboard(sentiment, smartMoney, () => new Date(t));
    return {
      read,
      calls: () => calls,
      advance: (ms: number) => void (t += ms),
      block: () => { let release!: () => void; hold = new Promise<void>((r) => (release = r)); return () => { hold = null; release(); }; },
    };
  };
  const settle = () => new Promise((resolve) => setImmediate(resolve));

  it("처음 보는 종목은 계산을 기다리고 · 겹친 요청은 한 번", async () => {
    const { read, calls } = setup();
    const [a, b] = await Promise.all([read.execute("BTC"), read.execute("BTC")]);
    assert.equal(a, b);
    assert.equal(calls(), 1);
  });

  it("15초 안은 다시 계산하지 않는다", async () => {
    const { read, calls, advance } = setup();
    await read.execute("BTC");
    advance(MARKET_DASHBOARD_FRESH_MS - 1);
    await read.execute("BTC");
    await settle();
    assert.equal(calls(), 1);
  });

  it("15초가 지나면 계산해 둔 값을 바로 주고 뒤에서 다시 계산한다 — 외부가 영영 답하지 않아도", async () => {
    const { read, calls, advance, block } = setup();
    const first = await read.execute("BTC");
    advance(MARKET_DASHBOARD_FRESH_MS);
    const release = block();
    const again = await read.execute("BTC");
    assert.equal(again, first);
    assert.equal(calls(), 2);
    release();
    await settle();
    const fresh = await read.execute("BTC");
    assert.notEqual(fresh, first);
  });

  it("뒤 계산이 실패해도 응답은 계산해 둔 값", async () => {
    let fail = false;
    const read = new GetMarketDashboard(
      { execute: async () => { if (fail) throw new Error("업비트"); return {} as never; } },
      { execute: async () => ({}) as never },
      (() => { let t = 0; return () => new Date((t += MARKET_DASHBOARD_FRESH_MS)); })()
    );
    const first = await read.execute("BTC");
    fail = true;
    assert.equal(await read.execute("BTC"), first);
    await settle();
  });
});
