package com.salt.portfolio.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind

/** 옛 Express `plan/domain/errors.ts` 와 같은 코드 · 종류 · 문구 · 상세 키 순서(BFF 가 `code` · `min` · `max` 를 그대로 옮긴다) */

/** 월 적립액이 정수 · 1,000원 단위 · 하한 · 상한을 어겼다(`SRV-REQ-020` FR-72) → 422 */
class PlanBaseAmountInvalid(min: Long, max: Long, unit: Long) : DomainError(
    "PLAN_BASE_AMOUNT_INVALID",
    ErrorKind.BLOCKED,
    "Monthly base amount is invalid",
    linkedMapOf("field" to "monthlyBaseKrw", "min" to min, "max" to max, "unit" to unit),
)

/** 밴드 임계 · 배수는 읽기 전용이다(D9 · FR-73) — 조용히 무시하지 않는다 → 422 */
class PlanBandReadOnly(field: String) : DomainError(
    "PLAN_BAND_READ_ONLY",
    ErrorKind.BLOCKED,
    "Band thresholds and multipliers are read-only",
    linkedMapOf("field" to field, "reasonCode" to "hit_rate_on_default_band"),
)

/** 실행 금액이 음수 · 정수 아님 · 상한(주간 기본액 × N) 초과(FR-41) → 422 */
class PlanExecutionInvalid(asset: String, max: Number) : DomainError(
    "PLAN_EXECUTION_INVALID",
    ErrorKind.BLOCKED,
    "Executed amount is invalid",
    linkedMapOf("asset" to asset, "min" to 0, "max" to max),
)

/** 이번 주가 아닌 주를 체크하려 했다 — 지난 주는 마감됐다(미실행은 사실로 남는다) → 422 */
class PlanWeekNotCurrent(currentWeek: String) : DomainError(
    "PLAN_WEEK_NOT_CURRENT",
    ErrorKind.BLOCKED,
    "Only the current week can be completed",
    linkedMapOf("currentWeek" to currentWeek),
)

/** 아직 오지 않은 달의 합계를 물었다(`SRV-REQ-021` FR-29) → 400 */
class PlanMonthInFuture(currentMonth: String) : DomainError(
    "PLAN_MONTH_IN_FUTURE",
    ErrorKind.INVALID,
    "Month is in the future",
    linkedMapOf("field" to "month", "currentMonth" to currentMonth),
)

/** 월 적립액을 정하기 전에 체크하려 했다 → 422 */
class PlanNotConfigured : DomainError("PLAN_NOT_CONFIGURED", ErrorKind.BLOCKED, "Plan settings are not configured")
