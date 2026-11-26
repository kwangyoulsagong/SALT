package com.salt.portfolio.application

import com.salt.portfolio.domain.BandRule
import com.salt.portfolio.domain.FailureCase
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * `plan` 응답 모양 — 옛 Express `plan/application/api/views.ts` 와 **같은 키 · 같은 순서 · 같은 null**(BFF 무변경이 합격 기준, `msa-services.md` §6).
 * 원화는 원 정수(계획 금액은 1,000원 단위), 비율은 소수(0.115 = +11.5%p). 문장 0 — 코드와 수치만, 문구는 화면.
 * 시각은 JS `toISOString()` 과 같은 글자(밀리초 3자리 · `Z`), 주 · 달은 `YYYY-MM-DD` · `YYYY-MM`.
 */
data class BasisView(
    val planWeek: String,
    val value: Double?,
    val percentile: Double?,
    /** 코스피 월 사이 PER 추정(지난달 PER × 지수 비율) — 화면 "추정" */
    val estimated: Boolean,
    val basisObserved: String?,
    /** 코스피 배당수익률(표시만) */
    val secondaryValue: Double?,
    val bandKey: String?,
    val bandMultiplier: Double?,
    val bands: List<BandRule>,
    /** 결정 주가 이번 주보다 며칠 전인가 */
    val staleDays: Long,
    val computedAt: String,
)

/** 과거 성적 — 52주 검산 관문 */
data class TrackRecordView(
    val preregKey: String,
    val gatePassed: Boolean,
    val gateBlockedReason: String?,
    val closedWeeks: Int,
    val excess: Double?,
    val ciLow: Double?,
    val ciHigh: Double?,
    val yearsTotal: Int,
    val yearsPositive: Int,
    val windowFrom: String?,
    val windowTo: String?,
)

data class FailureCasesView(val count: Int, val items: List<FailureCase>)

data class WeeklyPlanItemView(
    val asset: String,
    val indicator: String?,
    /** 설정 전이면 null */
    val weeklyBaseKrw: Long?,
    val multiplier: Double,
    val amountKrw: Long?,
    /** 이번 주 행이 있으면 그 상태, 없으면 null(설정 전 · 예측 회차 전) */
    val status: String?,
    val executedKrw: Long?,
    /** 이번 주 금액이 스냅샷으로 굳었나 — false 면 예측 회차 뒤 바뀔 수 있다 */
    val fixed: Boolean,
    val fallback: Boolean,
    /** band_applied | gate_not_passed | band_pending | band_unavailable */
    val reasonCode: String,
    val basis: BasisView?,
    val trackRecord: TrackRecordView?,
    val failureCases: FailureCasesView?,
    /** 3종 게이트 — false 면 밴드 카드를 그리지 않는다(금액은 그린다). 에러 아님 */
    val renderable: Boolean,
    val blockedReason: String?,
)

data class KimchiView(val premiumPct: Double, val costKrwOnPlan: Long?, val level: String, val asOf: String)

data class StreakView(val weeks: Int, val cumulativeKrw: Long, val skippedLast12: Int, val plannedLast12: Int)

data class WeeklyPlanView(
    val weekOf: String,
    val configured: Boolean,
    val totalKrw: Long?,
    val items: List<WeeklyPlanItemView>,
    val kimchiPremium: KimchiView?,
    val streak: StreakView,
    val degraded: Boolean,
    val degradedReasons: List<String>,
)

data class PendingView(val monthlyBaseKrw: Long, val effectiveWeek: String)

data class AllocationView(val asset: String, val pct: Double, val weeklyBaseKrw: Long?, val editable: Boolean = false)

data class BandSettingView(
    val asset: String,
    val indicator: String?,
    val rules: List<BandRule>,
    val currentBandKey: String?,
    val editable: Boolean = false,
    val reasonCode: String = "hit_rate_on_default_band",
)

data class LimitsView(val minKrw: Long, val maxKrw: Long, val unitKrw: Long)

data class PlanSettingsView(
    val configured: Boolean,
    /** 사용자가 마지막에 넣은 값 */
    val monthlyBaseKrw: Long?,
    /** 이번 주에 쓰는 값(수정은 다음 주부터) */
    val currentMonthlyBaseKrw: Long?,
    val pending: PendingView?,
    val startedWeek: String?,
    val allocation: List<AllocationView>,
    val bands: List<BandSettingView>,
    val limits: LimitsView,
)

data class MonthlySummaryView(
    val month: String,
    val executedKrw: Long,
    val plannedKrw: Long,
    val progressPct: Double?,
    val executedWeeks: Int,
    val totalWeeks: Int,
    val daysLeft: Long,
    /** 옛 응답이 요약 뒤에 붙인 키 — 순서도 같게 */
    val monthlyBaseKrw: Long?,
)

data class CompleteWeeklyPlanView(val weekOf: String, val streakWeeks: Int, val cumulativeKrw: Long)

internal val ISO_MILLIS: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

internal fun Instant.iso(): String = ISO_MILLIS.format(this)
