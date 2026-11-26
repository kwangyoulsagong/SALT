package com.salt.portfolio.api

import com.salt.portfolio.application.CompleteWeeklyPlan
import com.salt.portfolio.application.CompleteWeeklyPlanView
import com.salt.portfolio.application.ExecutionInput
import com.salt.portfolio.application.GetMonthlySummary
import com.salt.portfolio.application.GetPlanSettings
import com.salt.portfolio.application.GetWeeklyPlan
import com.salt.portfolio.application.MonthlySummaryView
import com.salt.portfolio.application.PlanSettingsView
import com.salt.portfolio.application.UpdatePlanSettings
import com.salt.portfolio.application.WeeklyPlanView
import com.salt.portfolio.domain.PlanAsset
import com.salt.portfolio.domain.ReadOnlyKeys
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import com.salt.support.web.ErrorBodies
import com.salt.support.web.FixedWindowLimit
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeParseException

/**
 * `/api/plan` — 밴드 적립(F003 v2). S4a(`SRV-REQ-049` FR-1, 2026-11-26)에 Express `plan.routes.ts` 에서 옮겼다 — 경로 · 메서드 · 응답 · 오류 코드 그대로.
 * 요청 검증 → 유스케이스 한 번 → 응답. 금액은 유스케이스가 원 정수로 낸 값 그대로.
 *
 * 본문 검증은 옛 Zod 스키마와 같은 판단(엄격 — 모르는 키 400 · 정수 · 형식)을 손으로 한다: 밴드 · 배분 키는 "모르는 키" 400 **전에** 422 로
 * 알려야 하고(FR-73), 숫자가 정수인지를 JSON 그대로 봐야 해서(바인딩이 1.5 를 잘라 받으면 안 된다). 400 바디의 `errors[].field` 는 옛 경로 표기 그대로,
 * `message` 문구는 옛 Zod 영어 문장과 다르다(BFF · 화면은 `code` · 상태만 읽는다).
 */
