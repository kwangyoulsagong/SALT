import type {
  Holding,
  HoldingRepository,
  PortfolioAssetType,
  PriceHistorySource,
  Transaction,
  TransactionRepository,
} from "../../domain";
import {
  DeleteTransaction,
  RecordTransaction,
  UpdateTransaction,
} from "../RecordTransaction";
import {
  GetHoldings,
  GetPerformanceSeries,
  GetPortfolioStats,
  ListTransactions,
  UpdateHoldingPrices,
} from "../ReadPortfolio";

/**
 * `portfolio` 의 **공개 API** (FR-4).
 *
 * ## 이 셋이 `coach` 가 읽던 것이다
 *
 * `trade-preflight`(비중 계산) · `profit-plan`(손절·익절 가격) · `risk-alert` ·
 * `portfolio-state` · `portfolio-rebalance` · `ai-coach-feature.extractor` ·
 * `dashboard` 가 전부 `prisma.portfolioHolding` 을 직접 읽었고,
 * `behavior-analysis` · `behavior-coach` 가 `prisma.portfolioTransaction` 을 읽었다.
 * **일곱 파일이 같은 조회를 각자 갖고 있었다.**
 *
 * 조회만 연다. 거래 기록·보유 갱신은 이 컨텍스트의 일이고, 밖에서 부를 일이 없다.
 */
export interface PortfolioApi {
  /** 사용자의 보유 전체. `coach` 의 비중·집중도 계산이 이것을 쓴다. */
  listHoldings(userId: string): Promise<Holding[]>;
  /** 한 종목 보유. 없으면 `null` — 미보유가 정상 경로다. */
  getHolding(userId: string, symbol: string): Promise<Holding | null>;
  /** 거래 내역. `coach` 의 행동 분석이 매매 패턴을 본다. */
  listTransactions(
    userId: string,
    options?: {
      symbol?: string;
      assetType?: PortfolioAssetType;
      /** 이 시각 이후 거래만. 행동 분석이 최근 창만 본다. */
      since?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<Transaction[]>;
  /**
   * 거래 건수.
   *
   * 행동 코치의 최소 표본 판정이 이것을 쓴다. 목록을 받아 `length` 로 세면
   * 거래 5,000건이 5,000행 이동이 된다 (`ddd-infrastructure.md` §3).
   */
  countTransactions(
    userId: string,
    assetType?: PortfolioAssetType
  ): Promise<number>;
}

export type { Holding, PortfolioAssetType, Transaction };

export interface PortfolioDependencies {
  transactions: TransactionRepository;
  holdings: HoldingRepository;
  prices: PriceHistorySource;
}

export interface PortfolioUseCases {
  recordTransaction: RecordTransaction;
  updateTransaction: UpdateTransaction;
  deleteTransaction: DeleteTransaction;
  listTransactions: ListTransactions;
  getHoldings: GetHoldings;
  getPortfolioStats: GetPortfolioStats;
  updateHoldingPrices: UpdateHoldingPrices;
  getPerformanceSeries: GetPerformanceSeries;
}

/** 공개 API 가 쓰는 기본 페이지 크기. 밖에서 부를 때 전체를 긋지 않게 한다. */
const API_DEFAULT_LIMIT = 200;

export const createPortfolioApplication = (deps: PortfolioDependencies) => {
  const listTransactions = new ListTransactions(deps.transactions);

  const useCases: PortfolioUseCases = {
    recordTransaction: new RecordTransaction(deps.transactions, deps.holdings),
    updateTransaction: new UpdateTransaction(deps.transactions, deps.holdings),
    deleteTransaction: new DeleteTransaction(deps.transactions, deps.holdings),
    listTransactions,
    getHoldings: new GetHoldings(deps.holdings),
    getPortfolioStats: new GetPortfolioStats(deps.holdings, deps.transactions),
    updateHoldingPrices: new UpdateHoldingPrices(deps.holdings),
    getPerformanceSeries: new GetPerformanceSeries(deps.holdings, deps.prices),
  };

  const api: PortfolioApi = {
    listHoldings: (userId) => deps.holdings.findByUser(userId),
    getHolding: (userId, symbol) =>
      deps.holdings.findOne(userId, symbol.toUpperCase(), "crypto"),
    listTransactions: async (userId, options = {}) => {
      const result = await listTransactions.execute(userId, {
        symbol: options.symbol,
        assetType: options.assetType,
        startDate: options.since,
        page: options.page,
        limit: options.limit ?? API_DEFAULT_LIMIT,
      });
      return result.transactions;
    },
    countTransactions: (userId, assetType) =>
      deps.transactions.countByUser(userId, assetType),
  };

  return { api, useCases };
};
