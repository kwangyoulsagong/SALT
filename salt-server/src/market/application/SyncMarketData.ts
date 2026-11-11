import { logger } from "../../shared/config/logger";
import {
  CANDLE_PAGE,
  CATCH_UP_CALLS_PER_RUN,
  catchUpOrder,
  catchUpStart,
  FIVE_MINUTE_PAGE_MS,
  needsCatchUp,
  regularWindowAdvance,
  type ExchangeQuotePort,
  type MarketAssetRepository,
  type PriceFillMarkStore,
  type PriceHistoryRepository,
  type PriceTimeframe,
  type WatchlistRepository,
} from "../domain";

/**
 * 상장 목록 동기화.
 *
 * 목록에서 사라진 심볼은 **지우지 않고 `isActive=false` + `delistedAt`** 으로 남긴다.
 * 원장이 그 심볼을 참조하고 있고, 상폐가 과거 거래를 없던 일로 만들지 않는다.
 */
export class SyncMarketListings {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort
  ) {}

  async execute() {
    const listings = await this.exchange.krwMarkets();

    await this.assets.upsertListings(listings);
    await this.assets.markDelistedExcept(listings.map((m) => m.symbol));

    logger.info(`🔁 Market sync completed. (${listings.length} markets)`);
    return { markets: listings.length };
  }
}

/** 거래소 티커 배치 크기. 원문 상수다. */
const PRICE_BATCH = 100;
const PRICE_BATCH_PAUSE_MS = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 전체 마켓 시세 갱신 (워커가 1분마다 부른다).
 *
 * 배치 사이에 쉬는 것은 **거래소 레이트리밋 때문**이고, 그래서 이 유스케이스는 빠르게
 * 끝나지 않는다. 트랜잭션으로 감싸지 않는 이유이기도 하다 (FR-42).
 */
export class UpdateAllMarketPrices {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort
  ) {}

  async execute() {
    const symbols = await this.assets.activeSymbols();

    for (let i = 0; i < symbols.length; i += PRICE_BATCH) {
      const batch = symbols.slice(i, i + PRICE_BATCH);
      const quotes = await this.exchange.currentPrices(batch);
      await this.assets.applyQuotes(quotes);

      if (i + PRICE_BATCH < symbols.length) await sleep(PRICE_BATCH_PAUSE_MS);
    }

    return { updated: symbols.length };
  }
}

/**
 * 수집 대상 타임프레임과 개수. 5분봉은 거래소 상한 200 — 원문 288 은 말없이 200 으로 잘려 16시간 40분만 덮었다
 * (`SRV-REQ-057` FR-2). 그보다 긴 공백은 `CatchUpPriceHistory` 가 채운 위치부터 메운다
 */
const COLLECT_TARGETS: Array<{ timeframe: PriceTimeframe; count: number }> = [
  { timeframe: "5m", count: CANDLE_PAGE },
  { timeframe: "1d", count: 120 },
];

/**
 * 보관 정책. 5분봉 30일 · 일봉 2년 (원문). **국내 주식 일봉은 지우지 않는다** — 전 종목 5년 백필(SRV-REQ-040 FR-40)이
 * 전망 학습 · 채점 창이고(`FC-REQ-020`), 2년에 자르면 밤마다 받은 3년치를 다음 정리가 지운다. 약 2,450종목 × 250봉/년
 */
const RETENTION = [
  { timeframe: "5m", interval: "30 days" },
  { timeframe: "1d", interval: "2 years", exceptAssetType: "kr_stock" as const },
];

/**
 * 동시에 받는 종목 수 — 4(`workers-external.md` "종목 동시 처리는 4 안팎"). 10 일 때 5분마다 300여 종목 캔들 회차가
 * 문장 하나에 7~8초씩 DB 를 잡아 장중 2~3분 동안 판단 상세 · 시세가 16초까지 밀렸다(2026-11-10 실측, `DB-REQ-017`)
 */
const SYMBOL_BATCH = 4;
const SYMBOL_BATCH_PAUSE_MS = 150;
const TIMEFRAME_PAUSE_MS = 50;

/**
 * 캔들 수집.
 *
 * 원문은 `price-history.worker` 안에 있었고 거래소 응답의 `timestamp ?? date` 분기와
 * KST 문자열 파싱까지 워커가 들고 있었다. **그 번역은 `infrastructure` 의 일**이라
 * 어댑터로 내렸고, 여기 남은 것은 배치 크기·쉼·보관 정책이다.
 */
export class CollectPriceHistory {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort,
    private readonly prices: PriceHistoryRepository,
    /** 5분봉 채운 위치(`SRV-REQ-057` FR-2) — 받은 창이 위치에 닿을 때만 앞으로. 없으면 위치를 안 옮긴다 */
    private readonly fillMarks: PriceFillMarkStore | null = null,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const symbols = await this.assets.activeSymbols("crypto");
    const marks = this.fillMarks
      ? await this.fillMarks.marks("crypto", "5m", symbols.map((s) => s.toUpperCase()))
      : new Map<string, Date>();
    const advanced: Array<{ symbol: string; filledThrough: Date }> = [];

