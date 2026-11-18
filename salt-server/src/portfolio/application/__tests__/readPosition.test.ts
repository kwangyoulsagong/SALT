import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  DailyClose,
  DailyCloseSource,
  Holding,
  HoldingRepository,
  NewsSentimentSource,
  TimelineTrade,
  TransactionRepository,
} from "../../domain";
import { GetPositionFlow, GetPositionOverview, type PositionSettings } from "../ReadPosition";

/** F006 G절 — 포지션 개요 · 흐름(`SRV-REQ-028` FR-80~84). 레이더 재료가 실패해도 Hero 는 나온다(`BFF-REQ-027` FR-70) */

const NOW = new Date("2026-11-18T06:00:00Z"); // KST 15:00
const DAY = 24 * 3600_000;

const settings: PositionSettings = {
  radar: {
    concentrationLimit: 60,
    volatilityFullScalePct: 80,
    volatilityLimit: 60,
    drawdownFullScalePct: 50,
    drawdownLimit: 60,
    newsLimit: 40,
    newsMinArticles: 3,
    newsMinCoveragePct: 50,
  },
  windows: { returnDays: 30, volatilityDays: 30, volatilityMinDays: 20, drawdownDays: 90, newsDays: 7, timelineLimit: 5000 },
};

const holding = (over: Partial<Holding>): Holding => ({
  id: "h",
  userId: "u1",
  symbol: "BTC",
  assetType: "crypto",
  totalQuantity: 1,
  averageBuyPrice: 100,
  totalInvested: 100,
  currentPrice: 120,
  currentValue: 120,
  unrealizedProfit: 20,
  unrealizedProfitRate: 20,
  realizedProfit: 0,
  ...over,
});

/** `days` 일 전부터 오늘까지 매일 BTC 종가(100 에서 하루 1% 씩 번갈아) */
const btcCloses = (days: number): DailyClose[] =>
  Array.from({ length: days + 1 }, (_, i) => ({
    symbol: "BTC",
    assetType: "crypto" as const,
    close: 100 * (i % 2 === 0 ? 1 : 1.01),
    timestamp: new Date(Date.parse(`${new Date(NOW.getTime() - (days - i) * DAY).toISOString().slice(0, 10)}T00:00:00Z`)),
  }));

const fakes = (opts: {
  holdings?: Holding[];
  trades?: TimelineTrade[];
  closes?: DailyClose[] | Error;
  news?: Array<{ symbol: string; labeled: number; negative: number }> | Error;
}) => {
  const holdings = { findByUser: async () => opts.holdings ?? [] } as unknown as HoldingRepository;
  const transactions = {
    findTimeline: async () => ({ trades: opts.trades ?? [], truncated: false }),
  } as unknown as TransactionRepository;
  const closes: DailyCloseSource = {
    dailyClosesSince: async () => {
      if (opts.closes instanceof Error) throw opts.closes;
      return opts.closes ?? [];
    },
  };
  const news: NewsSentimentSource = {
    sentimentCounts: async () => {
      if (opts.news instanceof Error) throw opts.news;
      return opts.news ?? [];
    },
  };
  return { holdings, transactions, closes, news };
};

const overview = (f: ReturnType<typeof fakes>) =>
  new GetPositionOverview(f.holdings, f.transactions, f.closes, f.news, settings).execute("u1", NOW);

describe("GetPositionOverview", () => {
  it("보유 0 이면 empty — Hero · 레이더 없음(0 으로 그리지 않는다)", async () => {
    const r = await overview(fakes({}));
    assert.equal(r.empty, true);
    assert.equal(r.hero, null);
    assert.equal(r.radar, null);
  });

  it("Hero 는 보유 행 합계 그대로 · 최대 비중 · 상한 넘음", async () => {
    const r = await overview(
      fakes({
        holdings: [holding({ currentValue: 700 }), holding({ symbol: "ETH", currentValue: 300, totalInvested: 400, unrealizedProfit: -100 })],
        trades: [{ symbol: "BTC", assetType: "crypto", transactionType: "buy", quantity: 1, transactionDate: new Date(NOW.getTime() - 120 * DAY) }],
        closes: btcCloses(100),
      }),
    );
    assert.equal(r.empty, false);
    assert.equal(r.hero?.totalValueKrw, 1000);
    assert.equal(r.hero?.investedKrw, 500);
    assert.equal(r.hero?.unrealizedProfitKrw, -80);
    assert.deepEqual(r.hero?.topWeight, { symbol: "BTC", assetType: "crypto", pct: 70 });
    assert.equal(r.radar?.find((a) => a.key === "concentration")?.breached, true);
    assert.notEqual(r.hero?.return30dPct, null);
    assert.notEqual(r.radar?.find((a) => a.key === "volatility")?.value, null);
  });

  it("30일 전부터 들고 있지 않았으면 30일 수익률은 null", async () => {
    const r = await overview(
      fakes({
        holdings: [holding({})],
        trades: [{ symbol: "BTC", assetType: "crypto", transactionType: "buy", quantity: 1, transactionDate: new Date(NOW.getTime() - 5 * DAY) }],
        closes: btcCloses(40),
      }),
    );
    assert.equal(r.hero?.return30dPct, null);
  });

  it("일봉 · 뉴스 원천이 실패해도 Hero 는 나오고, 그 원천을 쓰는 축만 null + 사유", async () => {
    const r = await overview(fakes({ holdings: [holding({})], closes: new Error("db"), news: new Error("news") }));
    assert.equal(r.empty, false);
    assert.equal(r.hero?.totalValueKrw, 120);
    const byKey = Object.fromEntries((r.radar ?? []).map((a) => [a.key, a]));
    assert.equal(byKey.concentration.value, 100);
    for (const key of ["volatility", "drawdown", "news"]) {
      assert.equal(byKey[key].value, null, key);
      assert.equal(byKey[key].reasonCode, "insufficient_data", key);
    }
    assert.equal(r.hero?.return30dPct, null);
    assert.equal(r.degraded, true);
    assert.deepEqual(r.degradedReasons, ["flow_unavailable", "news_unavailable"]);
  });

  it("시세가 아직 반영되지 않은 보유는 드러낸다", async () => {
    const r = await overview(fakes({ holdings: [holding({ currentPrice: 0, currentValue: 0 })] }));
    assert.deepEqual(r.empty === false && r.unvaluedSymbols, ["BTC"]);
    assert.ok(r.degradedReasons.includes("unvalued_holding"));
    assert.equal(r.hero?.topWeight, null);
  });
});

describe("GetPositionFlow", () => {
  it("거래가 없으면 종가를 부르지 않고 빈 점", async () => {
    let called = false;
    const f = fakes({});
    f.closes.dailyClosesSince = async () => {
      called = true;
      return [];
    };
    const r = await new GetPositionFlow(f.transactions, f.closes, settings.windows).execute("u1", "1m", NOW);
    assert.equal(called, false);
    assert.deepEqual(r.points, []);
    assert.equal(r.maxDrawdown, null);
  });

  it("기간 1주 = 오늘 포함 8점(구간 첫날 ~ 오늘)", async () => {
    const f = fakes({
      trades: [{ symbol: "BTC", assetType: "crypto", transactionType: "buy", quantity: 2, transactionDate: new Date(NOW.getTime() - 60 * DAY) }],
      closes: btcCloses(30),
    });
    const r = await new GetPositionFlow(f.transactions, f.closes, settings.windows).execute("u1", "1w", NOW);
    assert.equal(r.points.length, 8);
    assert.equal(r.points.at(-1)?.date, "2026-11-18");
    assert.equal(r.degraded, false);
  });
});
