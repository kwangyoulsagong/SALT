import {
  buildPerformanceSeries,
  rangeStart,
  rankByProfitRate,
  revalue,
  summarizeHoldings,
  type HoldingRepository,
  type PriceHistorySource,
  type TransactionFilter,
  type TransactionRepository,
} from "../domain";

export class ListTransactions {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(
    userId: string,
    query: Partial<Omit<TransactionFilter, "userId">> = {}
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;

    const { transactions, total } = await this.transactions.findPage({
      ...query,
      userId,
      page,
      limit,
    });

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

/** 보유 목록 + 요약. 합산 정의는 `domain/HoldingSummary` 하나다. */
export class GetHoldings {
  constructor(private readonly holdings: HoldingRepository) {}

  async execute(userId: string, symbol?: string) {
    const holdings = await this.holdings.findByUser(
      userId,
      symbol?.toUpperCase()
    );
    const totals = summarizeHoldings(holdings);

    return {
      holdings,
      summary: {
        totalValue: totals.totalValue,
        totalInvested: totals.totalInvested,
        totalProfit: totals.totalProfit,
        totalProfitRate: totals.totalProfitRate,
      },
    };
  }
}

export class GetPortfolioStats {
  constructor(
    private readonly holdings: HoldingRepository,
    private readonly transactions: TransactionRepository
  ) {}

  async execute(userId: string) {
    /**
     * 원문은 보유와 **거래 전체를 `findMany` 로 읽어 `length` 만 썼다** — 거래가
     * 5,000건이면 5,000행을 옮겨 와서 세는 것이다. `count` 로 바꿨다 (FR-43).
     */
    const [holdings, totalTransactions] = await Promise.all([
      this.holdings.findByUser(userId),
      this.transactions.countByUser(userId),
    ]);

    const totals = summarizeHoldings(holdings);
    const { best, worst } = rankByProfitRate(holdings);

    return {
      totalInvested: totals.totalInvested,
      currentValue: totals.totalValue,
      unrealizedProfit: totals.unrealizedProfit,
      realizedProfit: totals.realizedProfit,
      totalProfit: totals.totalProfit,
      profitRate: totals.totalProfitRate,
      totalTransactions,
      holdingsCount: holdings.length,
      bestPerformer: best,
      worstPerformer: worst,
    };
  }
}

/**
 * 현재가 반영 (BFF 내부 API).
 *
 * 심볼마다 보유 행을 찾아 갱신한다. **사용자 전체의 같은 심볼 보유가 대상**이다 —
 * 원문과 같고, 그래서 이 유스케이스만 `userId` 를 받지 않는다.
 */
export class UpdateHoldingPrices {
  constructor(private readonly holdings: HoldingRepository) {}

  async execute(
    priceData: Array<{ symbol: string; currentPrice: number }>
  ): Promise<void> {
    for (const { symbol, currentPrice } of priceData) {
      const holdings = await this.holdings.findBySymbol(symbol.toUpperCase());

      await Promise.all(
        holdings.map((holding) =>
          this.holdings.applyValuation(
            holding.id,
            revalue(holding, currentPrice)
          )
        )
      );
    }
  }
}

/**
 * 성과 시계열.
 *
 * 시세는 `market` 의 것이고 `PriceHistorySource` Port 로만 읽는다. 원문은
 * `prisma.priceHistory` 를 직접 뒤졌다.
 */
export class GetPerformanceSeries {
  constructor(
    private readonly holdings: HoldingRepository,
    private readonly prices: PriceHistorySource
  ) {}

  async execute(userId: string, range: string) {
    const holdings = await this.holdings.findByUser(userId);
    if (holdings.length === 0) return { points: [] };

    const closes = await this.prices.closesSince(
      holdings.map((h) => h.symbol),
      rangeStart(range, new Date())
    );

    return { points: buildPerformanceSeries(holdings, closes) };
  }
}
