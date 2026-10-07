/**
 * 목표 비중 안내 뷰모델 — `GET /api/app/coach/target-weights` 응답 `data` (F010 슬라이스 5 · `BFF-REQ-041`).
 *
 * BFF `target-weight.viewmodel.ts` 가 소유하는 계약의 사본이다. 비중 · 금액 · 수량 · 판정은 **전부 서버 값**이다 —
 * 화면은 표시만 한다(공통 수용 기준 3). 방향 판단 · 확률 · 기대 R 이 없다: 보유 + BTC · ETH 를 변동성만으로 나눈다.
 * `record` 는 사전등록 `target-weight@1` 8년 주간 백테스트(BTC · ETH) — 3종 고지 중 과거 성적 · 실패 사례.
 * `record.claims` 가 화면이 쓸 수 있는 문장을 정한다(서버 판정, 모르면 `false`).
 *
 * `target-weight@2`(`BFF-REQ-041` FR-4~6): 알트는 규칙 밖이다 — 보유 알트는 `excluded`(`no_record`)로만 오고
 * `altShare` 가 그 판정 기록이다. `live` 는 core 모델 포트폴리오 라이브 원장 진행, `recordSource` 가 과거 성적 자리를 정한다.
 */

/** `no_room` = 부족하지만 쓸 수 있는 돈(현금 + core 초과분)이 없어 원으로 옮기지 못했다 */
export type TargetWeightRowStatus = "under" | "over" | "at" | "no_room";
export type TargetWeightExcludedReason = "volatility_unavailable" | "price_unavailable" | "no_record";

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
  /** 부족분을 쓸 수 있는 돈 안으로 줄였다 — `gapValueKrw` · `gapQuantity` 가 줄어든 값 */
  gapCapped: boolean;
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

export interface TargetWeightAltShare {
  preregKey: string;
  /** `null` = 채택 없음 — 알트에는 목표 비중이 없다 */
  adopted: number | null;
  primaryTarget: number | null;
  /** 후보 알트 위험 몫별 ΔCalmar(core 만 대비) [점, 하한, 상한] · 연수익 */
  candidates: Array<{ altShare: number; deltaCalmar: [number, number, number]; cagr: number | null; coreCagr: number | null }>;
  /** 상장폐지 종목이 빠진 표본(알트에 유리) */
  survivorshipBias: boolean;
}

export interface TargetWeightLive {
  target: number;
  firstRebalanceAt: string | null;
  nWeeks: number;
  /** 이만큼 쌓여야 과거 성적 자리에 쓴다(등록 30) */
  minWeeks: number;
  nExcluded: number;
  cumReturn: number | null;
  btcCumReturn: number | null;
  mdd: number | null;
  btcMdd: number | null;
  upside: number | null;
  worstWeeks: Array<{ rebalanceAt: string; strategy: number; btc: number }>;
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
  excluded: Array<{ symbol: string; held: boolean; reason: TargetWeightExcludedReason; currentValueKrw: number | null }>;
  totals: {
    targetExposure: number | null;
    currentExposure: number | null;
    cashTargetWeight: number | null;
    targetBetaSum: number | null;
    betaCoveredWeight: number | null;
    lossAtStopTotalKrw: number | null;
    lossAtStopMonthlyBudgetRate: number | null;
    /** 규칙 밖 보유(알트 · σ 없는 종목) 평가금 ÷ 전체 */
    outsideRuleWeight: number | null;
    fundableKrw: number | null;
  };
  targetVolatility: number | null;
  targetVolatilityIsDefault: boolean;
  maxSingleAssetWeight: number | null;
  /** 무효화 — 다음 월요일 09:00 KST */
  expiresAt: string | null;
  volatilityAsOf: string | null;
  record: TargetWeightRecord;
  altShare: TargetWeightAltShare | null;
  live: TargetWeightLive | null;
  recordSource: "backtest" | "live";
  asOf: string | null;
}

/** `stale_inputs` — 시세 또는 변동성 배치가 멈췄다(F010 슬라이스 7) */
export type TargetWeightBlockedReason = "no_volatility" | "stale_inputs" | "disclosure_missing";

export type TargetWeightResult =
  | TargetWeightView
  | { status: "blocked"; reason: TargetWeightBlockedReason }
  | { status: "unavailable" };