@Tag(name = "plan", description = "밴드 적립 — 이번 주 계획 · 완료 체크 · 월 적립액 · 이번 달 합계(SRV-REQ-020 · 021)")
@RestController
@RequestMapping("/api/plan")
class PlanController(
    private val getWeeklyPlan: GetWeeklyPlan,
    private val completeWeeklyPlan: CompleteWeeklyPlan,
    private val getPlanSettings: GetPlanSettings,
    private val updatePlanSettings: UpdatePlanSettings,
    private val getMonthlySummary: GetMonthlySummary,
    /** 쓰기 두 경로 — 사람마다 분당 30(옛 `rateLimit({ windowMs: 60_000, max: 30 })` · 키 = 사용자) */
    @param:Qualifier("planWriteLimit") private val writeLimit: FixedWindowLimit,
) {
    @Operation(summary = "이번 주 적립 계획 — 금액 · 배수 · 3종 · 김프 · 연속(빠진 지난 주는 읽을 때 채운다)")
    @GetMapping("/weekly")
    fun weekly(user: AuthenticatedUser): ResponseEntity<ApiResponse<WeeklyPlanView>> = ApiResponse.ok(getWeeklyPlan.execute(user.userId))

    @Operation(summary = "이번 주 적립 완료(수동 체크) — 금액을 생략하면 계획액, 다시 보내면 고친다")
    @PostMapping("/weekly/complete")
    fun complete(user: AuthenticatedUser, @RequestBody(required = false) body: Map<String, Any?>?): ResponseEntity<*> {
        writeLimit.acquire(user.userId)
        val issues = mutableListOf<ErrorBodies.FieldIssue>()
        val input = body ?: return invalid(listOf(ErrorBodies.FieldIssue("", REQUIRED)))
        unknownKeys(input, setOf("weekOf", "executions"), "", issues)
        // 형식만 400 — 형식은 맞는데 없는 날짜(2026-13-40)는 옛것처럼 "이번 주가 아님" 422 로 간다(유스케이스가 이번 주와 비교)
        val weekOf = (input["weekOf"] as? String)?.takeIf { WEEK.matches(it) }?.let { parseDate(it) ?: LocalDate.MIN }
        if (weekOf == null) issues += ErrorBodies.FieldIssue("weekOf", INVALID)
        val raw = input["executions"] as? List<*>
        val executions = mutableListOf<ExecutionInput>()
        if (raw == null || raw.isEmpty() || raw.size > PlanAsset.entries.size) {
            issues += ErrorBodies.FieldIssue("executions", INVALID)
        } else {
            raw.forEachIndexed { i, item ->
                val e = item as? Map<*, *>
                if (e == null) {
                    issues += ErrorBodies.FieldIssue("executions.$i", INVALID)
                    return@forEachIndexed
                }
                @Suppress("UNCHECKED_CAST")
                unknownKeys(e as Map<String, Any?>, setOf("asset", "amountKrw"), "executions.$i.", issues)
                val asset = (e["asset"] as? String)?.let { PlanAsset.of(it) }
                if (asset == null) issues += ErrorBodies.FieldIssue("executions.$i.asset", INVALID)
                val amount = if ("amountKrw" in e) integer(e["amountKrw"]) else Whole.Absent
                if (amount == Whole.Invalid) issues += ErrorBodies.FieldIssue("executions.$i.amountKrw", INVALID)
                if (asset != null && amount != Whole.Invalid) executions += ExecutionInput(asset, (amount as? Whole.Value)?.value)
            }
            if (issues.isEmpty() && executions.map { it.asset }.toSet().size != executions.size) issues += ErrorBodies.FieldIssue("executions", "자산이 겹친다")
        }
        if (issues.isNotEmpty() || weekOf == null) return invalid(issues)
        return ApiResponse.ok<CompleteWeeklyPlanView>(completeWeeklyPlan.execute(user.userId, weekOf, executions))
    }

    @Operation(summary = "적립 설정 — 없으면 configured false(200)")
    @GetMapping("/settings")
    fun settings(user: AuthenticatedUser): ResponseEntity<ApiResponse<PlanSettingsView>> = ApiResponse.ok(getPlanSettings.execute(user.userId))

    @Operation(summary = "월 적립액 저장 — 첫 저장은 이번 주부터 · 수정은 다음 주부터. 밴드 · 배분 키는 422 PLAN_BAND_READ_ONLY")
    @PatchMapping("/settings")
    fun updateSettings(user: AuthenticatedUser, @RequestBody(required = false) body: Map<String, Any?>?): ResponseEntity<*> {
        writeLimit.acquire(user.userId)
        // 밴드 · 배분 키가 오면 "모르는 키"(400) 전에 422 — 읽기 전용이라고 알린다(FR-73)
        body?.let { ReadOnlyKeys.assertNone(it.keys) }
        val input = body ?: return invalid(listOf(ErrorBodies.FieldIssue("", REQUIRED)))
        val issues = mutableListOf<ErrorBodies.FieldIssue>()
        unknownKeys(input, setOf("monthlyBaseKrw"), "", issues)
        val monthly = integer(input["monthlyBaseKrw"])
        if (monthly !is Whole.Value) issues += ErrorBodies.FieldIssue("monthlyBaseKrw", INVALID)
        if (issues.isNotEmpty() || monthly !is Whole.Value) return invalid(issues)
        return ApiResponse.ok<PlanSettingsView>(updatePlanSettings.execute(user.userId, monthly.value))
    }

    @Operation(summary = "이번 달 적립 합계 — month(YYYY-MM)를 안 주면 이번 달(KST). 오지 않은 달은 400 PLAN_MONTH_IN_FUTURE")
    @GetMapping("/monthly-summary")
    fun monthlySummary(user: AuthenticatedUser, @RequestParam(required = false) month: String?): ResponseEntity<*> {
        val parsed = when {
            month == null -> null
            MONTH.matches(month) -> YearMonth.parse(month)
            else -> return invalid(listOf(ErrorBodies.FieldIssue("month", INVALID)))
        }
        return ApiResponse.ok<MonthlySummaryView>(getMonthlySummary.execute(user.userId, parsed))
    }

    /** 정수 판정 — JSON 숫자이고 소수부가 0(옛 `z.number().int()` 는 JS 숫자라 1000.0 도 정수). Long 을 넘으면 Long.MAX(도메인 상한이 422 로 막는다) */
    private sealed interface Whole {
        data object Absent : Whole

        data object Invalid : Whole

        data class Value(val value: Long) : Whole
    }

    private fun integer(value: Any?): Whole {
        if (value !is Number) return Whole.Invalid
        val decimal = runCatching { BigDecimal(value.toString()) }.getOrNull() ?: return Whole.Invalid
        if (decimal.stripTrailingZeros().scale() > 0) return Whole.Invalid
        return Whole.Value(if (decimal > LONG_MAX) Long.MAX_VALUE else if (decimal < LONG_MIN) Long.MIN_VALUE else decimal.longValueExact())
    }

    private fun unknownKeys(body: Map<String, Any?>, allowed: Set<String>, prefix: String, issues: MutableList<ErrorBodies.FieldIssue>) {
        body.keys.filter { it !in allowed }.forEach { issues += ErrorBodies.FieldIssue("$prefix$it".trimEnd('.'), "Unrecognized key") }
    }

    private fun parseDate(text: String): LocalDate? = try {
        LocalDate.parse(text)
    } catch (_: DateTimeParseException) {
        null
    }

    private fun invalid(issues: List<ErrorBodies.FieldIssue>): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON).body(ErrorBodies.validation(issues))

    private companion object {
        val WEEK = Regex("^\\d{4}-\\d{2}-\\d{2}$")
        val MONTH = Regex("^\\d{4}-(0[1-9]|1[0-2])$")
        val LONG_MAX: BigDecimal = BigDecimal.valueOf(Long.MAX_VALUE)
        val LONG_MIN: BigDecimal = BigDecimal.valueOf(Long.MIN_VALUE)
        const val INVALID = "Invalid input"
        const val REQUIRED = "Required"
    }
}
