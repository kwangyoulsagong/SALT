import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  Candle,
  KrCalendarSource,
  KrMarket,
  KrMarketCalendarStore,
  KrMarketDay,
  KrQuoteFeed,
  KrStockListing,
  KrStockQuoteFact,
  KrStockStore,
  KrTick,
  StoredKrStockQuote,
} from "../domain";

/**
 * 국내 주식 저장소(F011 · `DB-REQ-033`).
 *
 * ## 쓰기는 배치 한 문장
 *
 * 마스터 약 4,400행 · 일봉 페이지 100행 · 현재가 회차 50행을 Prisma `upsert` 로 쓰면 행마다 왕복이다
 * (마스터 하나에 4,400 왕복). `unnest` 로 배열을 펴서 `INSERT … ON CONFLICT` 한 번으로 쓴다 — 멱등이고
 * (같은 키 재실행은 행을 늘리지 않는다) 왕복은 한 번이다.
 *
 * ## 시각은 `timestamptz` 로 받아 UTC 로 바꿔 넣는다
 *
 * 컬럼은 `TIMESTAMP(3)`(시간대 없음)이고 Prisma 는 거기에 **UTC 벽시계**를 쓴다. 원시 SQL 에서 JS `Date` 를
 * `::timestamp` 로 받으면 DB 세션 시간대(로컬은 `Asia/Seoul`)의 벽시계가 들어가 9시간 어긋난다 — 첫 판이
 * 그랬다(2026-10-07, 일봉이 `00:00Z` 로 저장). 그래서 전부 `::timestamptz AT TIME ZONE 'UTC'` 다.
 */

const dec = (v: number | null) => (v === null ? null : new Prisma.Decimal(v));
const toNum = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));

/** 마스터 배치 크기 — 파라미터 배열 13개 × 1,000 행이면 한 문장이 충분히 작다 */
const MASTER_CHUNK = 1_000;

export class PrismaKrStockStore implements KrStockStore {
  async upsertListings(listings: KrStockListing[], syncedAt: Date) {
    for (let i = 0; i < listings.length; i += MASTER_CHUNK) {
      const chunk = listings.slice(i, i + MASTER_CHUNK);
      const col = <T,>(pick: (l: KrStockListing) => T) => chunk.map(pick);
      await prisma.$executeRaw`
        INSERT INTO kr_stock_master (code, standard_code, name, market, group_code, sector_code, base_price,
          shares_outstanding, market_cap, is_halted, is_administrative, warn_code, overheat_code, is_preferred,
          listed_at, delisted_at, synced_at)
        SELECT u.*, NULL::timestamp, (${syncedAt}::timestamptz AT TIME ZONE 'UTC') FROM unnest(
          ${col((l) => l.code)}::text[], ${col((l) => l.standardCode)}::text[], ${col((l) => l.name)}::text[],
          ${col((l) => l.market)}::text[], ${col((l) => l.groupCode)}::text[], ${col((l) => l.sectorCode)}::text[],
          ${col((l) => l.basePrice)}::numeric[], ${col((l) => l.sharesOutstanding)}::bigint[],
          ${col((l) => l.marketCap)}::numeric[], ${col((l) => l.isHalted)}::boolean[],
          ${col((l) => l.isAdministrative)}::boolean[], ${col((l) => l.warnCode)}::text[],
          ${col((l) => l.overheatCode)}::text[], ${col((l) => l.isPreferred)}::boolean[],
          ${col((l) => l.listedAt)}::date[]
        ) AS u
        ON CONFLICT (code) DO UPDATE SET
          standard_code = EXCLUDED.standard_code, name = EXCLUDED.name, market = EXCLUDED.market,
          group_code = EXCLUDED.group_code, sector_code = EXCLUDED.sector_code, base_price = EXCLUDED.base_price,
          shares_outstanding = EXCLUDED.shares_outstanding, market_cap = EXCLUDED.market_cap,
          is_halted = EXCLUDED.is_halted, is_administrative = EXCLUDED.is_administrative,
          warn_code = EXCLUDED.warn_code, overheat_code = EXCLUDED.overheat_code,
          is_preferred = EXCLUDED.is_preferred, listed_at = EXCLUDED.listed_at,
          delisted_at = NULL, synced_at = EXCLUDED.synced_at`;
    }
  }

