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

/**
 * 홈 "주식" 섹션용 보유 요약 (`SRV-REQ-008` FR-60~63).
 *
 * `GetHoldings` 와 무엇이 다른가: 저것은 **화면 하나가 쓰는 전부**(수량·평균단가·실현
 * 손익까지)를 주고, 이것은 **한 줄에 들어갈 넷**만 준다. 홈 블록에 필요 없는 필드를
 * 실어 보내지 않는다 (`performance-server.md` §8).
 *
 * ## 환율
 *
 * `fxRateUsed`·`fxBasisCode` 를 **자리만 만들어 `null` 로 둔다.** 지금 보유는 전부
 * 원화 크립토라 환산할 것이 없고, `fx` 컨텍스트도 아직 없다(F001·F002). 필드를 지금
 * 두는 이유는 미국주식이 들어올 때 **응답 모양이 바뀌지 않게** 하기 위해서다 —
 * 화면은 "환율 기준을 모른다"와 "환율이 필요 없다"를 같은 `null` 로 본다.
 */
export class GetPortfolioSummary {
  constructor(private readonly holdings: HoldingRepository) {}

  async execute(userId: string) {
    const holdings = await this.holdings.findByUser(userId);
    const totals = summarizeHoldings(holdings);

    return {
      items: holdings.map((holding) => ({
        symbol: holding.symbol,
        assetType: holding.assetType,
        currentValue: holding.currentValue,
        profitRate: holding.unrealizedProfitRate,
      })),
      totalKrw: totals.totalValue,
      fxRateUsed: null,
      fxBasisCode: null,
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

  /**
   * 시세를 보유에 반영한다.
   *
   * ## 심볼 수가 아니라 **보유 수**에 비례해야 한다
   *
   * 원문은 심볼마다 `findBySymbol` 을 돌았다. 시세를 밀어 넣는 쪽은 구독 중인 전체
   * 심볼(100개 이상)을 5초마다 보내는데, 보유는 보통 몇 건이다 — 그 구조면 **아무것도
   * 안 바뀌는 조회를 5초마다 100번** 한다.
   *
   * 한 번 읽어서 해당 심볼의 보유만 갱신한다. 보내온 심볼 중 보유가 없는 것은
   * 조회 결과에 없으므로 자연히 건너뛴다.
   */
  async execute(
    priceData: Array<{ symbol: string; currentPrice: number }>
  ): Promise<void> {
    const priceBySymbol = new Map(
      priceData.map(({ symbol, currentPrice }) => [
        symbol.toUpperCase(),
        currentPrice,
      ])
    );
    if (priceBySymbol.size === 0) return;

    const holdings = await this.holdings.findBySymbols([...priceBySymbol.keys()]);

    await Promise.all(
      holdings.map((holding) => {
        const currentPrice = priceBySymbol.get(holding.symbol.toUpperCase());
        if (currentPrice === undefined) return Promise.resolve();
        return this.holdings.applyValuation(
          holding.id,
          revalue(holding, currentPrice)
        );
      })
    );
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