    for (let i = 0; i < symbols.length; i += SYMBOL_BATCH) {
      const batch = symbols.slice(i, i + SYMBOL_BATCH);
      await Promise.all(batch.map((symbol) => this.collectSymbol(symbol, marks, advanced)));
      await sleep(SYMBOL_BATCH_PAUSE_MS);
    }

    // 회차 끝에 한 문장(행마다 흩지 않는다 — `noParallelRowWrites`)
    if (this.fillMarks) await this.fillMarks.advance("crypto", "5m", advanced, this.now());
    await this.prices.purgeOlderThan(RETENTION);
    return { symbols: symbols.length, marksAdvanced: advanced.length };
  }

  /**
   * 한 심볼이 실패해도 회차가 멈추지 않는다.
   *
   * > **원문은 멈췄다.** `collectSymbol` 에 try/catch 가 없어 심볼 하나의 일시적 실패가
   * > `Promise.all` 을 통해 `run()` 의 catch 까지 올라갔고, 그 뒤의 **보관 정책 삭제
   * > (`purgeOlderThan`)가 건너뛰어졌다.** 부팅 직후 네 작업이 동시에 거래소를 때리기
   * > 때문에 이 실패는 드물지 않다 — 실제로 이 이관을 검증하는 기동에서도 났다.
   * > 그래서 5분봉 30일·일봉 2년 보관 정책이 실제로 돈 적이 있는지 알 수 없다.
   * >
   * > `workers-external.md` — "실패한 batch 는 로그를 남기고 다음 batch 또는 다음 주기
   * > 실행이 가능해야 한다".
   */
  private async collectSymbol(
    symbol: string,
    marks: Map<string, Date>,
    advanced: Array<{ symbol: string; filledThrough: Date }>
  ) {
    const upper = symbol.toUpperCase();
    for (const target of COLLECT_TARGETS) {
      try {
        const askedAt = this.now();
        const candles = await this.exchange.candlesByTimeframe(
          symbol,
          target.timeframe,
          target.count
        );
        await this.prices.upsertCandles(upper, "crypto", target.timeframe, candles);
        if (target.timeframe === "5m") {
          const next = regularWindowAdvance(marks.get(upper), candles.map((c) => c.timestamp), askedAt);
          if (next) advanced.push({ symbol: upper, filledThrough: next });
        }
      } catch (error) {
        logger.warn(`캔들 수집 실패 — ${symbol} ${target.timeframe}`, error);
      }
      await sleep(TIMEFRAME_PAUSE_MS);
    }
  }
}

/**
 * 코인 5분봉 따라잡기(`SRV-REQ-057` FR-2) — 정기 수집 창(16시간 40분) 밖으로 밀린 종목을 채운 위치부터 **앞으로** 200칸씩.
 *
 * 쪽마다 위치를 옮긴다 — 회차 상한(600호출 ≈ 75초)에 잘려도 다음 회차가 그 자리부터 잇는다(멱등 · 같은 봉 재쓰기 0 —
 * 저장은 값이 같으면 쓰지 않는 upsert). 순서 보유 · 관심 → 거래대금 상위 → 나머지. 순차다 — 거래소 한도는 페이서가 지키고
 * 정기 수집 · 화면 요청이 같은 한도를 쓴다.
 *
 * 처음 도는 종목(위치 없음)은 보관 창 30일 시작부터 — 그동안 남은 구멍(11-07 · 11-08 BTC 4~5시간)까지 한 번 메운다.
 * 하룻밤(16시간 40분 이내)은 0호출 — 정기 수집이 위치를 옮긴다
 */
