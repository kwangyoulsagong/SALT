/**
 * 포지션 뷰모델(F006 G절 · `BFF-REQ-027` FR-70~72 · `BFF-REQ-028` FR-40) — **순수 함수**. 계산은 서버, 여기선 이름 · 로고를 붙이고 모양만 맞춘다.
 * 금액 `null` 을 0 으로 바꾸지 않는다 · 레이더 `value: null` 을 0 으로 바꾸지 않는다(FE FR-92). 서버 `degraded` 는 지우지 않고 전달한다.
 *
 * ## 정의가 두 벌이다 — 홈 카드와 같은 방법
 *
 * `bff` 는 pnpm workspace 밖이라 `@repo/core` 를 import 하지 못한다. 같은 정의를 `salt-microFe/packages/core/src/portfolio/position.ts`
 * 에 두고 `__tests__/position-contract.test.ts` 가 아래 `CONTRACT` 블록을
 * 글자 그대로 대조한다.
 */

// CONTRACT:BEGIN PositionView
export type RadarAxisKey = "concentration" | "volatility" | "drawdown" | "news";
export type RadarReasonCode = "over_limit" | "within_limit" | "insufficient_data";
export type FlowRange = "1w" | "1m" | "3m" | "1y";

export interface NamedSymbol {
  symbol: string;
  name: string;
  logoUrl: string | null;
  assetType: string;
}

export interface PositionRadarAxis {
  key: RadarAxisKey;
  /** 0~100 점. 재료가 모자라면 null — 0 으로 그리지 않는다 */
  value: number | null;
  /** 원래 단위 — 집중도 · 뉴스 %, 변동성 연율 %, 낙폭 %(음수) */
  raw: number | null;
  limit: number;
  breached: boolean;
  reasonCode: RadarReasonCode;
  /** 집중도 축의 최대 비중 종목 이름 — 사유 문구에 쓴다 */
  subjectName: string | null;
}

export interface PositionOverviewVM {
  /** 보유 0 — Hero · 레이더 없이 첫 기록 안내 */
  empty: boolean;
  hero: {
    totalValueKrw: number;
    unrealizedProfitKrw: number;
    unrealizedProfitRatePct: number | null;
    investedKrw: number;
    holdingsCount: number;
    topWeight: (NamedSymbol & { pct: number }) | null;
    /** 매수 · 매도 금액을 뺀 시간가중. 30일 전부터 들고 있지 않았으면 null */
    return30dPct: number | null;
  } | null;
  radar: PositionRadarAxis[] | null;
  degraded: boolean;
  degradedReasons: string[];
  namesDegraded: boolean;
}

export interface PositionFlowVM {
  range: FlowRange;
  /** KST 날짜별 평가금(원) — 그날 실제 수량 × 일봉 종가 */
  points: Array<{ date: string; valueKrw: number }>;
  /** 시간가중 지수의 최대 낙폭 — 점이 2개 미만이면 null */
  maxDrawdown: { pct: number; peakDate: string; troughDate: string } | null;
  periodReturnPct: number | null;
  missingSymbols: string[];
  degraded: boolean;
  degradedReasons: string[];
}

/** 거래 기록(F006 G절 2단계 · `BFF-REQ-027` FR-80~85) — 주문이 아니다. 이미 한 거래를 적는다 */
export type LedgerAssetType = "crypto" | "kr_stock";
export type LedgerSide = "buy" | "sell";

export interface PositionTransactionVM {
  id: string;
  symbol: string;
  assetType: LedgerAssetType;
  /** 이름을 못 붙이면 심볼 · 코드 — `namesDegraded` */
  name: string;
  logoUrl: string | null;
  side: LedgerSide;
  quantity: number;
  price: number;
  /** 서버가 저장한 수량 × 단가 */
  totalAmount: number;
  fee: number;
  /** ISO 시각 */
  transactionDate: string;
}

export interface PositionTransactionPageVM {
  /** 최신순 */
  items: PositionTransactionVM[];
  page: number;
  totalPages: number;
  total: number;
  namesDegraded: boolean;
}

/** 보유 수량 · 평단 · 총 취득금액 — 서버 FIFO 재계산 값. 보유가 없어지면 셋 다 0 */
export interface LedgerFigures {
  quantity: number;
  averageBuyPrice: number;
  totalInvested: number;
}

export interface TransactionPreviewVM {
  symbol: string;
  assetType: LedgerAssetType;
  before: LedgerFigures;
  after: LedgerFigures;
}

/** 새 거래 — 종목 · 매수/매도는 만들 때만 정한다 */
export interface TransactionCreateInput {
  assetType: LedgerAssetType;
  symbol: string;
  side: LedgerSide;
  quantity: number;
  price: number;
  /** ISO 시각. 주지 않으면 지금 */
  transactionDate?: string;
}

/** 수정 — 종목 · 매수/매도는 바꾸지 않는다(지우고 다시 적는다) */
export interface TransactionPatchInput {
  quantity?: number;
  price?: number;
  transactionDate?: string;
}

/** 미리보기 — 새 거래 또는 고친 거래(`transactionId`) */
export type TransactionPreviewInput = TransactionCreateInput | (TransactionPatchInput & { transactionId: string });

/** 거래 쓰기 거부 코드 — 서버 코드 그대로. 문구는 화면이 고른다 */
export const INSUFFICIENT_QUANTITY_CODE = "PORTFOLIO_INSUFFICIENT_QUANTITY";
// CONTRACT:END PositionView

