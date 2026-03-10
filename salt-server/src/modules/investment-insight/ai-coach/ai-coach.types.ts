import type {
  PortfolioHolding,
  TechnicalIndicator,
  MarketSentiment,
  InvestmentInsight,
} from "@prisma/client";
import type { MarketRegime } from "../market-regime.service";
import type { PortfolioState } from "../portfolio-state.service";

export type CoachAction = "buy" | "sell" | "hold" | "rebalance";

export type WhaleFlow = {
  buy: number;
  sell: number;
};

export type SymbolFeature = {
  symbol: string;
  holding?: PortfolioHolding;
  indicator?: TechnicalIndicator;
  sentiment?: MarketSentiment;
  currentPrice?: number;
  whaleFlow?: WhaleFlow;
  buyZoneInsight?: InvestmentInsight;
  riskInsights: InvestmentInsight[];
};

export type AICoachContext = {
  userId: string;
  marketRegime: MarketRegime;
  portfolioState: PortfolioState;
  maxWeight: number;
  topHolding?: PortfolioHolding;
  holdings: PortfolioHolding[];
  symbolFeatures: Map<string, SymbolFeature>;
  behaviorInsights: InvestmentInsight[];
  candidateSymbols: string[];
};

export type Candidate = {
  action: CoachAction;
  symbol: string;
};

export type ScoreFactor = {
  key: string;
  score: number;
  message: string;
};

export type ScoredCandidate = Candidate & {
  score: number;
  positiveFactors: ScoreFactor[];
  negativeFactors: ScoreFactor[];
};

export type CoachReason = {
  type: string;
  message: string;
  value?: number | string | null;
};

export type CoachRisk = {
  type: string;
  symbol?: string;
  message: string;
  severity?: number;
};

export type CoachPayload = {
  recommendation: {
    action: CoachAction;
    symbol: string;
    score: number;
  };
  candidates: Array<{
    action: CoachAction;
    symbol: string;
    score: number;
  }>;
  market: {
    regime: MarketRegime;
  };
  portfolio: PortfolioState;
  reasons: CoachReason[];
  risks: CoachRisk[];
  actions: string[];
  debug?: {
    topCandidateFactors: ScoreFactor[];
  };
};
