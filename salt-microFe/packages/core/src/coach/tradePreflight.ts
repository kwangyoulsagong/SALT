/**
 * 주문 전 체크 (F004 FR-30 · `BFF-REQ-024` · `FE-REQ-026` FR-150~156).
 *
 * BFF `app-trade-preflight.service.ts` 가 소유하는 계약이다 — 서버 `/trade-preflight` 를 거의 그대로 넘긴다.
 * **계산일 뿐 주문이 아니다.** `orderExecution: false` 는 사실 서술이고 켜면 주문이 되는 코드가 뒤에 없다.
 * 금액 · 비율은 전부 서버 계산이다(공통 수용 기준 3). 비율은 소수(0.28 = 28%), 금액은 원.
 */

export type PreflightMode = "scalp" | "long_term";

export type PreflightWarningCode =
  | "missing_stop_price"
  | "weak_risk_reward"
  | "concentration_risk"
  | "stale_price";

export type PreflightCheckKey = "stop_price" | "risk_reward" | "concentration";

export interface TradePreflightRequest {
  symbol: string;
  entryPrice: number;
  /** 음수 소수(−1.5% → `-0.015`). 손절 칩이 보낸다 — 가격 환산은 서버 */
  stopLossRate?: number;
  /** 사용자가 넣은 목표가만. 비우면 빈 배열 — 시스템이 채우지 않는다(FR-151) */
  takeProfitPrices: number[];
  amount: number;
  mode: PreflightMode;
}

export interface TradePreflightView {
  symbol: string;
  mode: PreflightMode;
  orderExecution: false;
  calculation: {
    entryPrice: number;
    /** 손절 칩이면 서버가 환산한 가격. 손절 기준이 없으면 `null` */
    stopPrice: number | null;
    stopLossRate: number | null;
    takeProfitPrices: number[];
    amount: number;
    /** 목표가 · 손절 기준이 다 있어야 나온다 */
    riskRewardRatio: number | null;
    /** 원 정수. 손절 기준이 없으면 `null` — 0 이 아니다 */
    maxLossAmount: number | null;
    maxLossRate: number | null;
    /** 최대 손실 ÷ 진입 후 코인 평가금 합. 보유가 없으면(분모 0) `null` */
    maxLossOfTotalRate: number | null;
    projectedWeight: number;
    maxSingleAssetWeight: number;
  };
  portfolioImpact: {
    totalValue: number;
    existingSymbolValue: number;
    projectedTotalValue: number;
    projectedSymbolValue: number;
    projectedWeight: number;
  };
  checklist: { key: PreflightCheckKey; passed: boolean; label: string; severity: "ok" | "warning" }[];
  warnings: { code: PreflightWarningCode; severity: "info" | "warning" | "danger"; message: string }[];
  dataFreshness: { priceUpdatedAt: string | null; stale: boolean };
}
