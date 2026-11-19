/**
 * 밴드 적립 뷰모델(F003 v2 순서 3 · `BFF-REQ-019`~`021` 개정 2026-11-19) — **순수 함수**. 배수 · 금액 · 관문 · 3종 게이트 · 김프 비용은
 * 서버(`/api/plan/*`)가 낸 값 그대로다. 여기서는 모양을 지키고(fail-closed), 모르는 자산 · 모르는 코드를 거르기만 한다.
 *
 * - 게이트(`renderable`)를 판정하지 않는다 — 서버 값이 `true` 일 때만 `true`(없거나 다른 값이면 `false` + `degradedReasons` 에 `gate_missing`)
 * - 금액 `null` 을 0 으로 바꾸지 않는다(설정 전 · 예측 전) · 배수 `0` 을 `null` 로 바꾸지 않는다
 * - 문장 0 — 코드와 수치만. 문구는 화면(`entities/plan/model/messages`)
 *
 * ## 정의가 두 벌이다 — 포지션 계약과 같은 방법
 *
 * `bff` 는 pnpm workspace 밖이라 `@repo/core` 를 import 하지 못한다. 같은 정의를 `salt-microFe/packages/core/src/plan/plan.ts`
 * 에 두고 `__tests__/plan-contract.test.ts` 가 아래 `CONTRACT` 블록을 글자 그대로 대조한다.
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

export const PLAN_ASSET_LIST: readonly PlanAsset[] = ["btc", "kospi"];
const REASON_CODES: readonly PlanReasonCode[] = ["band_applied", "gate_not_passed", "band_pending", "band_unavailable"];
const STATUSES: readonly PlanExecutionStatus[] = ["planned", "executed", "skipped"];
const INDICATORS: readonly PlanIndicator[] = ["mvrv_z", "per_percentile"];
const KIMCHI_LEVELS: readonly KimchiLevel[] = ["low", "normal", "high"];

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;

export const isPlanAsset = (v: unknown): v is PlanAsset => oneOf(PLAN_ASSET_LIST, v) !== null;

const toBands = (v: unknown): PlanBandRule[] =>
  (Array.isArray(v) ? v : []).flatMap((row) => {
    if (!isObject(row) || typeof row.key !== "string") return [];
    const multiplier = num(row.multiplier);
    if (multiplier === null) return [];
    return [{ key: row.key, below: num(row.below), multiplier }];
  });

const toFailureCases = (v: unknown): WeeklyPlanItemVM["failureCases"] => {
  if (!isObject(v)) return null;
  const items = (Array.isArray(v.items) ? v.items : []).flatMap((c): PlanFailureCase[] => {
    if (!isObject(c)) return [];
    const decidedAt = str(c.decidedAt);
    const multiplier = num(c.multiplier);
    const return52w = num(c.return52w);
    if (decidedAt === null || multiplier === null || return52w === null || typeof c.kind !== "string" || typeof c.band !== "string") return [];
    return [{ decidedAt, kind: c.kind, band: c.band, multiplier, return52w }];
  });
  return { count: num(v.count) ?? items.length, items };
};

const toBasis = (v: unknown): WeeklyPlanItemVM["basis"] => {
  if (!isObject(v)) return null;
  const planWeek = str(v.planWeek);
  const computedAt = str(v.computedAt);
  if (planWeek === null || computedAt === null) return null;
  return {
    planWeek,
    value: num(v.value),
    percentile: num(v.percentile),
    estimated: v.estimated === true,
    basisObserved: str(v.basisObserved),
    secondaryValue: num(v.secondaryValue),
    bandKey: str(v.bandKey),
    bandMultiplier: num(v.bandMultiplier),
    bands: toBands(v.bands),
    staleDays: num(v.staleDays) ?? 0,
    computedAt,
  };
};

const toTrackRecord = (v: unknown): WeeklyPlanItemVM["trackRecord"] => {
  if (!isObject(v) || typeof v.preregKey !== "string") return null;
  return {
    preregKey: v.preregKey,
    gatePassed: v.gatePassed === true,
    gateBlockedReason: str(v.gateBlockedReason),
    closedWeeks: num(v.closedWeeks) ?? 0,
    excess: num(v.excess),
    ciLow: num(v.ciLow),
    ciHigh: num(v.ciHigh),
    yearsTotal: num(v.yearsTotal) ?? 0,
    yearsPositive: num(v.yearsPositive) ?? 0,
    windowFrom: str(v.windowFrom),
    windowTo: str(v.windowTo),
  };
};

/** 한 자산 — 모르는 자산 · 배수 없음은 싣지 않는다(근거 없는 금액). 게이트 필드가 없으면 닫는다(fail-closed) */
const toItem = (v: unknown, reasons: Set<string>, logos: ReadonlyMap<PlanAsset, string>): WeeklyPlanItemVM | null => {
  if (!isObject(v)) return null;
  const asset = oneOf(PLAN_ASSET_LIST, v.asset);
  const multiplier = num(v.multiplier);
  const reasonCode = oneOf(REASON_CODES, v.reasonCode);
  if (asset === null || multiplier === null || reasonCode === null) {
    reasons.add("item_dropped");
    return null;
  }
  const gateKnown = typeof v.renderable === "boolean";
  if (!gateKnown) reasons.add("gate_missing");
  return {
    asset,
    logoUrl: logos.get(asset) ?? null,
    indicator: oneOf(INDICATORS, v.indicator),
    weeklyBaseKrw: num(v.weeklyBaseKrw),
    multiplier,
    amountKrw: num(v.amountKrw),
    status: oneOf(STATUSES, v.status),
    executedKrw: num(v.executedKrw),
    fixed: v.fixed === true,
    fallback: v.fallback === true,
    reasonCode,
    basis: toBasis(v.basis),
    trackRecord: toTrackRecord(v.trackRecord),
    failureCases: toFailureCases(v.failureCases),
    renderable: v.renderable === true,
    blockedReason: gateKnown ? str(v.blockedReason) : "gate_missing",
  };
};

