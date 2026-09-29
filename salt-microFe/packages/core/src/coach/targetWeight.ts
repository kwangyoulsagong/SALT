/**
 * 목표 비중 안내 뷰모델 — `GET /api/app/coach/target-weights` 응답 `data` (F010 슬라이스 5 · `BFF-REQ-040`).
 *
 * BFF `target-weight.viewmodel.ts` 가 소유하는 계약의 사본이다. 비중 · 금액 · 수량 · 판정은 **전부 서버 값**이다 —
 * 화면은 표시만 한다(공통 수용 기준 3). 방향 판단 · 확률 · 기대 R 이 없다: 보유 + BTC · ETH 를 변동성만으로 나눈다.
 * `record` 는 사전등록 `target-weight@1` 8년 주간 백테스트(BTC · ETH) — 3종 고지 중 과거 성적 · 실패 사례.
 * `record.claims` 가 화면이 쓸 수 있는 문장을 정한다(서버 판정, 모르면 `false`).
 */

export type TargetWeightRowStatus = "under" | "over" | "at";

export interface TargetWeightRow {
  symbol: string;
  held: boolean;
  /** BTC · ETH — 보유가 없어도 안내한다 */
  core: boolean;
  /** 연 변동성(0.5 = 50%) — 근거 */
  sigma: number;
  btcBeta: number | null;
  priceKrw: number;
  targetWeight: number;
  currentWeight: number;
  /** 목표 − 지금(양수 = 부족) */
  gapWeight: number;
  targetValueKrw: number;
  currentValueKrw: number;
  gapValueKrw: number;
  gapQuantity: number;
  /** `at` = 차가 최소 주문 금액(5,000원) 미만 */
  status: TargetWeightRowStatus;
  /** 무효화 — 기준가 × exp(−σ 20일) */
  stopPriceKrw: number | null;
  lossAtStopKrw: number | null;
  /** 무효화 — σ 가 이 범위를 벗어나면 다시 계산 */
  sigmaBand: { low: number; high: number } | null;
}

export interface TargetWeightMonth {
  /** `YYYY-MM` */
  month: string;
  strategy: number;
  btc: number;
  exposure: number | null;
}

export interface TargetWeightRecord {
  /** 기록의 목표 σ — 사용자 목표 σ 에 가장 가까운 등록값 */
  target: number;
  strategy: { cagr: number; vol: number; mdd: number; upside: number; exposureMean: number | null };
  holdBtc: { cagr: number; mdd: number };
  claims: { lessDrawdown: boolean; timing: boolean; targetHit: boolean };
  missedUpside: TargetWeightMonth[];
  worstMonths: TargetWeightMonth[];
  window: { from: string; to: string } | null;
  preregKey: string | null;
  feeRatePerSide: number | null;
}

export interface TargetWeightView {
  /** `no_capital` — 투자금도 보유도 없어 원으로 옮길 수 없다. 목표 비중(%)만 뜻이 있다 */
  status: "ok" | "no_capital";
  /** `crypto_value` = 투자금을 정하지 않아 코인 평가금 합을 전체로 봤다 */
  basis: "investable_capital" | "crypto_value";
  capitalKrw: number | null;
  /** 적은 투자금이 코인 보유보다 작아 보유 합을 전체로 썼다 */
  capitalBelowHoldings: boolean;
  rows: TargetWeightRow[];
  excluded: Array<{ symbol: string; held: boolean; reason: "volatility_unavailable" | "price_unavailable" }>;
  totals: {
    targetExposure: number | null;
    currentExposure: number | null;
    cashTargetWeight: number | null;
    targetBetaSum: number | null;
    betaCoveredWeight: number | null;
    lossAtStopTotalKrw: number | null;
    lossAtStopMonthlyBudgetRate: number | null;
  };
  targetVolatility: number | null;
  targetVolatilityIsDefault: boolean;
  maxSingleAssetWeight: number | null;
  /** 무효화 — 다음 월요일 09:00 KST */
  expiresAt: string | null;
  volatilityAsOf: string | null;
  record: TargetWeightRecord;
  asOf: string | null;
}

export type TargetWeightResult =
  | TargetWeightView
  | { status: "blocked"; reason: "no_volatility" | "disclosure_missing" }
  | { status: "unavailable" };