  async markDelistedExcept(codes: string[], at: Date) {
    return prisma.$executeRaw`
      UPDATE kr_stock_master SET delisted_at = (${at}::timestamptz AT TIME ZONE 'UTC')
      WHERE delisted_at IS NULL AND NOT (code = ANY(${codes}::text[]))`;
  }

  /** `(group_code, market_cap)` 인덱스를 역순으로 탄다 — ST 만 정렬하고 n 행에서 멈춘다 */
  async topByMarketCap(n: number) {
    const rows = await prisma.krStockMaster.findMany({
      where: { groupCode: "ST", delistedAt: null, isPreferred: false, marketCap: { not: null } },
      orderBy: { marketCap: "desc" },
      take: n,
      select: { code: true },
    });
    return rows.map((row) => row.code);
  }

  async watchedCodes() {
    const rows = await prisma.investmentWatchlist.findMany({
      where: { assetType: "kr_stock" },
      distinct: ["symbol"],
      select: { symbol: true },
    });
    return rows.map((row) => row.symbol);
  }

  async upsertQuotes(facts: KrStockQuoteFact[], feed: KrQuoteFeed, at: Date) {
    if (facts.length === 0) return;
    const col = <T,>(pick: (f: KrStockQuoteFact) => T) => facts.map(pick);
    await prisma.$executeRaw`
      INSERT INTO kr_stock_quotes (code, price, change, change_rate, volume, trade_value, market_cap, base_price,
        upper_limit, lower_limit, status_code, warn_code, is_halted, per, pbr, eps, bps, week52_high, week52_low,
        foreign_rate, feed, price_updated_at)
      SELECT u.*, ${feed}, (${at}::timestamptz AT TIME ZONE 'UTC') FROM unnest(
        ${col((f) => f.code)}::text[], ${col((f) => f.price)}::numeric[], ${col((f) => f.change)}::numeric[],
        ${col((f) => f.changeRate)}::numeric[], ${col((f) => f.volume)}::bigint[], ${col((f) => f.tradeValue)}::numeric[],
        ${col((f) => f.marketCap)}::numeric[], ${col((f) => f.basePrice)}::numeric[], ${col((f) => f.upperLimit)}::numeric[],
        ${col((f) => f.lowerLimit)}::numeric[], ${col((f) => f.statusCode)}::text[], ${col((f) => f.warnCode)}::text[],
        ${col((f) => f.isHalted)}::boolean[], ${col((f) => f.per)}::numeric[], ${col((f) => f.pbr)}::numeric[],
        ${col((f) => f.eps)}::numeric[], ${col((f) => f.bps)}::numeric[], ${col((f) => f.week52High)}::numeric[],
        ${col((f) => f.week52Low)}::numeric[], ${col((f) => f.foreignRate)}::numeric[]
      ) AS u(code, price, change, change_rate, volume, trade_value, market_cap, base_price, upper_limit, lower_limit,
        status_code, warn_code, is_halted, per, pbr, eps, bps, week52_high, week52_low, foreign_rate)
      -- 마스터에 없는 코드는 넣지 않는다(FK) — 관심 목록에 남은 상폐 종목 같은 경우
      WHERE EXISTS (SELECT 1 FROM kr_stock_master m WHERE m.code = u.code)
      ON CONFLICT (code) DO UPDATE SET
        price = EXCLUDED.price, change = EXCLUDED.change, change_rate = EXCLUDED.change_rate,
        volume = EXCLUDED.volume, trade_value = EXCLUDED.trade_value, market_cap = EXCLUDED.market_cap,
        base_price = EXCLUDED.base_price, upper_limit = EXCLUDED.upper_limit, lower_limit = EXCLUDED.lower_limit,
        status_code = EXCLUDED.status_code, warn_code = EXCLUDED.warn_code, is_halted = EXCLUDED.is_halted,
        per = EXCLUDED.per, pbr = EXCLUDED.pbr, eps = EXCLUDED.eps, bps = EXCLUDED.bps,
        week52_high = EXCLUDED.week52_high, week52_low = EXCLUDED.week52_low,
        foreign_rate = EXCLUDED.foreign_rate, price_updated_at = EXCLUDED.price_updated_at,
        -- 실시간이 90초 안에 쓴 종목은 폴링 보충(5분마다)이 출처 표시를 되돌리지 않는다
        feed = CASE WHEN kr_stock_quotes.feed = 'realtime'
                     AND kr_stock_quotes.price_updated_at > EXCLUDED.price_updated_at - interval '90 seconds'
                    THEN 'realtime' ELSE EXCLUDED.feed END`;
  }