const toKimchi = (v: unknown): WeeklyPlanVM["kimchiPremium"] => {
  if (!isObject(v)) return null;
  const premiumPct = num(v.premiumPct);
  const level = oneOf(KIMCHI_LEVELS, v.level);
  const asOf = str(v.asOf);
  if (premiumPct === null || level === null || asOf === null) return null;
  return { premiumPct, costKrwOnPlan: num(v.costKrwOnPlan), level, asOf };
};

/** `GET /api/plan/weekly` → 뷰모델. 서버 `degraded` 는 지우지 않고 BFF 가 거른 사유를 덧붙인다. 로고는 BFF 가 시세 목록에서 붙인 것 */
export const toWeeklyPlanViewModel = (server: unknown, logos: ReadonlyMap<PlanAsset, string> = new Map()): WeeklyPlanVM => {
  const s = isObject(server) ? server : {};
  const reasons = new Set<string>(Array.isArray(s.degradedReasons) ? s.degradedReasons.filter((r): r is string => typeof r === "string") : []);
  const items = (Array.isArray(s.items) ? s.items : []).map((i) => toItem(i, reasons, logos)).filter((i): i is WeeklyPlanItemVM => i !== null);
  const streak = isObject(s.streak) ? s.streak : {};
  return {
    weekOf: str(s.weekOf) ?? "",
    configured: s.configured === true,
    totalKrw: num(s.totalKrw),
    items,
    kimchiPremium: toKimchi(s.kimchiPremium),
    streak: {
      weeks: num(streak.weeks) ?? 0,
      cumulativeKrw: num(streak.cumulativeKrw) ?? 0,
      skippedLast12: num(streak.skippedLast12) ?? 0,
      plannedLast12: num(streak.plannedLast12) ?? 0,
    },
    degraded: s.degraded === true || reasons.size > 0,
    degradedReasons: [...reasons],
  };
};

/** `GET · PATCH /api/plan/settings` → 뷰모델. `editable` 은 리터럴 false — 서버가 다른 값을 줘도 입력 칸 근거가 되지 않는다 */
export const toPlanSettingsViewModel = (server: unknown): PlanSettingsVM => {
  const s = isObject(server) ? server : {};
  const pending = isObject(s.pending) && num(s.pending.monthlyBaseKrw) !== null && str(s.pending.effectiveWeek) !== null
    ? { monthlyBaseKrw: s.pending.monthlyBaseKrw as number, effectiveWeek: s.pending.effectiveWeek as string }
    : null;
  const limits = isObject(s.limits) ? s.limits : {};
  return {
    configured: s.configured === true,
    monthlyBaseKrw: num(s.monthlyBaseKrw),
    currentMonthlyBaseKrw: num(s.currentMonthlyBaseKrw),
    pending,
    startedWeek: str(s.startedWeek),
    allocation: (Array.isArray(s.allocation) ? s.allocation : []).flatMap((a) => {
      if (!isObject(a) || !isPlanAsset(a.asset) || num(a.pct) === null) return [];
      return [{ asset: a.asset, pct: a.pct as number, weeklyBaseKrw: num(a.weeklyBaseKrw), editable: false as const }];
    }),
    bands: (Array.isArray(s.bands) ? s.bands : []).flatMap((b) => {
      if (!isObject(b) || !isPlanAsset(b.asset)) return [];
      return [{
        asset: b.asset,
        indicator: oneOf(INDICATORS, b.indicator),
        rules: toBands(b.rules),
        currentBandKey: str(b.currentBandKey),
        editable: false as const,
        reasonCode: "hit_rate_on_default_band" as const,
      }];
    }),
    limits: { minKrw: num(limits.minKrw) ?? 0, maxKrw: num(limits.maxKrw) ?? 0, unitKrw: num(limits.unitKrw) ?? 0 },
  };
};

export const toMonthlySummaryViewModel = (server: unknown): MonthlySummaryVM => {
  const s = isObject(server) ? server : {};
  return {
    month: str(s.month) ?? "",
    executedKrw: num(s.executedKrw) ?? 0,
    plannedKrw: num(s.plannedKrw) ?? 0,
    monthlyBaseKrw: num(s.monthlyBaseKrw),
    progressPct: num(s.progressPct),
    executedWeeks: num(s.executedWeeks) ?? 0,
    totalWeeks: num(s.totalWeeks) ?? 0,
    daysLeft: num(s.daysLeft) ?? 0,
  };
};

export const toCompleteWeeklyPlanViewModel = (server: unknown): CompleteWeeklyPlanVM => {
  const s = isObject(server) ? server : {};
  return { weekOf: str(s.weekOf) ?? "", streakWeeks: num(s.streakWeeks) ?? 0, cumulativeKrw: num(s.cumulativeKrw) ?? 0 };
};
