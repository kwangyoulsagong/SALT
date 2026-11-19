/**
 * `plan` 의 값 모양(F003 v2 · `SRV-REQ-020` 개정 2026-11-19).
 *
 * 배수 · 밴드 · 성적 · 실패 사례 · 김프는 예측(`forecast.v_accumulation_band`)이 낸다 — 여기는 **원화 금액과 사람 기록**만.
 * 원화는 전부 원 정수다(1,000원 단위 반올림은 `policy/amount`).
 */

/** 밴드 적립 자산 — 예측 `accumulation_band.asset` 과 같은 글자 */
export const PLAN_ASSETS = ["btc", "kospi"] as const;
export type PlanAsset = (typeof PLAN_ASSETS)[number];

export type ExecutionStatus = "planned" | "executed" | "skipped";

/** 예측 관문 사유(`band-accumulation@2` 사전등록) */
export type BandBlockedReason = "insufficient_sample" | "not_better_than_flat" | "stale_inputs";

/** 사전등록 밴드 한 줄 — `below` 미만이면 이 밴드, 끝 줄은 null(무한) */
export interface BandRule {
  key: string;
  below: number | null;
  multiplier: number;
}

export interface FailureCase {
  decidedAt: string;
  kind: string;
  band: string;
  multiplier: number;
  return52w: number;
}

/** 예측 뷰 한 행(자산 × 결정 주). 결정 주는 KST 월요일 날짜(`plan_week` 00:00 UTC = 같은 날 09:00 KST) */
export interface BandWeekRow {
  asset: PlanAsset;
  planWeek: string;
  preregKey: string;
  indicator: "mvrv_z" | "per_percentile";
  indicatorValue: number | null;
  percentile: number | null;
  estimated: boolean;
  basisObserved: Date | null;
  secondaryValue: number | null;
  bandKey: string | null;
  bandMultiplier: number | null;
  gatePassed: boolean;
  blockedReason: BandBlockedReason | null;
  /** 화면 배수 — 관문 실패면 1.0(예측이 이미 적용) */
  multiplier: number;
  closedWeeks: number;
  excess: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  yearsTotal: number;
  yearsPositive: number;
  windowFrom: Date | null;
  windowTo: Date | null;
  failureCases: FailureCase[];
  failureCount: number;
  kimchiPremium: number | null;
  kimchiAsOf: Date | null;
  computedAt: Date;
  bands: BandRule[];
}

/** 사람 설정 한 행. 수정은 다음 주부터 — `effectiveWeek` 전 주는 `previousMonthlyBaseKrw` */
export interface PlanSettingsRecord {
  monthlyBaseKrw: number;
  previousMonthlyBaseKrw: number | null;
  effectiveWeek: string;
  startedWeek: string;
}

/** 주 × 자산 스냅샷 — "그 주 왜 그 금액이었나"(FR-23) */
export interface ExecutionRecord {
  weekOf: string;
  asset: PlanAsset;
  weeklyBaseKrw: number;
  multiplier: number;
  plannedKrw: number;
  bandKey: string | null;
  gatePassed: boolean | null;
  blockedReason: string | null;
  preregKey: string | null;
  indicatorValue: number | null;
  fallback: boolean;
  status: ExecutionStatus;
  executedKrw: number | null;
  recordedAt: Date | null;
}

/** 서버 설정값 — 코드 상수 0(정책 "임계 · 배수 · 기본액 전부 설정값") */
export interface PlanConfig {
  /** 자산별 몫(%) — 합 100. 사용자에게 읽기 전용(D9) */
  allocation: ReadonlyArray<{ asset: PlanAsset; pct: number }>;
  monthlyMinKrw: number;
  monthlyMaxKrw: number;
  /** 실제 금액 상한 = 그 자산 주간 기본액 × 이 값(FR-41) */
  executionCapMultiple: number;
  kimchiHighPct: number;
  kimchiLowPct: number;
  /** 김프 값이 이보다 오래되면 숨긴다(예측 결정일 값이라 한 주 + 여유) */
  kimchiMaxAgeDays: number;
}