  async quotes(query: { codes?: string[]; limit: number; offset: number }) {
    const rows = await prisma.krStockQuote.findMany({
      where: query.codes ? { code: { in: query.codes } } : undefined,
      include: { master: { select: { name: true, market: true } } },
      orderBy: [{ marketCap: { sort: "desc", nulls: "last" } }, { code: "asc" }],
      skip: query.offset,
      take: query.limit,
    });
    return rows.map(toStoredQuote);
  }

  async quote(code: string) {
    const row = await prisma.krStockQuote.findUnique({
      where: { code },
      include: { master: { select: { name: true, market: true } } },
    });
    return row ? toStoredQuote(row) : null;
  }

  /** 마스터 4,400행 — 접두 · 부분 일치를 순차 스캔으로 해도 1ms 대(실측은 검증 보고). 코드 일치를 앞에 */
  async search(q: string, limit: number) {
    const rows = await prisma.krStockMaster.findMany({
      where: {
        delistedAt: null,
        OR: [{ code: { startsWith: q.toUpperCase() } }, { name: { contains: q, mode: "insensitive" } }],
      },
      orderBy: [{ marketCap: { sort: "desc", nulls: "last" } }],
      take: limit,
      select: { code: true, name: true, market: true },
    });
    return rows.map((row) => ({ ...row, market: row.market as KrMarket }));
  }

  async latestDailyCandleAt(codes: string[]) {
    const latest = new Map<string, Date>();
    if (codes.length === 0) return latest;
    const rows = await prisma.priceHistory.groupBy({
      by: ["symbol"],
      where: { symbol: { in: codes }, timeframe: "1d", assetType: "kr_stock" },
      _max: { timestamp: true },
    });
    for (const row of rows) if (row._max.timestamp) latest.set(row.symbol, row._max.timestamp);
    return latest;
  }

  async upsertDailyCandles(code: string, candles: Candle[]) {
    if (candles.length === 0) return;
    const col = <T,>(pick: (c: Candle) => T) => candles.map(pick);
    await prisma.$executeRaw`
      INSERT INTO price_history (id, symbol, asset_type, timeframe, open, high, low, close, volume, timestamp)
      SELECT gen_random_uuid()::text, ${code}, 'kr_stock'::"AssetType", '1d', u.open, u.high, u.low, u.close, u.volume,
        u.ts AT TIME ZONE 'UTC'
      FROM unnest(
        ${col((c) => c.open)}::numeric[], ${col((c) => c.high)}::numeric[], ${col((c) => c.low)}::numeric[],
        ${col((c) => c.close)}::numeric[], ${col((c) => c.volume)}::numeric[], ${col((c) => c.timestamp)}::timestamptz[]
      ) AS u(open, high, low, close, volume, ts)
      ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE SET
        open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume`;
  }

  /**
   * 실시간 체결의 최신 값. 행이 없는 종목(폴링 전)은 건너뛴다 — 상하한 · 기준가 같은 필수 칸을 체결이 주지
   * 않아서 새 행을 만들 수 없다. 1초 회차 한 문장
   */
  async applyTicks(ticks: KrTick[], at: Date) {
    if (ticks.length === 0) return;
    const col = <T,>(pick: (t: KrTick) => T) => ticks.map(pick);
    await prisma.$executeRaw`
      UPDATE kr_stock_quotes q SET
        price = u.price, change = u.change, change_rate = u.change_rate, volume = u.volume, trade_value = u.trade_value,
        is_halted = u.is_halted, feed = 'realtime', price_updated_at = (${at}::timestamptz AT TIME ZONE 'UTC')
      FROM unnest(
        ${col((t) => t.code)}::text[], ${col((t) => t.price)}::numeric[], ${col((t) => t.change)}::numeric[],
        ${col((t) => t.changeRate)}::numeric[], ${col((t) => t.accVolume)}::bigint[], ${col((t) => t.accTradeValue)}::numeric[],
        ${col((t) => t.isHalted)}::boolean[]
      ) AS u(code, price, change, change_rate, volume, trade_value, is_halted)
      WHERE q.code = u.code`;
  }

