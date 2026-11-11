import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MarketProbe } from "../../domain";
import { collectJudgmentMaterials, materialGuards } from "../lib/judgeSymbols";

/**
 * 코인 장기 판단 — 일봉이 MA50 몫(50)보다 짧으면 이력 꼬리표(`SRV-REQ-057` FR-1).
 * 원화 마켓이 생긴 지 얼마 안 된 코인(거래소 이력 자체가 짧다)은 RSI 로 판단하고 꼬리표가 사실을 말한다. 단타엔 붙이지 않는다.
 */
const NOW = new Date("2026-11-11T03:00:00Z");

const market = (counted: string[][]) =>
  ({
    quotes: async (symbols: string[]) =>
      new Map(symbols.map((s) => [s, { symbol: s, assetType: "crypto", currentPrice: 1, change24h: 0, priceUpdatedAt: NOW }])),
    latestSentiments: async () => new Map(),
    latestIndicators: async (symbols: string[], timeframe: string) =>
      new Map(
        symbols
          .filter((s) => s !== "CARDS" || timeframe !== "d1")
          .map((s) => [
            s,
            { rsi14: 50, ma20: 1, ma50: s === "BTC" || timeframe !== "d1" ? 1 : null, volumeAvg20: 1, timestamp: NOW },
          ])
      ),
    recentWhales: async () => [],
    dailyBarCounts: async (symbols: string[]) => {
      counted.push([...symbols]);
      return new Map(symbols.map((s) => [s, s === "RSR" ? 30 : 6]));
    },
  }) as unknown as MarketProbe;

describe("코인 장기 이력 꼬리표 (SRV-REQ-057 FR-1)", () => {
  it("MA50 이 없는 코인만 일봉을 센다 — 장기엔 have/need, 단타엔 없음", async () => {
    const counted: string[][] = [];
    const materials = await collectJudgmentMaterials(market(counted), ["BTC", "RSR", "CARDS"]);

    assert.deepEqual(counted, [["RSR", "CARDS"]]);

    const btc = materialGuards(materials.get("BTC")!, "long_term", NOW);
    assert.equal(btc.history, undefined);

    const rsr = materialGuards(materials.get("RSR")!, "long_term", NOW);
    assert.deepEqual(rsr.history, { ready: false, dailyBars: 30, requiredDailyBars: 50, dailyIndicator: true });
    assert.equal(materialGuards(materials.get("RSR")!, "scalp", NOW).history, undefined);

    // 일봉 6개 — 지표 문턱(15)도 못 넘었다
    const cards = materialGuards(materials.get("CARDS")!, "long_term", NOW);
    assert.deepEqual(cards.history, { ready: false, dailyBars: 6, requiredDailyBars: 50, dailyIndicator: false });
  });
});
