import { logger } from "../../shared/config/logger";
import {
  createHttpClient,
  createRatePacer,
  isRetryableHttpError,
  withRetry,
} from "../../shared/infrastructure";
import type {
  Candle,
  DailyCandleView,
  ExchangeQuotePort,
  MarketListing,
  MinuteCandleView,
  OrderbookPressure,
  PriceTimeframe,
  Quote,
  Trade,
} from "../domain";

const UPBIT_API_URL = "https://api.upbit.com/v1";

const marketOf = (symbol: string) => `KRW-${symbol.toUpperCase()}`;

/**
 * 거래소 호출은 **타임아웃과 재시도 상한**을 갖는다 (`ddd-infrastructure.md` §6).
 *
 * 원문은 `axios.get` 을 직접 불렀다 — 타임아웃이 없어 거래소가 느려지면 요청이
 * 무한정 매달리고, 재시도가 없어 **부팅 직후 레이트리밋 한 번이 그 회차의 수집을
 * 통째로 날렸다**(`SRV-REQ-006` 체크리스트 §9-8 에 기록된 실제 증상이다).
 *
 * 재시도는 429·5xx·응답 없음(타임아웃)에만 건다. 4xx 는 몇 번을 걸어도 같은 답이다.
 * **전부 조회 전용 GET 이라** 두 번 도착해도 안전하다 — 이 클라이언트에는 주문·출금이 없다.
 */
const http = createHttpClient({ baseURL: UPBIT_API_URL, timeoutMs: 10_000 });

/**
 * 거래소 시세 API 는 **그룹별 초당 10건**을 IP 단위로 센다(캔들 그룹 · 그 외 조회).
 * 그 한도를 보내기 전에 지킨다 — 재시도는 이미 맞은 429 를 줍는 것이지 막는 것이 아니다.
 *
 * 한도보다 2건 낮게 잡았다. 같은 IP 에서 개발 중 다른 프로세스(스크립트·두 번째 서버)가
 * 거래소를 부르면 그 몫까지 이 프로세스가 알 수 없다.
 *
 * > **이 페이서가 없을 때** 캔들 수집은 심볼 10개를 동시에 던졌고(`CollectPriceHistory`)
 * > 기동 직후 1분 동안 429 가 985건 쌓였다. 수집 쪽 동시성을 줄이는 대신 여기서 막는
 * > 이유: 거래소를 부르는 유스케이스가 넷이고, 한도는 **프로세스 전체**의 것이다.
 */
const UPBIT_REQUESTS_PER_SECOND = 8;
const pacers = {
  candle: createRatePacer({ perSecond: UPBIT_REQUESTS_PER_SECOND }),
  default: createRatePacer({ perSecond: UPBIT_REQUESTS_PER_SECOND }),
};
const pacerFor = (path: string) =>
  path.startsWith("/candles/") ? pacers.candle : pacers.default;

const get = <T = any>(path: string, params?: Record<string, unknown>): Promise<T> =>
  withRetry(
    // 재시도도 거래소에는 한 건이다 — 그래서 페이서가 재시도 **안쪽**에 있다
    () =>
      pacerFor(path).run(async () => {
        const response = await http.get(path, { params });
        return response.data as T;
      }),
    {
      isRetryable: isRetryableHttpError,
      onRetry: (error, attempt, waitMs) =>
        logger.warn(
          `Upbit 재시도 ${attempt}회 — ${path} (${waitMs}ms 후): ${(error as Error).message}`
        ),
    }
  );

/** 분봉 단위 매핑. `ExchangeQuotePort` 의 타임프레임을 거래소 단위로 옮긴다. */
const MINUTE_UNIT: Record<Exclude<PriceTimeframe, "1d">, number> = {
  "5m": 5,
  "15m": 15,
  "1h": 60,
};

/**
 * Upbit 조회 클라이언트 — `ExchangeQuotePort` 구현.
 *
 * ## 거래소 필드 이름이 여기서 끝난다
 *
 * `trade_price` · `signed_change_rate` · `acc_trade_price_24h` 같은 이름은 이 파일 밖으로
 * 나가지 않는다. 원문에서는 `market-intelligence.service` 가 axios 를 직접 불러 같은 번역을
 * 한 벌 더 갖고 있었고, 그래서 **`volume24h` 가 한쪽은 체결 수량, 한쪽은 체결 대금**이었다.
 * 번역이 한 곳이면 그 어긋남이 성립하지 않는다.
 *
 * **조회 메서드만 있다.** 주문·출금 엔드포인트를 부르는 코드를 만들지 않는다
 * (`ddd-infrastructure.md` §6 · 전 영역 공통 수용 기준).
 *
 * > 이관하면서 **사용처가 0건인 메서드 넷을 옮기지 않았다** — `getAllMarkets`,
 * > `getBatchCandles`, `getCachedDailyCandles`, 그 캐시. 죽은 코드를 옮기면 다음 사람이
 * > 그것도 계약이라고 읽는다.
 */
export class UpbitClient implements ExchangeQuotePort {
  async currentPrice(symbol: string): Promise<Quote> {
    const tickers = await this.tickers([symbol], "Upbit API error:");

    if (tickers.length === 0) {
      // 원문은 "Symbol not found" 를 던지고 **자기 catch 에서 다시 감쌌다.**
      // 밖에서 보이는 메시지는 아래 하나였고, 그것을 유지한다.
      logger.error("Upbit API error:", "Symbol not found");
      throw new Error("Failed to fetch price from Upbit");
    }

    return this.toQuote(tickers[0], symbol);
  }

  async currentPrices(symbols: string[]): Promise<Quote[]> {
    const tickers = await this.tickers(symbols, "Upbit ticker API error:");
    return tickers.map((ticker: any) => this.toQuote(ticker));
  }