  async upsertMinuteCandles(bars: Array<{ code: string; candle: Candle }>) {
    if (bars.length === 0) return;
    const col = <T,>(pick: (b: { code: string; candle: Candle }) => T) => bars.map(pick);
    await prisma.$executeRaw`
      INSERT INTO price_history (id, symbol, asset_type, timeframe, open, high, low, close, volume, timestamp)
      SELECT gen_random_uuid()::text, u.code, 'kr_stock'::"AssetType", '5m', u.open, u.high, u.low, u.close, u.volume,
        u.ts AT TIME ZONE 'UTC'
      FROM unnest(
        ${col((b) => b.code)}::text[], ${col((b) => b.candle.open)}::numeric[], ${col((b) => b.candle.high)}::numeric[],
        ${col((b) => b.candle.low)}::numeric[], ${col((b) => b.candle.close)}::numeric[],
        ${col((b) => b.candle.volume)}::numeric[], ${col((b) => b.candle.timestamp)}::timestamptz[]
      ) AS u(code, open, high, low, close, volume, ts)
      -- 병합: 프로세스가 버킷 중간에 재시작하면 메모리 봉은 그 뒤 체결만 갖는다. 덮어쓰면 앞부분이 사라지므로
      -- 시가는 먼저 쓴 값, 고 · 저는 넓은 쪽, 거래량은 큰 쪽(같은 프로세스 안에서는 늘기만 한다)
      ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE SET
        high = GREATEST(price_history.high, EXCLUDED.high), low = LEAST(price_history.low, EXCLUDED.low),
        close = EXCLUDED.close, volume = GREATEST(price_history.volume, EXCLUDED.volume)`;
  }

  async realtimeFreshCodes(since: Date) {
    const rows = await prisma.krStockQuote.findMany({
      where: { feed: "realtime", priceUpdatedAt: { gte: since } },
      select: { code: true },
    });
    return rows.map((row) => row.code);
  }

  async minuteBarCoverage(codes: string[], from: string) {
    const coverage = new Map<string, Map<string, { count: number; hasClose: boolean }>>();
    if (codes.length === 0) return coverage;
    const rows = await prisma.$queryRaw<Array<{ symbol: string; d: Date; n: number; has_close: boolean }>>`
      SELECT symbol, k::date AS d, count(*)::int AS n, bool_or(k::time = '15:25') AS has_close
      FROM (
        SELECT symbol, (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul') AS k
        FROM price_history
        WHERE asset_type = 'kr_stock' AND timeframe = '5m' AND symbol = ANY(${codes}::text[])
          AND timestamp >= (${from}::date - interval '1 day')
      ) x
      GROUP BY symbol, k::date`;
    for (const row of rows) {
      const byDate = coverage.get(row.symbol) ?? new Map();
      byDate.set(row.d.toISOString().slice(0, 10), { count: row.n, hasClose: row.has_close });
      coverage.set(row.symbol, byDate);
    }
    return coverage;
  }

  async replaceMinuteCandles(code: string, candles: Candle[]) {
    if (candles.length === 0) return;
    const col = <T,>(pick: (c: Candle) => T) => candles.map(pick);
    await prisma.$executeRaw`
      INSERT INTO price_history (id, symbol, asset_type, timeframe, open, high, low, close, volume, timestamp)
      SELECT gen_random_uuid()::text, ${code}, 'kr_stock'::"AssetType", '5m', u.open, u.high, u.low, u.close, u.volume,
        u.ts AT TIME ZONE 'UTC'
      FROM unnest(
        ${col((c) => c.open)}::numeric[], ${col((c) => c.high)}::numeric[], ${col((c) => c.low)}::numeric[],
        ${col((c) => c.close)}::numeric[], ${col((c) => c.volume)}::numeric[], ${col((c) => c.timestamp)}::timestamptz[]
      ) AS u(open, high, low, close, volume, ts)
      ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE SET
        open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume`;
  }

  /** 최신 n 개를 시간 오름차순으로 — `(symbol, timeframe, timestamp)` 인덱스 역순 스캔 */
  async candles(code: string, timeframe: "1d" | "5m", count: number) {
    const rows = await prisma.priceHistory.findMany({
      where: { symbol: code, timeframe, assetType: "kr_stock" },
      orderBy: { timestamp: "desc" },
      take: count,
      select: { open: true, high: true, low: true, close: true, volume: true, timestamp: true },
    });
    return rows.reverse().map((row) => ({
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: toNum(row.volume),
      timestamp: row.timestamp,
    }));
  }
}

