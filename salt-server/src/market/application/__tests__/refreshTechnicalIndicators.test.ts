import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  IndicatorRepository,
  MarketAssetRepository,
  PriceHistoryRepository,
} from "../../domain";
import { RefreshTechnicalIndicators } from "../RefreshTechnicalIndicators";

/**
 * 지표 주기 ← 캔들 주기 매핑 (F010 슬라이스 0).
 *
 * 원문은 `m5` · `h1` 이름으로 캔들을 조회했고 캔들은 `5m` · `1d` 라 **지표가 한 번도 계산되지 않았다.**
 * 이 테스트는 어느 캔들을 몇 개 읽어 어느 지표 주기로 쓰는지를 고정한다.
 */
describe("RefreshTechnicalIndicators", () => {
  const candle = (i: number, stepMs: number) => ({
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100 + i,
    volume: 10,
    timestamp: new Date(Date.parse("2026-09-27T00:00:00Z") - i * stepMs),
    assetType: "crypto" as const,
  });

  it("5분봉 100개 → m5, 5분봉 1,200개를 1시간으로 묶어 → h1, 일봉 100개 → d1", async () => {
    const asked: Array<[string, number]> = [];
    const written: Array<{ timeframe: string; timestamp: Date }> = [];

    const prices = {
      recentCandles: async (_symbol: string, timeframe: string, take: number) => {
        asked.push([timeframe, take]);
        const step = timeframe === "5m" ? 5 * 60_000 : 86_400_000;
        return Array.from({ length: take }, (_, i) => candle(i, step));
      },
    } as unknown as PriceHistoryRepository;
    const indicators = {
      upsert: async (input: { timeframe: string; timestamp: Date }) => {
        written.push({ timeframe: input.timeframe, timestamp: input.timestamp });
      },
    } as unknown as IndicatorRepository;
    const assets = { activeSymbols: async () => ["BTC"] } as unknown as MarketAssetRepository;

    await new RefreshTechnicalIndicators(assets, prices, indicators).execute();

    assert.deepEqual(asked, [
      ["5m", 100],
      ["5m", 1200],
      ["1d", 100],
    ]);
    assert.deepEqual(
      written.map((w) => w.timeframe),
      ["m5", "h1", "d1"]
    );
    // 1시간봉의 시각은 버킷 시작(정시)이다
    assert.equal(written[1].timestamp.getUTCMinutes(), 0);
  });

  it("국내 주식 유니버스도 같은 세 주기를 만든다 — 자산군은 봉에서, 유니버스가 실패해도 코인은 돈다 (F011 FR-60)", async () => {
    const written: Array<{ symbol: string; assetType: string; timeframe: string }> = [];
    const prices = {
      recentCandles: async (symbol: string, timeframe: string, take: number) => {
        const step = timeframe === "5m" ? 5 * 60_000 : 86_400_000;
        return Array.from({ length: take }, (_, i) => ({
          ...candle(i, step),
          assetType: symbol === "005930" ? ("kr_stock" as const) : ("crypto" as const),
        }));
      },
    } as unknown as PriceHistoryRepository;
    const indicators = {
      upsert: async (input: { symbol: string; assetType: string; timeframe: string }) => {
        written.push({ symbol: input.symbol, assetType: input.assetType, timeframe: input.timeframe });
      },
    } as unknown as IndicatorRepository;
    const assets = { activeSymbols: async () => ["BTC"] } as unknown as MarketAssetRepository;

    const result = await new RefreshTechnicalIndicators(assets, prices, indicators, async () => [
      "005930",
      "BTC",
    ]).execute();
    assert.equal(result.symbols, 2);
    assert.deepEqual(
      written.filter((w) => w.symbol === "005930").map((w) => `${w.assetType}:${w.timeframe}`),
      ["kr_stock:m5", "kr_stock:h1", "kr_stock:d1"]
    );

    written.length = 0;
    const failing = await new RefreshTechnicalIndicators(assets, prices, indicators, async () => {
      throw new Error("kr down");
    }).execute();
    assert.equal(failing.symbols, 1);
    assert.deepEqual(written.map((w) => w.symbol), ["BTC", "BTC", "BTC"]);
  });

  it("캔들이 50개 미만이면 그 주기는 쓰지 않는다", async () => {
    const written: string[] = [];
    const prices = {
      recentCandles: async (_s: string, timeframe: string, take: number) =>
        timeframe === "1d" ? [] : Array.from({ length: take }, (_, i) => candle(i, 300_000)),
    } as unknown as PriceHistoryRepository;
    const indicators = {
      upsert: async (input: { timeframe: string }) => {
        written.push(input.timeframe);
      },
    } as unknown as IndicatorRepository;
    const assets = { activeSymbols: async () => ["BTC"] } as unknown as MarketAssetRepository;

    await new RefreshTechnicalIndicators(assets, prices, indicators).execute();
    assert.deepEqual(written, ["m5", "h1"]);
  });
});