  async dailyCandles(
    symbol: string,
    count: number
  ): Promise<DailyCandleView[]> {
    const candles = await this.rawDailyCandles(symbol, count);
    return candles.map((candle: any) => ({
      date: candle.candle_date_time_kst,
      open: candle.opening_price,
      high: candle.high_price,
      low: candle.low_price,
      close: candle.trade_price,
      volume: candle.candle_acc_trade_volume,
    }));
  }

  async minuteCandles(
    symbol: string,
    unit: number,
    count: number
  ): Promise<MinuteCandleView[]> {
    const candles = await this.rawMinuteCandles(symbol, unit, count);
    return candles.map((candle: any) => ({
      timestamp: candle.candle_date_time_kst,
      open: candle.opening_price,
      high: candle.high_price,
      low: candle.low_price,
      close: candle.trade_price,
      volume: candle.candle_acc_trade_volume,
    }));
  }

  async dailyTradeValues(symbol: string, count: number): Promise<number[]> {
    const candles = await this.rawDailyCandles(symbol, count);
    return candles.map((candle: any) => candle.candle_acc_trade_price);
  }

  /**
   * 저장용 캔들.
   *
   * 거래소는 일봉에 `candle_date_time_kst`(KST 문자열)를, 분봉에 같은 필드를 준다.
   * **`+09:00` 을 붙여 파싱하는 규칙이 여기 한 곳**이다 — 원문에서는 워커가 들고 있었고
   * `timestamp ?? date` 로 두 모양을 런타임에 구분했다.
   */
  async candlesByTimeframe(
    symbol: string,
    timeframe: PriceTimeframe,
    count: number
  ): Promise<Candle[]> {
    const raw =
      timeframe === "1d"
        ? await this.rawDailyCandles(symbol, count)
        : await this.rawMinuteCandles(symbol, MINUTE_UNIT[timeframe], count);

    return raw
      .map((candle: any): Candle | null => {
        const kst = candle.candle_date_time_kst;
        if (!kst) return null;
        return {
          open: candle.opening_price,
          high: candle.high_price,
          low: candle.low_price,
          close: candle.trade_price,
          volume: candle.candle_acc_trade_volume ?? null,
          timestamp: new Date(`${kst}+09:00`),
        };
      })
      .filter((candle: Candle | null): candle is Candle => candle !== null);
  }

  async krwMarkets(): Promise<MarketListing[]> {
    try {
      const markets = await get<any[]>("/market/all");
      return markets
        .filter((m: any) => m.market.startsWith("KRW-"))
        .map((m: any) => ({
          market: m.market,
          symbol: m.market.replace("KRW-", ""),
          koreanName: m.korean_name,
          englishName: m.english_name,
        }));
    } catch (error: any) {
      logger.error("Upbit markets API error:", error.message);
      throw new Error("Failed to fetch markets from Upbit");
    }
  }

  async recentTrades(symbol: string, count: number): Promise<Trade[]> {
    const trades = await get<any[]>("/trades/ticks", {
      market: marketOf(symbol),
      count,
    });

    return trades.map((trade: any) => ({
      side: trade.ask_bid === "bid" ? "buy" : "sell",
      price: trade.trade_price,
      volume: trade.trade_volume,
    }));
  }

  async orderbookPressure(symbol: string): Promise<OrderbookPressure> {
    const orderbooks = await get<any[]>("/orderbook", {
      markets: marketOf(symbol),
    });

    const units = orderbooks[0].orderbook_units;

    return {
      bids: units.reduce((sum: number, u: any) => sum + u.bid_size, 0),
      asks: units.reduce((sum: number, u: any) => sum + u.ask_size, 0),
    };
  }

  private async tickers(symbols: string[], logPrefix: string) {
    try {
      return (await get("/ticker", {
        markets: symbols.map(marketOf).join(","),
      })) ?? [];
    } catch (error: any) {
      logger.error(logPrefix, error.message);
      throw new Error("Failed to fetch price from Upbit");
    }
  }

  /**
   * `symbol` 을 주면 그 값을 그대로 돌려준다.
   *
   * 단건 조회(`currentPrice`)의 원문 응답이 **요청에 쓴 심볼 문자열 그대로**였고
   * (대문자 정규화를 하지 않았다) 목록 조회는 `market` 에서 잘라 썼다. 두 응답이
   * 달랐던 것을 그대로 유지한다 — 정규화는 계약 변경이다.
   */
  private toQuote(ticker: any, symbol?: string): Quote {
    return {
      symbol: symbol ?? ticker.market.replace("KRW-", ""),
      market: ticker.market,
      currentPrice: ticker.trade_price,
      change24h: ticker.signed_change_rate * 100,
      high24h: ticker.high_price,
      low24h: ticker.low_price,
      volume24h: ticker.acc_trade_volume_24h,
      tradeValue24h: ticker.acc_trade_price_24h,
      timestamp: new Date(ticker.timestamp),
    };
  }

  private async rawDailyCandles(symbol: string, count: number) {
    try {
      return await get("/candles/days", { market: marketOf(symbol), count });
    } catch (error: any) {
      logger.error("Upbit candles API error:", error.message);
      throw new Error("Failed to fetch chart data from Upbit");
    }
  }

  private async rawMinuteCandles(
    symbol: string,
    unit: number,
    count: number
  ) {
    try {
      return await get(`/candles/minutes/${unit}`, {
        market: marketOf(symbol),
        count,
      });
    } catch (error: any) {
      logger.error("Upbit minute candles API error:", error.message);
      throw new Error("Failed to fetch minute chart data from Upbit");
    }
  }
}