type QuoteRow = Prisma.KrStockQuoteGetPayload<{ include: { master: { select: { name: true; market: true } } } }>;

const toStoredQuote = (row: QuoteRow): StoredKrStockQuote => ({
  code: row.code,
  name: row.master.name,
  market: row.master.market as KrMarket,
  price: Number(row.price),
  change: Number(row.change),
  changeRate: Number(row.changeRate),
  volume: row.volume,
  tradeValue: Number(row.tradeValue),
  marketCap: toNum(row.marketCap),
  basePrice: toNum(row.basePrice),
  upperLimit: toNum(row.upperLimit),
  lowerLimit: toNum(row.lowerLimit),
  statusCode: row.statusCode,
  warnCode: row.warnCode,
  isHalted: row.isHalted,
  per: toNum(row.per),
  pbr: toNum(row.pbr),
  eps: toNum(row.eps),
  bps: toNum(row.bps),
  week52High: toNum(row.week52High),
  week52Low: toNum(row.week52Low),
  foreignRate: toNum(row.foreignRate),
  feed: row.feed as KrQuoteFeed,
  priceUpdatedAt: row.priceUpdatedAt,
});

export class PrismaKrMarketCalendarStore implements KrMarketCalendarStore {
  async upsertDays(days: KrMarketDay[], at: Date, source: KrCalendarSource) {
    if (days.length === 0) return;
    const col = <T,>(pick: (d: KrMarketDay) => T) => days.map(pick);
    await prisma.$executeRaw`
      INSERT INTO market_holidays (market, date, is_open, is_trading_day, is_business_day, is_settlement_day, source, synced_at)
      SELECT 'KRX', u.*, ${source}, (${at}::timestamptz AT TIME ZONE 'UTC') FROM unnest(
        ${col((d) => d.date)}::date[], ${col((d) => d.isOpen)}::boolean[], ${col((d) => d.isTradingDay)}::boolean[],
        ${col((d) => d.isBusinessDay)}::boolean[], ${col((d) => d.isSettlementDay)}::boolean[]
      ) AS u
      ON CONFLICT (market, date) DO UPDATE SET
        is_open = EXCLUDED.is_open, is_trading_day = EXCLUDED.is_trading_day, is_business_day = EXCLUDED.is_business_day,
        is_settlement_day = EXCLUDED.is_settlement_day, source = EXCLUDED.source, synced_at = EXCLUDED.synced_at
      -- KIS 원문이 이미 있으면 역산 · 관측으로 덮지 않는다
      WHERE market_holidays.source = 'kis' AND EXCLUDED.source = 'kis' OR market_holidays.source <> 'kis'`;
  }

  /**
   * 평일 날짜를 펴고 그날 국내 주식 일봉 존재로 개장을 정한다. 봉 시각 = 거래일 00:00 KST 라 KST 날짜로
   * 바꿔 비교한다. 일봉 인덱스 `(symbol, timeframe, timestamp)` 를 쓰지 않는 집계지만 2년 × 50종목
   * (≈ 2.5만 행)이고 하루 한 번 도는 작업이다
   */
  async daysFromDailyCandles(from: string, to: string) {
    const rows = await prisma.$queryRaw<Array<{ date: Date; is_open: boolean }>>`
      WITH bars AS (
        SELECT DISTINCT (timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date AS d
        FROM price_history
        WHERE asset_type = 'kr_stock' AND timeframe = '1d'
          AND timestamp >= (${from}::date - interval '1 day') AND timestamp <= (${to}::date + interval '1 day')
      )
      SELECT g::date AS date, EXISTS (SELECT 1 FROM bars WHERE bars.d = g::date) AS is_open
      FROM generate_series(${from}::date, LEAST(${to}::date, (SELECT max(d) FROM bars)), interval '1 day') AS g
      WHERE extract(isodow FROM g) < 6`;
    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      isOpen: row.is_open,
      isTradingDay: row.is_open,
      isBusinessDay: row.is_open,
      isSettlementDay: row.is_open,
    }));
  }

  async days(from: string, to: string) {
    const rows = await prisma.marketHoliday.findMany({
      where: { market: "KRX", date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) } },
      orderBy: { date: "asc" },
    });
    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      isOpen: row.isOpen,
      isTradingDay: row.isTradingDay,
      isBusinessDay: row.isBusinessDay,
      isSettlementDay: row.isSettlementDay,
    }));
  }
}
