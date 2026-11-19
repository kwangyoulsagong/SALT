import { DomainError, ErrorKind } from "../../shared/domain";

/** 월 적립액이 정수 · 1,000원 단위 · 하한 · 상한을 어겼다(`SRV-REQ-020` FR-72) → 422 */
export class PlanBaseAmountInvalidError extends DomainError {
  constructor(min: number, max: number, unit: number) {
    super("PLAN_BASE_AMOUNT_INVALID", ErrorKind.Blocked, "Monthly base amount is invalid", {
      field: "monthlyBaseKrw",
      min,
      max,
      unit,
    });
  }
}

/** 밴드 임계 · 배수는 읽기 전용이다(D9 · FR-73) — 조용히 무시하지 않는다 → 422 */
export class PlanBandReadOnlyError extends DomainError {
  constructor(field: string) {
    super("PLAN_BAND_READ_ONLY", ErrorKind.Blocked, "Band thresholds and multipliers are read-only", {
      field,
      reasonCode: "hit_rate_on_default_band",
    });
  }
}

/** 실행 금액이 음수 · 정수 아님 · 상한(주간 기본액 × N) 초과(FR-41) → 422 */
export class PlanExecutionInvalidError extends DomainError {
  constructor(asset: string, max: number) {
    super("PLAN_EXECUTION_INVALID", ErrorKind.Blocked, "Executed amount is invalid", { asset, min: 0, max });
  }
}

/** 이번 주가 아닌 주를 체크하려 했다 — 지난 주는 마감됐다(미실행은 사실로 남는다) → 422 */
export class PlanWeekNotCurrentError extends DomainError {
  constructor(currentWeek: string) {
    super("PLAN_WEEK_NOT_CURRENT", ErrorKind.Blocked, "Only the current week can be completed", { currentWeek });
  }
}

/** 월 적립액을 정하기 전에 체크하려 했다 → 422 */
export class PlanNotConfiguredError extends DomainError {
  constructor() {
    super("PLAN_NOT_CONFIGURED", ErrorKind.Blocked, "Plan settings are not configured");
  }
}
