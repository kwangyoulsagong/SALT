import type { HoldingSnapshot, TransactionFact } from "./HoldingRecalculation";
import type { ClosePriceFact } from "./PerformanceSeries";

/**
 * `portfolio` 가 밖에 요구하는 것.
 *
 * `assetType` 은 `market` 과 같은 이유로 **DB enum 두 값**만 쓴다(`DB-REQ-003` 까지).
 */
export type PortfolioAssetType = "crypto" | "stock";

export interface Transaction {
  id: string;
  userId: string;
  symbol: string;
  assetType: PortfolioAssetType;
  transactionType: "buy" | "sell";
  quantity: number;
  price: number;
  totalAmount: number;
  fee: number;
  note: string | null;
  transactionDate: Date;
}

export interface Holding {
  id: string;
  userId: string;
  symbol: string;
  assetType: PortfolioAssetType;
  totalQuantity: number;
  averageBuyPrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedProfit: number;
  unrealizedProfitRate: number;
  realizedProfit: number;
}

export interface TransactionFilter {
  userId: string;
  symbol?: string;
  transactionType?: "buy" | "sell";
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

export interface TransactionRepository {
  create(input: {
    userId: string;
    symbol: string;
    assetType: PortfolioAssetType;
    transactionType: "buy" | "sell";
    quantity: number;
    price: number;
    totalAmount: number;
    fee: number;
    note?: string;
    transactionDate: Date;
  }): Promise<Transaction>;
  findById(transactionId: string): Promise<Transaction | null>;
  update(
    transactionId: string,
    patch: Partial<
      Pick<
        Transaction,
        "quantity" | "price" | "totalAmount" | "fee" | "note" | "transactionDate"
      >
    >
  ): Promise<Transaction>;
  delete(transactionId: string): Promise<void>;
  findPage(
    filter: TransactionFilter
  ): Promise<{ transactions: Transaction[]; total: number }>;
  /** **거래일 오름차순.** FIFO 는 이 순서가 곧 원가 소진 순서다. */
  findForRecalculation(
    userId: string,
    symbol: string,
    assetType: PortfolioAssetType
  ): Promise<TransactionFact[]>;
  countByUser(userId: string): Promise<number>;
}

export interface HoldingRepository {
  findOne(
    userId: string,
    symbol: string,
    assetType: PortfolioAssetType
  ): Promise<Holding | null>;
  findByUser(userId: string, symbol?: string): Promise<Holding[]>;
  findBySymbol(symbol: string): Promise<Holding[]>;
  /** 수량이 남으면 upsert, 0 이하면 삭제한다. 그 판정은 `domain` 이 한다. */
  save(
    userId: string,
    symbol: string,
    assetType: PortfolioAssetType,
    snapshot: HoldingSnapshot
  ): Promise<void>;
  remove(
    userId: string,
    symbol: string,
    assetType: PortfolioAssetType
  ): Promise<void>;
  applyValuation(
    holdingId: string,
    valuation: {
      currentPrice: number;
      currentValue: number;
      unrealizedProfit: number;
      unrealizedProfitRate: number;
    }
  ): Promise<void>;
}

/**
 * 시세 이력 — `market` 을 우리 언어로 번역하는 ACL 의 Port.
 *
 * 원문의 `portfolio-performance.service` 는 `prisma.priceHistory` 를 직접 뒤졌다.
 * 시세는 `market` 컨텍스트의 것이고, 남의 테이블을 읽으면 경계가 이름만 남는다.
 */
export interface PriceHistorySource {
  closesSince(symbols: string[], since: Date): Promise<ClosePriceFact[]>;
}
