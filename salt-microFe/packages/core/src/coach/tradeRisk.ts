/**
 * 거래 기록 · 계획 · 사이즈 계산 · 리스크 예산 뷰모델 (F009 `BFF-REQ-038` · `FE-REQ-039`).
 *
 * BFF `trade-risk.viewmodel.ts` 가 소유하는 계약이다 — 웹과 RN 이 같은 모양을 읽는다.
 * **금액 · 비율은 전부 서버 계산**이다(공통 수용 기준 3). 비율은 소수(0.28 = 28%), 금액은 원 정수.
 * 못 구한 값은 `null` 이고 사유는 `unavailable` 에 코드로 온다 — 0 으로 읽지 않는다.
 */

import type { TradeBehaviorPreviewResult } from "./behaviorMirror";

export type TradeSide = "buy" | "sell";

export type SizingUnavailableReason =
  | "stop_price_missing"
  | "stop_not_below_entry"
  | "budget_not_set"
  | "no_portfolio_value"
  | "monthly_budget_exhausted"
  | "insufficient_data"
  | "not_applicable_sell";

export type SizingField =
  | "maxLoss"
  | "perTradeBudgetRatio"
  | "monthlyBudgetRemainingRatio"
  | "referenceMaxQuantity"
  | "volTargetWeight"
  | "currentWeight"
  | "consecutiveLoss";

export interface SizeCheckView {
  status: "ok";
  symbol: string;
  side: TradeSide;
  sizingStatus: "ok" | "stop_not_below_entry" | "sell_side";
  maxLossKrw: number | null;
  lossPerUnitKrw: number | null;
  perTradeBudgetRate: number | null;
  monthlyBudgetRemainingRate: number | null;
  monthlyBudgetRemainingKrw: number | null;
  referenceMaxQuantity: { value: number; limitedBy: "per_trade_budget" | "single_asset_weight" } | null;
  volTargetWeight: number | null;
  currentWeight: number | null;
  projectedWeight: number | null;
  consecutiveLoss: { count: number; amountKrw: number; monthlyBudgetRate: number | null } | null;
  kelly: { full: number; half: number; quarter: number; hasEdge: boolean; noteCode: "edge_estimate_uncertain" } | null;
  unavailable: Partial<Record<SizingField, SizingUnavailableReason>>;
  assumptions: {
    feeRatePerSide: number | null;
    stopGapAssumed: false;
    targetVolatility: number | null;
    targetVolatilityIsDefault: boolean;
    maxSingleAssetWeight: number | null;
  };
  volatilityAsOf: string | null;
  asOf: string | null;
  orderExecution: false;
  /** 입력 중 행동 미리보기(슬라이스 5, `SRV-REQ-038` FR-12). 못 구하면 `null` */
  behavior: TradeBehaviorPreviewResult;
}

export type SizeCheckResult = SizeCheckView | { status: "unavailable" };

export interface SizeCheckRequest {
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  stopPrice?: number;
  /** 폼에 계획(손절가 또는 이유)이 있는가 — 계획 외 후보 판정 */
  hasPlan?: boolean;
}

export type GaugeStatus = "ok" | "exceeded" | "budget_not_set" | "insufficient_data";
export type BudgetUnit = "krw" | "percent";

export interface BudgetSetting {
  amount: number;
  unit: BudgetUnit;
}

