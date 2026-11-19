/**
 * 밴드 적립 계약(F003 v2 순서 3 · `BFF-REQ-020` 개정 2026-11-19 · `FE-REQ-024` FR-1).
 *
 * **계약의 주인은 BFF 다** — `bff/src/services/plan.viewmodel.ts`. `bff` 는 pnpm workspace 밖이라 같은 정의를 둘 둔다.
 * 아래 `CONTRACT` 블록은 BFF 파일과 **글자 그대로 같아야** 하고 `bff/src/services/__tests__/plan-contract.test.ts` 가 대조한다.
 *
 * 배수 · 금액 · 관문 · 3종 게이트 · 김프 비용은 전부 서버 값이다 — 화면은 표시만(공통 수용 기준 ③).
 */

// CONTRACT:BEGIN PlanView
export type PlanAsset = "btc" | "kospi";
export type PlanIndicator = "mvrv_z" | "per_percentile";
export type PlanExecutionStatus = "planned" | "executed" | "skipped";
/** 이번 주 금액이 왜 그 배수인가 — 관문 통과 · 관문 실패(정액) · 예측 회차 전(잠정 정액) · 그 주 예측 없음(정액) */
export type PlanReasonCode = "band_applied" | "gate_not_passed" | "band_pending" | "band_unavailable";
export type KimchiLevel = "low" | "normal" | "high";

/** 사전등록 밴드 한 줄 — 지표가 `below` 미만이면 이 밴드, 끝 줄은 null(그 위 전부). 코스피는 백분위 0~1 */
export interface PlanBandRule {
  key: string;
  below: number | null;
  multiplier: number;
}

/** 밴드가 틀렸던 때 — `wrong_cheap`(싸다 했는데 52주 뒤 크게 빠짐) · `wrong_expensive`(비싸다 했는데 크게 오름) · `missed_drop` */
export interface PlanFailureCase {
  decidedAt: string;
  kind: string;
  band: string;
  multiplier: number;
  /** 52주 뒤 수익률(소수 — 0.5 = +50%) */
  return52w: number;
}

export interface WeeklyPlanItemVM {
  asset: PlanAsset;
  /** 자산 아이콘 — 비트코인은 시세 목록의 로고, 코스피 · 못 받음은 null(글자 아이콘) */
  logoUrl: string | null;
  indicator: PlanIndicator | null;
  /** 설정 전이면 null */
  weeklyBaseKrw: number | null;
  /** 화면 배수 — 관문 실패면 1.0(서버 · 예측이 이미 적용) */
  multiplier: number;
  /** 1,000원 단위 서버 값. 설정 전이면 null */
  amountKrw: number | null;
  status: PlanExecutionStatus | null;
  executedKrw: number | null;
  /** false 면 예측 회차 뒤 바뀔 수 있다(잠정) */
  fixed: boolean;
  fallback: boolean;
  reasonCode: PlanReasonCode;
  basis: {
    planWeek: string;
    value: number | null;
    /** 코스피 PER 백분위(0~1). BTC 는 null */
    percentile: number | null;
    /** 코스피 월 사이 PER 추정(지난달 PER × 지수 비율) — 화면 "추정" */
    estimated: boolean;
    /** 지표 기준 날짜(코스피 = ECOS 월) */
    basisObserved: string | null;
    /** 코스피 배당수익률(표시만 — 배수에 쓰지 않는다) */
    secondaryValue: number | null;
    bandKey: string | null;
    /** 관문과 무관한 그 밴드 배수 — 관문이 꺼져 있으면 화면 배수와 다르다 */
    bandMultiplier: number | null;
    bands: PlanBandRule[];
    staleDays: number;
    computedAt: string;
  } | null;
  /** 과거 성적 — 밴드 적립 vs 같은 돈 정액, 52주 워크포워드 */
  trackRecord: {
    preregKey: string;
    gatePassed: boolean;
    gateBlockedReason: string | null;
    closedWeeks: number;
    /** 정액 대비 초과(소수 — 0.115 = +11.5%p) · 90% 구간 */
    excess: number | null;
    ciLow: number | null;
    ciHigh: number | null;
    yearsTotal: number;
    yearsPositive: number;
    windowFrom: string | null;
    windowTo: string | null;
  } | null;
  failureCases: { count: number; items: PlanFailureCase[] } | null;
  /** 3종 게이트 — false 면 밴드 카드를 그리지 않는다(금액은 그린다). 에러 아님 */
  renderable: boolean;
  blockedReason: string | null;
}

export interface WeeklyPlanVM {
  /** KST 월요일 */
  weekOf: string;
  configured: boolean;
  totalKrw: number | null;
  items: WeeklyPlanItemVM[];
  /** 없거나 오래되면 null — 금액은 그대로 유효하다 */
  kimchiPremium: { premiumPct: number; costKrwOnPlan: number | null; level: KimchiLevel; asOf: string } | null;
  streak: { weeks: number; cumulativeKrw: number; skippedLast12: number; plannedLast12: number };
  degraded: boolean;
  degradedReasons: string[];
}

export interface PlanSettingsVM {
  configured: boolean;
  /** 마지막에 넣은 값 */
  monthlyBaseKrw: number | null;
  /** 이번 주에 쓰는 값(수정은 다음 주부터) */
  currentMonthlyBaseKrw: number | null;
  pending: { monthlyBaseKrw: number; effectiveWeek: string } | null;
  startedWeek: string | null;
  allocation: Array<{ asset: PlanAsset; pct: number; weeklyBaseKrw: number | null; editable: false }>;
  bands: Array<{
    asset: PlanAsset;
    indicator: PlanIndicator | null;
    rules: PlanBandRule[];
    currentBandKey: string | null;
    editable: false;
    reasonCode: "hit_rate_on_default_band";
  }>;
  /** 월 적립액 하한 · 상한 · 단위 — 서버 설정값(화면에 숫자를 두지 않는다) */
  limits: { minKrw: number; maxKrw: number; unitKrw: number };
}

export interface MonthlySummaryVM {
  /** YYYY-MM(KST) */
  month: string;
  executedKrw: number;
  plannedKrw: number;
  monthlyBaseKrw: number | null;
  /** 계획 0 이면 null */
  progressPct: number | null;
  executedWeeks: number;
  totalWeeks: number;
  daysLeft: number;
}

/** 이번 주 적립 완료(수동 체크만 — `ADR-002`). 금액을 빼면 서버가 계획액으로 적는다 */
export interface CompleteWeeklyPlanInput {
  weekOf: string;
  executions: Array<{ asset: PlanAsset; amountKrw?: number }>;
}

export interface CompleteWeeklyPlanVM {
  weekOf: string;
  streakWeeks: number;
  cumulativeKrw: number;
}

/** 서버 거부 코드 — 문구는 화면이 고른다 */
export const PLAN_ERROR_CODE = {
  baseAmountInvalid: "PLAN_BASE_AMOUNT_INVALID",
  bandReadOnly: "PLAN_BAND_READ_ONLY",
  executionInvalid: "PLAN_EXECUTION_INVALID",
  weekNotCurrent: "PLAN_WEEK_NOT_CURRENT",
  notConfigured: "PLAN_NOT_CONFIGURED",
} as const;
// CONTRACT:END PlanView