export class CatchUpPriceHistory {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort,
    private readonly prices: PriceHistoryRepository,
    private readonly fillMarks: PriceFillMarkStore,
    private readonly watchlist: WatchlistRepository,
    /** 코인 보유 종목 — `portfolio` 의 사실이라 조립 지점이 넣는다. 못 읽으면 관심 · 거래대금 순서만 */
    private readonly heldSymbols: () => Promise<string[]>,
    private readonly now: () => Date = () => new Date(),
    private readonly callsPerRun: number = CATCH_UP_CALLS_PER_RUN
  ) {}

  async execute() {
    const active = (await this.assets.activeSymbols("crypto")).map((s) => s.toUpperCase());
    const activeSet = new Set(active);
    const [held, watched, top, marks] = await Promise.all([
      this.heldSymbols().catch((error) => {
        logger.warn("5분봉 따라잡기 — 보유 종목을 못 읽었다(순서만 바뀐다)", error);
        return [] as string[];
      }),
      this.watchlist.distinctSymbols("crypto"),
      this.assets.topByTradeValue("crypto", active.length),
      this.fillMarks.marks("crypto", "5m", active),
    ]);
    const now = this.now();
    const order = catchUpOrder(held, watched, top, active).filter(
      (symbol) => activeSet.has(symbol) && needsCatchUp(marks.get(symbol), now)
    );

    let calls = 0;
    let candles = 0;
    let done = 0;
    let failed = 0;
    for (const symbol of order) {
      if (calls >= this.callsPerRun) break;
      let cursor = catchUpStart(marks.get(symbol), now);
      try {
        while (calls < this.callsPerRun && cursor.getTime() < now.getTime()) {
          const to = new Date(Math.min(cursor.getTime() + FIVE_MINUTE_PAGE_MS, now.getTime()));
          const page = await this.exchange.candlesByTimeframe(symbol, "5m", CANDLE_PAGE, to);
          calls++;
          // 거래 없는 구간은 봉이 없다 — 물어본 것으로 끝(위치는 옮긴다)
          await this.prices.upsertCandles(symbol, "crypto", "5m", page);
          candles += page.length;
          // 위치 = 물은 구간의 끝(`to`). 마지막 쪽의 진행 중 봉은 정기 수집이 다음 회차에 다시 받는다(창 안)
          await this.fillMarks.advance("crypto", "5m", [{ symbol, filledThrough: to }], now);
          cursor = to;
        }
        if (cursor.getTime() >= now.getTime()) done++;
      } catch (error) {
        failed++;
        logger.warn(`5분봉 따라잡기 실패 — ${symbol}`, error);
      }
    }

    const pending = order.length - done;
    if (order.length > 0) {
      logger.info(
        `🧩 5분봉 따라잡기: 대상 ${order.length} · 끝 ${done} · 남음 ${pending} · 호출 ${calls} · 봉 ${candles} · 실패 ${failed}`
      );
    }
    return { targets: order.length, done, pending, calls, candles, failed };
  }
}

/** 백필 목표. 1년 기간의 기준(365일 + 허용 3일)을 덮고 조금 더 받는다. */
const BACKFILL_DAYS = 400;
/** 거래소가 한 번에 주는 최대 개수다. */
const BACKFILL_PAGE = 200;
/** 심볼당 최대 요청 수. 400일이면 두 번이면 되고, 무한 루프를 막는 상한이다. */
const BACKFILL_MAX_PAGES = 3;

/**
 * 일봉 백필 — **정기 수집이 채우지 못하는 과거**를 한 번 받는다.
 *
 * 정기 수집(`CollectPriceHistory`)은 5분마다 최근 120일만 다시 받는다. 쌓이는 방향은
 * 앞쪽뿐이라 로컬 DB 에 수집이 시작된 날(2026-01-25) 이전이 없고, 마켓 목록의 6개월
 * 기간은 293종목 중 26종목, 1년은 0종목만 계산됐다(2026-09-21 실측).
 *
 * 워커에 넣지 않는 이유: 한 번 채우면 정기 수집이 앞쪽을 잇고 보관 정책(2년)이 뒤를
 * 자른다. 매 주기 400일을 다시 받는 것은 거래소 호출만 늘린다. `npm run candles:backfill`.
 *
 * 멱등이다 — 가장 오래된 캔들 **이전**만 받고, 저장은 유니크 키 위의 upsert 다.
 */
export class BackfillDailyHistory {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort,
    private readonly prices: PriceHistoryRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute() {
    const target = new Date(this.now().getTime() - BACKFILL_DAYS * 86_400_000);
    const [symbols, earliest] = await Promise.all([
      this.assets.activeSymbols("crypto"),
      this.prices.earliestCandleStarts("1d"),
    ]);

    let requests = 0;
    let candles = 0;
    let failed = 0;

    // 순차다. 거래소 호출 간격은 페이서가 지키고, 병렬로 던지면 대기열만 길어진다.
    for (const symbol of symbols) {
      let cursor = earliest.get(symbol.toUpperCase());
      // 정기 수집이 아직 한 번도 못 받은 심볼이다. 최근부터는 그쪽 몫이다.
      if (!cursor) continue;

      try {
        for (let page = 0; page < BACKFILL_MAX_PAGES && cursor > target; page++) {
          const batch = await this.exchange.candlesByTimeframe(
            symbol,
            "1d",
            BACKFILL_PAGE,
            cursor
          );
          requests++;
          if (batch.length === 0) break;

          await this.prices.upsertCandles(symbol.toUpperCase(), "crypto", "1d", batch);
          candles += batch.length;
          cursor = new Date(Math.min(...batch.map((c) => c.timestamp.getTime())));
          // 덜 왔으면 상장일에 닿았다.
          if (batch.length < BACKFILL_PAGE) break;
        }
      } catch (error) {
        failed++;
        logger.warn(`일봉 백필 실패 — ${symbol}`, error);
      }
    }

    logger.info(
      `🗂️ 일봉 백필: 심볼 ${symbols.length} · 요청 ${requests} · 캔들 ${candles} · 실패 ${failed}`
    );
    return { symbols: symbols.length, requests, candles, failed };
  }
}
