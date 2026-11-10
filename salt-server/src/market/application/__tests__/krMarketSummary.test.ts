import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bucketLastValues,
  KR_SUMMARY_SLOTS,
  krBreadthOf,
  krSessionDateOf,
  pickKrSummaryStocks,
  type KrIntradayPoint,
  type KrStockStore,
  type KrSupplementStore,
  type MarketScheduleReader,
  type StoredKrIndexQuote,
  type StoredKrStockQuote,
  type KrMarketAction,
  type KrMarketCalendarStore,
  type KrMarketStatusStore,
} from "../../domain";
import { GetKrMarketSummary } from "../GetKrMarketSummary";
import type { ResolveKrStockUniverse } from "../SyncKrStock";

/** 국내 요약 띠(`SRV-REQ-042` · `DB-REQ-035`) */

const at = (iso: string, value: number): KrIntradayPoint => ({ at: new Date(iso), value });

describe("국내 요약 도메인 함수", () => {
  it("남은 칸만큼 유니버스 앞에서 — 지수 칸 1개면 종목 8개", () => {
    const universe = Array.from({ length: 20 }, (_, i) => String(i).padStart(6, "0"));
    assert.equal(pickKrSummaryStocks(universe, 1).length, KR_SUMMARY_SLOTS - 1);
    assert.deepEqual(pickKrSummaryStocks(universe, 1).slice(0, 2), ["000000", "000001"]);
    assert.equal(pickKrSummaryStocks(universe, 12).length, 0);
  });

  it("분위기는 지수 행의 수를 더하고, 수가 하나도 없으면 null", () => {
    assert.deepEqual(
      krBreadthOf([
        { advancers: 640, unchanged: 37, decliners: 235 },
        { advancers: 1123, unchanged: 61, decliners: 555 },
      ]),
      { up: 1763, flat: 98, down: 790, total: 2651 }
    );
    assert.equal(krBreadthOf([{ advancers: null, unchanged: null, decliners: null }]), null);
    assert.equal(krBreadthOf([]), null);
  });

  it("분 기록은 5분 칸마다 마지막 값 — 순서가 섞여 와도 시간순", () => {
    const points = [
      at("2026-11-02T00:04:00Z", 3), // 09:04 KST — 09:00 칸 마지막
      at("2026-11-02T00:00:00Z", 1),
      at("2026-11-02T00:02:00Z", 2),
      at("2026-11-02T00:05:00Z", 4), // 09:05 칸
    ];
    assert.deepEqual(bucketLastValues(points, 5), [3, 4]);
  });

  it("점이 하나면 선이 아니다", () => {
    assert.equal(bucketLastValues([at("2026-11-02T00:00:00Z", 1)], 5), null);
    assert.equal(bucketLastValues([], 5), null);
  });

  it("그린 날은 마지막 점의 KST 날짜", () => {
    assert.equal(krSessionDateOf([at("2026-11-02T06:30:00Z", 1)]), "2026-11-02");
    // 15:00 UTC = 다음날 00:00 KST
    assert.equal(krSessionDateOf([at("2026-11-02T15:00:00Z", 1)]), "2026-11-03");
    assert.equal(krSessionDateOf(undefined), null);
  });
});

const indexRow = (code: string, over: Partial<StoredKrIndexQuote> = {}): StoredKrIndexQuote => ({
  code,
  value: 5892.25,
  change: 161.51,
  changeRate: 2.82,
  advancers: 640,
  unchanged: 37,
  decliners: 235,
  high: 5907.21,
  low: 5616.5,
  tradeValue: 11_022_338_000_000,
  updatedAt: new Date("2026-11-02T04:58:00Z"),
  ...over,
});
const quote = (code: string, changeRate = 1): StoredKrStockQuote =>
  ({
    code,
    name: `종목${code}`,
    market: "KOSPI",
    price: 100_000,
    change: 1_000,
    changeRate,
    tradeValue: 5e11,
    highPrice: 101_000,
    lowPrice: 99_000,
    priceUpdatedAt: new Date("2026-11-02T04:58:00Z"),
    logoSource: null,
    homepage: null,
  }) as unknown as StoredKrStockQuote;

const ticks = [at("2026-11-02T00:00:00Z", 5700), at("2026-11-02T00:05:00Z", 5750), at("2026-11-02T04:55:00Z", 5890)];

