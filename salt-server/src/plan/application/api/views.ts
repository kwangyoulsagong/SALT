/**
 * `plan` 응답 모양 — 도메인 타입을 담지 않는다. 원화는 원 정수(계획 금액은 1,000원 단위), 비율은 소수(0.115 = +11.5%p).
 * 문장 0 — 코드와 수치만, 문구는 화면(`SRV-REQ-020` FR-63 · 83).
 */
import type { BandCardBlockedReason, BandRule, ExecutionStatus, FailureCase, PlanAsset } from "../../domain";

export type WeeklyReasonCode =
  /** 관문 통과 — 밴드 배수 적용 */
  | "band_applied"
  /** 관문 실패 — 정액(밴드 효과 미검증) */
  | "gate_not_passed"
  /** 이번 주 예측 회차 전 — 지금은 정액, 회차 뒤 바뀔 수 있다(아직 스냅샷 아님) */
  | "band_pending"
  /** 그 주 예측 행이 없어 정액으로 굳힌 주 */
  | "band_unavailable";

export interface WeeklyPlanItemView {
  asset: PlanAsset;
  indicator: "mvrv_z" | "per_percentile" | null;
  /** 설정 전이면 null */
  weeklyBaseKrw: number | null;
  multiplier: number;
  amountKrw: number | null;
  /** 이번 주 행이 있으면 그 상태, 없으면 null(설정 전 · 예측 회차 전) */
  status: ExecutionStatus | null;
  executedKrw: number | null;
  /** 이번 주 금액이 스냅샷으로 굳었나 — false 면 예측 회차 뒤 바뀔 수 있다 */
  fixed: boolean;
  fallback: boolean;
  reasonCode: WeeklyReasonCode;
  /** 근거 — 지표 · 밴드(관문과 무관한 밴드 배수) · 사전등록 밴드 표 */
  basis: {
    planWeek: string;
    value: number | null;
    percentile: number | null;
    /** 코스피 월 사이 PER 추정(지난달 PER × 지수 비율) — 화면 "추정" */
    estimated: boolean;
    basisObserved: string | null;
    /** 코스피 배당수익률(표시만) */
    secondaryValue: number | null;
    bandKey: string | null;
    bandMultiplier: number | null;
    bands: BandRule[];
    /** 결정 주가 이번 주보다 며칠 전인가 */
    staleDays: number;
    computedAt: string;
  } | null;
  /** 과거 성적 — 52주 검산 관문 */
  trackRecord: {
    preregKey: string;
    gatePassed: boolean;
    gateBlockedReason: string | null;
    closedWeeks: number;
    excess: number | null;
    ciLow: number | null;
    ciHigh: number | null;
    yearsTotal: number;
    yearsPositive: number;
    windowFrom: string | null;
    windowTo: string | null;
  } | null;
  failureCases: { count: number; items: FailureCase[] } | null;
  /** 3종 게이트 — false 면 밴드 카드를 그리지 않는다(금액은 그린다). 에러 아님 */
  renderable: boolean;
  blockedReason: BandCardBlockedReason | null;
}

export interface WeeklyPlanView {
  weekOf: string;
  configured: boolean;
  totalKrw: number | null;
  items: WeeklyPlanItemView[];
  kimchiPremium: { premiumPct: number; costKrwOnPlan: number | null; level: "low" | "normal" | "high"; asOf: string } | null;
  streak: { weeks: number; cumulativeKrw: number; skippedLast12: number; plannedLast12: number };
  degraded: boolean;
  degradedReasons: Array<"band_pending" | "band_unavailable" | "kimchi_unavailable">;
}

export interface PlanSettingsView {
  configured: boolean;
  /** 사용자가 마지막에 넣은 값 */
  monthlyBaseKrw: number | null;
  /** 이번 주에 쓰는 값(수정은 다음 주부터) */
  currentMonthlyBaseKrw: number | null;
  pending: { monthlyBaseKrw: number; effectiveWeek: string } | null;
  startedWeek: string | null;
  allocation: Array<{ asset: PlanAsset; pct: number; weeklyBaseKrw: number | null; editable: false }>;
  bands: Array<{
    asset: PlanAsset;
    indicator: "mvrv_z" | "per_percentile" | null;
    rules: BandRule[];
    currentBandKey: string | null;
    editable: false;
    reasonCode: "hit_rate_on_default_band";
  }>;
  limits: { minKrw: number; maxKrw: number; unitKrw: number };
}

export interface MonthlySummaryView {
  month: string;
  executedKrw: number;
  plannedKrw: number;
  monthlyBaseKrw: number | null;
  progressPct: number | null;
  executedWeeks: number;
  totalWeeks: number;
  daysLeft: number;
}

export interface CompleteWeeklyPlanView {
  weekOf: string;
  streakWeeks: number;
  cumulativeKrw: number;
}
