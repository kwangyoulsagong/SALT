import { logger } from "../../shared/config/logger";
import {
  logoUrlOf,
  MarketOverviewSort,
  type ExchangeQuotePort,
  type MarketAssetRepository,
  type MarketOverviewQuery,
  type PriceTimeframe,
} from "../domain";

/** 배경 갱신을 건너뛰는 신선도. 원문 상수(10분)다. */
const PRICE_FRESHNESS_MS = 10 * 60 * 1000;

/**
 * 마켓 목록.
 *
 * ## DB 를 먼저 답하고 갱신은 뒤에서 한다
 *
 * 원문의 판단을 유지했다 — 응답은 DB 의 캐시된 가격으로 즉시 나가고, 오래된 심볼만
 * 골라 거래소에서 다시 받아 저장한다. 그 갱신을 **기다리지 않는다.**
 *
 * > 배경 작업이 실패해도 응답은 이미 나갔다. 그래서 실패를 던지지 않고 로그만 남긴다 —
 * > 원문과 같되, 삼키지 않고 남기는 것이 다르다.
 */
export class GetMarketOverview {
  constructor(
    private readonly assets: MarketAssetRepository,
    private readonly exchange: ExchangeQuotePort
  ) {}

  async execute(query: Partial<MarketOverviewQuery> = {}) {
    const resolved: MarketOverviewQuery = {
      page: query.page && query.page > 0 ? query.page : 1,
      limit: query.limit && query.limit > 0 ? query.limit : 100,
      sort: query.sort || MarketOverviewSort.TradeValue,
      order: query.order || "desc",
      search: (query.search || "").trim().toLowerCase() || undefined,
    };

    const { items, total } = await this.assets.findPage(resolved);

    void this.refreshStalePrices(items.map((item) => item.symbol));

    return {
      items,
      pagination: {
        page: resolved.page,
        limit: resolved.limit,
        total,
        totalPages: Math.ceil(total / resolved.limit),
      },
    };
  }

  private async refreshStalePrices(symbols: string[]) {
    try {
      const stale = await this.assets.symbolsWithStalePrice(
        symbols,
        new Date(Date.now() - PRICE_FRESHNESS_MS)
      );
      if (stale.length === 0) return;

      const quotes = await this.exchange.currentPrices(stale);
      await this.assets.applyQuotes(quotes);
      logger.debug(`Updated prices for ${quotes.length} symbols`);
    } catch (error: any) {
      logger.warn("Background price update failed:", error?.message);
    }
  }
}

export class GetRealTimePrice {
  constructor(private readonly exchange: ExchangeQuotePort) {}

  async execute(symbol: string) {
    const quote = await this.exchange.currentPrice(symbol);
    return { ...quote, logoUrl: logoUrlOf(symbol.toUpperCase()) };
  }
}

export interface ChartQuery {
  symbol: string;
  period: "day" | "minute";
  count: number;
  unit: number;
}

export class GetChartData {
  constructor(private readonly exchange: ExchangeQuotePort) {}

  execute(query: ChartQuery) {
    if (query.period === "day") {
      return this.exchange.dailyCandles(query.symbol, query.count);
    }
    return this.exchange.minuteCandles(query.symbol, query.unit, query.count);
  }
}

/**
 * 활성 마켓 심볼 목록 (BFF 용).
 *
 * 원문은 DB 에러를 삼키고 빈 배열을 돌려줬다("BFF 는 죽지 않아야 한다"). 그 계약을
 * 유지하되 **왜 비었는지 로그로 남긴다** — 빈 배열과 장애가 구분되지 않으면 BFF 쪽에서
 * "구독할 심볼이 없다"로만 보인다.
 */
export class ListMarketSymbols {
  constructor(private readonly assets: MarketAssetRepository) {}

  async execute(): Promise<string[]> {
    try {
      return await this.assets.activeSymbols();
    } catch (error: any) {
      logger.error("활성 마켓 심볼 조회 실패 — 빈 배열로 답한다", error?.message);
      return [];
    }
  }
}

/** `ExchangeQuotePort` 의 타임프레임을 밖으로 다시 쓰지 않게 재노출한다. */
export type { PriceTimeframe };