const setup = (
  opts: { ticksFail?: boolean; scheduleFail?: boolean; actionsFail?: boolean; universe?: string[]; noBars?: string[]; actions?: KrMarketAction[] } = {}
) => {
  const universe = opts.universe ?? ["005930", "000660", "035420"];
  const supplement = {
    indexQuotes: async (codes: string[]) => codes.map((c) => indexRow(c, c === "1001" ? { changeRate: -5.5 } : {})),
    latestSessionIndexTicks: async (codes: string[]) => {
      if (opts.ticksFail) throw new Error("db");
      return new Map(codes.map((c) => [c, ticks]));
    },
  } as unknown as KrSupplementStore;
  const store = {
    quotes: async ({ codes }: { codes: string[] }) => codes.map((c) => quote(c, c === "000660" ? 6 : 1)),
    latestSessionCloses: async (codes: string[]) =>
      new Map(codes.filter((c) => !(opts.noBars ?? []).includes(c)).map((c) => [c, ticks])),
  } as unknown as KrStockStore;
  const schedule: MarketScheduleReader = {
    upcoming: async () => {
      if (opts.scheduleFail) throw new Error("forecast db");
      return ["2026-11-05T23:00:00Z", "2026-11-12T01:00:00Z", "2026-11-13T01:00:00Z", "2026-11-20T01:00:00Z"].map((iso) => ({
        kind: "kr_bok_rate",
        eventAt: new Date(iso),
        eventSymbol: "",
      })) as never;
    },
  };
  return new GetKrMarketSummary({
    store,
    supplement,
    universe: { execute: async () => universe } as unknown as ResolveKrStockUniverse,
    schedule,
    policy: { featured: "0001", indexItems: ["1001"], wideMoveRate: 5 },
    // F016 단계 A — 시장 조치 · 장 상태(2026-11-02 14:00 KST 개장일)
    status: {
      marketActions: async () => {
        if (opts.actionsFail) throw new Error("db");
        return opts.actions ?? [];
      },
    } as unknown as KrMarketStatusStore,
    calendar: {
      upsertDays: async () => {},
      daysFromDailyCandles: async () => [],
      days: async (from: string, to: string) =>
        ["2026-10-30", "2026-11-02", "2026-11-03"].filter((d) => d >= from && d <= to)
          .map((date) => ({ date, isOpen: true, isTradingDay: true, isBusinessDay: true, isSettlementDay: true })),
    } as KrMarketCalendarStore,
    now: () => new Date("2026-11-02T05:00:00Z"),
  });
};

describe("GetKrMarketSummary", () => {
  it("시장 조치(F016 단계 A) — 끝을 못 본 오늘 조치는 active · 재개 예정은 서버가 · 못 읽으면 빈 배열 + degraded", async () => {
    const startedAt = new Date("2026-11-02T04:50:00Z"); // 13:50 KST
    const view = await setup({
      actions: [{ market: "KOSPI", tradeDate: "2026-11-02", kind: "circuit_breaker", stage: 1, direction: "down", startedAt, endedAt: null, source: "inferred" }],
    }).execute();
    assert.deepEqual(view.marketActions, [
      {
        market: "KOSPI", kind: "circuit_breaker", stage: 1, direction: "down", startedAt: startedAt.toISOString(), endedAt: null,
        resumesAt: "2026-11-02T05:10:00.000Z", source: "inferred", active: true,
      },
    ]);
    const failed = await setup({ actionsFail: true }).execute();
    assert.deepEqual(failed.marketActions, []);
    assert.equal(failed.degraded, true);
  });

  it("읽는 사람을 받지 않는다 — 소유자 판정 없이 누구에게나 같은 요약(ADR-011)", async () => {
    const useCase = setup();
    assert.equal(useCase.execute.length, 0);
    const view = await useCase.execute();
    assert.equal(view.assetClass, "kr_stock");
  });

  it("대표 코스피 · 지수 칸 코스닥 · 종목은 유니버스 순서 · 등락 기준은 전일 종가", async () => {
    const view = await setup().execute();
    assert.equal(view.assetClass, "kr_stock");
    assert.equal(view.changeBasis, "prev_close");
    assert.equal(view.featured?.symbol, "0001");
    assert.equal(view.featured?.kind, "index");
    assert.equal(view.featured?.koreanName, "코스피");
    assert.equal(view.featured?.logoUrl, null);
    assert.deepEqual(
      view.items.map((i) => [i.symbol, i.kind]),
      [["1001", "index"], ["005930", "stock"], ["000660", "stock"], ["035420", "stock"]]
    );
    // 금액은 서버 저장값 그대로(전일 대비) — 역산하지 않는다
    assert.equal(view.featured?.change24hAmount, 161.51);
    assert.equal(view.sparklineDate, "2026-11-02");
    assert.deepEqual(view.featured?.sparkline, [5700, 5750, 5890]);
  });

  it("태그는 코인과 같은 함수 — 절댓값 5% 이상", async () => {
    const view = await setup().execute();
    const tags = Object.fromEntries(view.items.map((i) => [i.symbol, i.tags]));
    assert.deepEqual(tags["1001"], ["wide_move"]);
    assert.deepEqual(tags["000660"], ["wide_move"]);
    assert.deepEqual(tags["005930"], []);
  });

  it("오늘의 시장 = 지수 행 합 · 소식 자리는 일정 3건 · 뉴스는 지어내지 않는다", async () => {
    const view = await setup().execute();
    assert.equal(view.breadth?.total, (640 + 37 + 235) * 2);
    assert.equal(view.schedule.length, 3);
    assert.deepEqual(view.headlines, []);
    assert.equal(view.degraded, false);
  });

  it("분 기록 · 일정이 실패해도 띠는 선다 — 그 칸만 비우고 degraded", async () => {
    const view = await setup({ ticksFail: true, scheduleFail: true }).execute();
    assert.equal(view.featured?.sparkline, null);
    assert.equal(view.featured?.currentPrice, 5892.25);
    assert.deepEqual(view.schedule, []);
    assert.equal(view.degraded, true);
  });

  it("5분봉이 없는 종목은 칸이 남고 선만 null", async () => {
    const view = await setup({ noBars: ["035420"] }).execute();
    const item = view.items.find((i) => i.symbol === "035420");
    assert.equal(item?.sparkline, null);
    assert.equal(view.degraded, true);
  });

  it("작은 칸은 9개를 넘지 않는다", async () => {
    const universe = Array.from({ length: 30 }, (_, i) => String(100000 + i));
    const view = await setup({ universe }).execute();
    assert.equal(view.items.length, KR_SUMMARY_SLOTS);
  });
});
