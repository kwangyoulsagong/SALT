/**
 * `coach` 의 도메인 모델.
 *
 * ## Prisma 타입을 그대로 쓰지 않는다
 *
 * 원문(`ai-coach.types.ts`)은 `PortfolioHolding` · `TechnicalIndicator` ·
 * `MarketSentiment` · `InvestmentInsight` 를 **`@prisma/client` 에서 직접 import** 했다.
 * 그러면 도메인이 DB row 모양이 되고(`server-architecture.md` §3), 그 넷은 이제
 * **남의 컨텍스트 테이블**이라 경계도 함께 깨진다.
 *
 * **필드 이름은 원문 그대로 둔다.** 점수 엔진 468줄이 이 이름들을 읽고, 이관에서
 * 그 본문을 고치지 않는 것이 목적이다 — 이름을 바꾸면 산술 변경과 구분되지 않는다.
 */

/** `market` 의 최신 기술 지표. nullable 인 것은 DB 가 그렇기 때문이다. */
export interface CoachIndicator {
  rsi14: number | null;
  ma20: number | null;
  ma50: number | null;
  volumeAvg20: number | null;
  timestamp: Date;
}

/** `market` 의 최신 시장 심리. */
export interface CoachSentiment {
  sentimentScore: number;
  fearGreedIndex?: number;
  sentimentLabel: string;
  priceChange24h: number;
  calculatedAt: Date;
}

/** `market` 의 자산 시세 한 줄. `marketAsset` 행에서 코치가 쓰는 것만. */
export interface CoachQuote {
  symbol: string;
  currentPrice: number | null;
  change24h: number | null;
  priceUpdatedAt: Date | null;
}

/** `portfolio` 의 보유. */
export interface CoachHolding {
  symbol: string;
  totalQuantity: number;
  averageBuyPrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedProfit: number;
  unrealizedProfitRate: number;
  realizedProfit: number;
}

/** `portfolio` 의 거래 한 건. 행동 분석이 읽는 것만. */
export interface CoachTrade {
  symbol: string;
  transactionType: "buy" | "sell";
  price: number;
  transactionDate: Date;
}

/**
 * 인사이트 한 건.
 *
 * `payload` 가 열린 맵이다 — 도메인이 JSON 스키마를 알지 않는다. **조건으로 뒤지는
 * 쿼리를 신규로 만들지 않는 것이 FR-44** 이고, 여기 있는 값은 이미 읽어 온 행에서
 * 메모리로 꺼내 쓰는 것뿐이다.
 */
export interface CoachInsight {
  id: string;
  type: string;
  symbol: string | null;
  dedupeKey: string | null;
  title: string;
  summary: string;
  severity: number;
  confidence: number | null;
  payload: Record<string, unknown> | null;
  createdAt: Date;
  /** 이 시각 이후로는 읽지 않는다. `null` 이면 만료가 없다. */
  expiresAt: Date | null;
}

export type MarketRegime =
  | "bullish"
  | "bearish"
  | "panic"
  | "euphoric"
  | "sideways";

export type RiskLevel = "low" | "medium" | "high";

export interface PortfolioState {
  totalValue: number;
  concentration: number;
  largestAsset?: string;
  riskLevel: RiskLevel;
  diversificationScore: number;
}

export interface WhaleFlow {
  buy: number;
  sell: number;
}

/** 대량 체결 한 건. `market` 이 탐지해 저장한 것을 코치가 읽는다. */
export interface CoachWhaleTransaction {
  symbol: string;
  transactionType: "buy" | "sell";
  amountKRW: number;
  detectedAt: Date;
}

/** 뉴스 감성 분석 한 종목분. `news` 의 기사를 읽어 `coach` 가 만든다. */
export interface NewsAnalysisResult {
  symbol: string;
  /** -100 ~ +100. 양수가 bullish 다. */
  score: number;
  sentiment: "bullish" | "bearish" | "neutral";
  keywords: string[];
  articleCount: number;
  summary: string;
}

/** 감성 분석의 입력. 본문(`content`)까지 받는다 — 키워드가 본문에도 걸린다. */
export interface CoachArticle {
  title: string;
  summary: string | null;
  content: string | null;
  sentiment: string | null;
  publishedAt: Date;
}

export type CoachAction = "buy" | "sell" | "hold" | "rebalance";

export type CoachMode = "scalp" | "long_term";

/** 한 종목에 대해 모은 판단 재료. */
export interface SymbolFeature {
  symbol: string;
  holding?: CoachHolding;
  indicator?: CoachIndicator;
  sentiment?: CoachSentiment;
  currentPrice?: number;
  whaleFlow?: WhaleFlow;
  buyZoneInsight?: CoachInsight;
  riskInsights: CoachInsight[];
}

/**
 * 점수 계산의 입력 전체.
 *
 * **이 타입을 만드는 것이 `application` 의 일**이고(세 컨텍스트의 공개 API 를 Port 로
 * 받아 조립한다), 점수 계산은 이것만 보고 DB 를 모른다.
 */
export interface CoachContext {
  userId: string;
  marketRegime: MarketRegime;
  portfolioState: PortfolioState;
  maxWeight: number;
  topHolding?: CoachHolding;
  holdings: CoachHolding[];
  symbolFeatures: Map<string, SymbolFeature>;
  behaviorInsights: CoachInsight[];
  candidateSymbols: string[];
  newsAnalysisMap: Map<string, NewsAnalysisResult>;
}

export interface Candidate {
  action: CoachAction;
  symbol: string;
}

export interface ScoreFactor {
  key: string;
  score: number;
  message: string;
}

export interface ScoredCandidate extends Candidate {
  score: number;
  positiveFactors: ScoreFactor[];
  negativeFactors: ScoreFactor[];
}

export interface CoachReason {
  type: string;
  message: string;
  value?: number | string | null;
}

export interface CoachRisk {
  type: string;
  symbol?: string;
  message: string;
  severity?: number;
}

export interface CoachPayload {
  recommendation: { action: CoachAction; symbol: string; score: number };
  candidates: Array<{ action: CoachAction; symbol: string; score: number }>;
  market: { regime: MarketRegime };
  portfolio: PortfolioState;
  reasons: CoachReason[];
  risks: CoachRisk[];
  actions: string[];
  debug?: { topCandidateFactors: ScoreFactor[] };
}

/** 코치 설정. 기본값은 원문 상수다. */
export interface CoachProfile {
  userId: string;
  riskTolerance: RiskLevel;
  maxSingleAssetWeight: number;
  rebalanceBand: number;
  panicSellWindowHours: number;
  createdAt?: Date;
  updatedAt?: Date;
}