export interface RiskBudgetView {
  status: "ok";
  settings: {
    monthlyLossBudget: BudgetSetting | null;
    perTradeMaxLoss: BudgetSetting | null;
    monthlyLossBudgetKrw: number | null;
    perTradeMaxLossKrw: number | null;
    targetVolatility: number | null;
    targetVolatilityIsDefault: boolean;
    /** 한 종목 상한(IPS 3문항의 셋째, 슬라이스 6). 서버 기본 0.6 */
    maxSingleAssetWeight: number | null;
  };
  totalValueKrw: number | null;
  gauges: {
    drawdown: {
      status: GaugeStatus;
      budgetKrw: number | null;
      usedKrw: number | null;
      usedRate: number | null;
      monthPnlKrw: number | null;
      missingCloses: string[];
    };
    concentration: { status: GaugeStatus; topSymbol: string | null; topWeight: number | null; limit: number | null };
    turnover: {
      status: "ok" | "insufficient_data";
      trailingYearTurnover: number | null;
      tradedNotionalKrw: number | null;
      feesYearToDateKrw: number | null;
      tradeCount: number | null;
    };
  };
  /** 시나리오(슬라이스 6, FR-25) — 확률이 없다. 못 받았으면 `null` */
  scenarios: ScenariosView | null;
  monthStart: string | null;
  asOf: string | null;
}

export interface ScenariosView {
  status: "ok" | "no_holdings";
  totalValueKrw: number | null;
  /** −10 · −30 · −50% 순. 손실은 음수 원 */
  shocks: Array<{ shock: number; lossKrw: number; valueAfterKrw: number; bySymbol: Array<{ symbol: string; lossKrw: number }> }>;
  /** 과거 구간(2022-11 등)을 지금 보유에 다시 얹은 손실. 그때 일봉이 없는 종목이 있으면 `insufficient_data` */
  episodes: Array<{
    id: string;
    from: string;
    to: string;
    status: "ok" | "insufficient_data";
    lossKrw: number | null;
    returnRate: number | null;
    bySymbol: Array<{ symbol: string; returnRate: number | null; lossKrw: number | null }>;
    missingSymbols: string[];
  }>;
}

export type RiskBudgetResult = RiskBudgetView | { status: "unavailable" };

/** `PUT` 본문. 빠진 필드는 그대로, `null` 은 지운다. `percent` 는 비율(0.05 = 5%) */
export interface RiskBudgetUpdate {
  monthlyLossBudget?: BudgetSetting | null;
  perTradeMaxLoss?: BudgetSetting | null;
  targetVolatility?: number | null;
  /** 한 종목 상한 비율(0.05~1). `null` 이면 기본 60% */
  maxSingleAssetWeight?: number | null;
}

export type AdherenceLabel = "honored" | "stop_not_honored" | "stop_slipped" | "size_exceeded";

export interface TradePlanView {
  id: string;
  transactionId: string | null;
  symbol: string;
  side: TradeSide;
  stopPrice: number | null;
  targetPrice: number | null;
  plannedQuantity: number | null;
  thesis: string | null;
  invalidation: string | null;
  reviewAt: string | null;
  probabilityUp: number | null;
  /** 진입 전 체크리스트 기록(슬라이스 6) */
  checklist: { shown: string[]; checked: string[] } | null;
  plannedAt: string;
  locked: boolean;
  adherence: { label: AdherenceLabel | null; userLabel: AdherenceLabel | null; evaluatedAt: string | null };
}

export type TradePlanListResult = { status: "ok"; plans: TradePlanView[] } | { status: "unavailable" };

export interface RecordTradeRequest {
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  transactionDate?: string;
  plan?: {
    stopPrice?: number;
    thesis?: string;
    /** 프리모템 답(슬라이스 6) */
    invalidation?: string;
    /** 진입 전 체크리스트 — 펼쳤을 때만. 계획이 있을 때만 남는다(체크만으로는 계획이 생기지 않는다) */
    checklist?: { shown: string[]; checked: string[] };
  };
}

export interface RecordedTransactionView {
  id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  price: number;
  fee: number | null;
  transactionDate: string;
}

/** 거래가 저장되면 성공이다. 계획만 `unavailable` 이면 같은 거래 id 로 계획만 다시 저장한다 */
export interface RecordTradeResult {
  transaction: RecordedTransactionView;
  plan: { status: "ok"; plan: TradePlanView } | { status: "unavailable" } | { status: "none" };
}
