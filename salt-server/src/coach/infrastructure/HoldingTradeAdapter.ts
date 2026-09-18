import type { PortfolioApi } from "../../portfolio/application/api";
import type {
  CoachHolding,
  CoachTrade,
  PortfolioProbe,
} from "../domain";

/**
 * `portfolio` → `coach` ACL.
 *
 * 원문에서 보유 조회가 **일곱 파일**에 각자 있었다(`trade-preflight` ·
 * `profit-plan` · `risk-alert` · `portfolio-state` · `portfolio-rebalance` ·
 * `ai-coach-feature.extractor` · `dashboard`). 그중 코치의 몫이 이 어댑터 하나로 모였다.
 *
 * `assetType` 을 `crypto` 로 고정한다 — 원문 조회가 전부 그랬다. 자산군 확장은
 * `DB-REQ-003` 이고, 그전에 넓히면 없던 자산군이 코치 판단에 갑자기 들어온다.
 */
const COACH_ASSET_TYPE = "crypto" as const;

/** 행동 분석이 한 번에 읽는 거래 수 상한. 원문의 `take: 200` 이다. */
const TRADE_WINDOW_LIMIT = 200;

export class HoldingTradeAdapter implements PortfolioProbe {
  constructor(private readonly portfolio: PortfolioApi) {}

  async listHoldings(userId: string): Promise<CoachHolding[]> {
    const holdings = await this.portfolio.listHoldings(userId);
    return holdings.map(toCoachHolding);
  }

  async getHolding(
    userId: string,
    symbol: string
  ): Promise<CoachHolding | null> {
    const holding = await this.portfolio.getHolding(userId, symbol);
    return holding ? toCoachHolding(holding) : null;
  }

  async listTradesSince(
    userId: string,
    since: Date,
    limit: number = TRADE_WINDOW_LIMIT
  ): Promise<CoachTrade[]> {
    const transactions = await this.portfolio.listTransactions(userId, {
      assetType: COACH_ASSET_TYPE,
      since,
      limit,
    });

    return transactions.map((tx) => ({
      symbol: tx.symbol,
      transactionType: tx.transactionType,
      price: tx.price,
      transactionDate: tx.transactionDate,
    }));
  }

  countTrades(userId: string): Promise<number> {
    return this.portfolio.countTransactions(userId, COACH_ASSET_TYPE);
  }
}

const toCoachHolding = (holding: {
  symbol: string;
  totalQuantity: number;
  averageBuyPrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedProfit: number;
  unrealizedProfitRate: number;
  realizedProfit: number;
}): CoachHolding => ({
  symbol: holding.symbol,
  totalQuantity: holding.totalQuantity,
  averageBuyPrice: holding.averageBuyPrice,
  totalInvested: holding.totalInvested,
  currentPrice: holding.currentPrice,
  currentValue: holding.currentValue,
  unrealizedProfit: holding.unrealizedProfit,
  unrealizedProfitRate: holding.unrealizedProfitRate,
  realizedProfit: holding.realizedProfit,
});