export interface ServerPositionOverview {
  empty: boolean;
  hero: {
    totalValueKrw: number;
    unrealizedProfitKrw: number;
    unrealizedProfitRatePct: number | null;
    investedKrw: number;
    holdingsCount: number;
    topWeight: { symbol: string; assetType: string; pct: number } | null;
    return30dPct: number | null;
  } | null;
  radar: Array<{
    key: RadarAxisKey;
    value: number | null;
    raw: number | null;
    limit: number;
    breached: boolean;
    reasonCode: "over_limit" | "within_limit" | "insufficient_data";
    subject: string | null;
  }> | null;
  degraded: boolean;
  degradedReasons: string[];
}

export type ServerPositionFlow = PositionFlowVM;

const RADAR_KEYS: ReadonlySet<string> = new Set(["concentration", "volatility", "drawdown", "news"]);

export const toPositionOverviewViewModel = (
  server: ServerPositionOverview,
  names: ReadonlyMap<string, { name: string; logoUrl: string | null }>,
  namesDegraded: boolean,
): PositionOverviewVM => {
  const named = (symbol: string) => names.get(symbol.toUpperCase()) ?? { name: symbol, logoUrl: null };
  const hero = server.hero;
  return {
    empty: server.empty,
    hero: hero
      ? {
          totalValueKrw: hero.totalValueKrw,
          unrealizedProfitKrw: hero.unrealizedProfitKrw,
          unrealizedProfitRatePct: hero.unrealizedProfitRatePct,
          investedKrw: hero.investedKrw,
          holdingsCount: hero.holdingsCount,
          topWeight: hero.topWeight
            ? { symbol: hero.topWeight.symbol, assetType: hero.topWeight.assetType, pct: hero.topWeight.pct, ...named(hero.topWeight.symbol) }
            : null,
          return30dPct: hero.return30dPct,
        }
      : null,
    // 모르는 축 키는 싣지 않는다 — 화면이 문구를 못 고르는 축을 그리지 않게(FE FR-93)
    radar: server.radar
      ? server.radar
          .filter((axis) => RADAR_KEYS.has(axis.key))
          .map((axis) => ({
            key: axis.key,
            value: axis.value,
            raw: axis.raw,
            limit: axis.limit,
            breached: axis.breached,
            reasonCode: axis.reasonCode,
            subjectName: axis.subject ? named(axis.subject).name : null,
          }))
      : null,
    degraded: server.degraded,
    degradedReasons: server.degradedReasons,
    namesDegraded,
  };
};

export const toPositionFlowViewModel = (server: ServerPositionFlow): PositionFlowVM => ({
  range: server.range,
  points: server.points,
  maxDrawdown: server.maxDrawdown,
  periodReturnPct: server.periodReturnPct,
  missingSymbols: server.missingSymbols,
  degraded: server.degraded,
  degradedReasons: server.degradedReasons,
});

/** 서버 거래 행(`GET /api/portfolio/transactions` · 쓰기 응답) — 쓰는 칸만 */
export interface ServerTransaction {
  id: string;
  symbol: string;
  assetType: string;
  transactionType: string;
  quantity: number;
  price: number;
  totalAmount: number;
  fee: number;
  transactionDate: string;
}

export interface ServerTransactionPage {
  transactions: ServerTransaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** 이 화면이 아는 자산군만 — 다른 자산군 행(옛 `stock` 등)은 목록에서 고칠 수 없어 싣지 않는다 */
export const isLedgerAssetType = (value: string): value is LedgerAssetType => value === "crypto" || value === "kr_stock";

export const toPositionTransactionViewModel = (
  row: ServerTransaction & { assetType: LedgerAssetType },
  names: ReadonlyMap<string, { name: string; logoUrl: string | null }>,
): PositionTransactionVM => {
  const named = names.get(row.symbol.toUpperCase()) ?? { name: row.symbol, logoUrl: null };
  return {
    id: row.id,
    symbol: row.symbol,
    assetType: row.assetType,
    name: named.name,
    logoUrl: named.logoUrl,
    side: row.transactionType === "sell" ? "sell" : "buy",
    quantity: row.quantity,
    price: row.price,
    totalAmount: row.totalAmount,
    fee: row.fee,
    transactionDate: new Date(row.transactionDate).toISOString(),
  };
};

export const toPositionTransactionPageViewModel = (
  server: ServerTransactionPage,
  names: ReadonlyMap<string, { name: string; logoUrl: string | null }>,
  namesDegraded: boolean,
): PositionTransactionPageVM => ({
  items: server.transactions
    .filter((row): row is ServerTransaction & { assetType: LedgerAssetType } => isLedgerAssetType(row.assetType))
    .map((row) => toPositionTransactionViewModel(row, names)),
  page: server.pagination.page,
  totalPages: server.pagination.totalPages,
  total: server.pagination.total,
  namesDegraded,
});

/** 미리보기 — 서버 값 그대로(BFF 가 평단을 계산하지 않는다, FR-81) */
export const toTransactionPreviewViewModel = (server: TransactionPreviewVM): TransactionPreviewVM => ({
  symbol: server.symbol,
  assetType: server.assetType,
  before: { quantity: server.before.quantity, averageBuyPrice: server.before.averageBuyPrice, totalInvested: server.before.totalInvested },
  after: { quantity: server.after.quantity, averageBuyPrice: server.after.averageBuyPrice, totalInvested: server.after.totalInvested },
});
