import { logger } from "../../shared/config/logger";
import {
  ChartPeriod,
  cryptoMoveKey,
  logoUrlOf,
  MarketOverviewPeriod,
  MarketOverviewSort,
  periodBaseline,
  periodChange,
  rankByPeriodChange,
  type ExchangeQuotePort,
  type MarketAssetRepository,
  type MarketAssetView,
  type MarketOverviewItem,
  type MarketOverviewQuery,
  type PriceHistoryRepository,
  type PriceTimeframe,
} from "../domain";
import { cryptoMoveEvents, freshCryptoWarning, moveCardFlags, type MoveDependencies } from "./moveCard";

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
    private readonly exchange: ExchangeQuotePort,
    private readonly prices: PriceHistoryRepository,
    private readonly now: () => Date = () => new Date(),
    /** 행 카드 표시(F016 단계 C · FE-REQ-063 FR-6) — 없으면 표시 없음 */
    private readonly move: MoveDependencies | null = null
  ) {}

  /**
   * ## 기간 변동률로 정렬할 때만 전부 읽는다
   *
   * 기간 변동률은 컬럼이 아니라 캔들에서 계산하는 값이라 DB 가 정렬할 수 없다. 그 경우만
   * 활성 종목 전부(300개 안쪽)를 읽어 도메인이 정렬하고 여기서 자른다. 나머지 정렬은
   * 원래대로 DB 가 페이징하고, 기간 값은 **그 페이지의 종목만** 계산한다.
   */
  async execute(query: Partial<MarketOverviewQuery> = {}) {
    const resolved: MarketOverviewQuery = {
      page: query.page && query.page > 0 ? query.page : 1,
      limit: query.limit && query.limit > 0 ? query.limit : 100,
      sort: query.sort || MarketOverviewSort.TradeValue,
      order: query.order || "desc",
      search: (query.search || "").trim().toLowerCase() || undefined,
      period: query.period || MarketOverviewPeriod.Realtime,
    };

    const rankedByPeriod =
      resolved.sort === MarketOverviewSort.Change &&
      resolved.period !== MarketOverviewPeriod.Realtime;

    let items: MarketOverviewItem[];
    let total: number;

    if (rankedByPeriod) {
      const all = await this.withPeriodChange(
        await this.assets.findAllActive(resolved),
        resolved.period
      );
      const offset = (resolved.page - 1) * resolved.limit;
      items = rankByPeriodChange(all, resolved.order).slice(
        offset,
        offset + resolved.limit
      );
      total = all.length;
    } else {
      const page = await this.assets.findPage(resolved);
      items = await this.withPeriodChange(page.items, resolved.period);
      total = page.total;
    }

    void this.refreshStalePrices(items.map((item) => item.symbol));

    return {
      items: await this.withMoveCard(items),
      pagination: {
        page: resolved.page,
        limit: resolved.limit,
        total,
        totalPages: Math.ceil(total / resolved.limit),
      },
    };
  }

  /**
   * 행 카드 표시 — 상세 카드와 같은 판정(오늘 등락 · 평소 변동 σ · 거래소 유의/주의). 기간 정렬과 무관하게 **오늘(전일 대비)** 값으로 본다.
   * β 뷰 · 경보 뷰 한 번씩 읽기. 실패하면 표시 없음(표는 그대로 나간다)
   */
  private async withMoveCard(items: MarketOverviewItem[]): Promise<Array<MarketOverviewItem & { moveCard: boolean }>> {
    if (!this.move || items.length === 0) return items.map((item) => ({ ...item, moveCard: false }));
    const key = (s: string) => cryptoMoveKey(s);
    const now = this.now();
    const warnings = await this.move.warnings.latest(items.map((i) => key(i.symbol))).catch(() => new Map());
    const flags = await moveCardFlags(
      this.move.betas,
      this.move.policy,
      items.map((i) => {
        return { key: key(i.symbol), changeRate: i.change24h, events: cryptoMoveEvents(freshCryptoWarning(warnings.get(key(i.symbol)), now)) };
      }),
      now
    );
    return items.map((item) => ({ ...item, moveCard: flags.get(key(item.symbol)) ?? false }));
  }

  private async withPeriodChange(
    items: MarketAssetView[],
    period: MarketOverviewPeriod
  ): Promise<MarketOverviewItem[]> {
    const baseline = periodBaseline(period, this.now());
    if (!baseline) {
      return items.map((item) => ({ ...item, periodChange: item.change24h }));
    }

    const closes = await this.prices.baselineCloses(
      items.map((item) => item.symbol),
      baseline
    );
    return items.map((item) => ({
      ...item,
      periodChange: periodChange(item.currentPrice, closes.get(item.symbol)),
    }));
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
  period: ChartPeriod;
  count: number;
  unit: number;
}

export class GetChartData {
  constructor(private readonly exchange: ExchangeQuotePort) {}

  execute(query: ChartQuery) {
    if (query.period === ChartPeriod.Day) {
      return this.exchange.dailyCandles(query.symbol, query.count);
    }
    if (query.period === ChartPeriod.Week) {
      return this.exchange.weeklyCandles(query.symbol, query.count);
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
