package com.salt.portfolio.domain

import java.time.Instant
import java.time.LocalDate

/**
 * 밴드 적립(`plan` — F003 v2 · `SRV-REQ-020` 개정 2026-11-19)의 값 모양. S4a(`SRV-REQ-049` FR-1, 2026-11-26)에 Express `src/plan` 에서 옮겼다 —
 * **동작 변경 0**, 응답 모양 · 금액 · 오류 코드가 옛것과 같다.
 *
 * 배수 · 밴드 · 성적 · 실패 사례 · 김프는 예측(`forecast.v_accumulation_band`)이 낸다 — 여기는 **원화 금액과 사람 기록**만.
 * 원화는 전부 원 정수(Long)다 — 중간값이 아니라 사람에게 보이는 계획 금액(최종값)이라 1,000원 단위 반올림은 [PlanMath] 한 곳(`kotlin-platform.md` §3 예외).
 */
enum class PlanAsset(val code: String) {
    BTC("btc"),
    KOSPI("kospi"),
    ;

    companion object {
        fun of(code: String): PlanAsset? = entries.firstOrNull { it.code == code }
    }
}

enum class ExecutionStatus(val code: String) {
    PLANNED("planned"),
    EXECUTED("executed"),
    SKIPPED("skipped"),
    ;

    companion object {
        fun of(code: String): ExecutionStatus = entries.first { it.code == code }
    }
}

/** 사전등록 밴드 한 줄 — [below] 미만이면 이 밴드, 끝 줄은 null(무한) */
data class BandRule(val key: String, val below: Double?, val multiplier: Double)

data class FailureCase(val decidedAt: String, val kind: String, val band: String, val multiplier: Double, val return52w: Double)

/** 예측 뷰 한 행(자산 × 결정 주). 결정 주는 KST 월요일 날짜(`plan_week` 00:00 UTC = 같은 날 09:00 KST) */
data class BandWeekRow(
    val asset: PlanAsset,
    val planWeek: LocalDate,
    val preregKey: String,
    /** mvrv_z | per_percentile — 예측 CHECK 그대로 글자로 옮긴다 */
    val indicator: String,
    val indicatorValue: Double?,
    val percentile: Double?,
    val estimated: Boolean,
    val basisObserved: Instant?,
    val secondaryValue: Double?,
    val bandKey: String?,
    val bandMultiplier: Double?,
    val gatePassed: Boolean,
    val blockedReason: String?,
    /** 화면 배수 — 관문 실패면 1.0(예측이 이미 적용) */
    val multiplier: Double,
    val closedWeeks: Int,
    val excess: Double?,
    val ciLow: Double?,
    val ciHigh: Double?,
    val yearsTotal: Int,
    val yearsPositive: Int,
    val windowFrom: Instant?,
    val windowTo: Instant?,
    val failureCases: List<FailureCase>,
    val failureCount: Int,
    val kimchiPremium: Double?,
    val kimchiAsOf: Instant?,
    val computedAt: Instant,
    val bands: List<BandRule>,
)

/** 사람 설정 한 행. 수정은 다음 주부터 — [effectiveWeek] 전 주는 [previousMonthlyBaseKrw] */
data class PlanSettingsRecord(
    val monthlyBaseKrw: Long,
    val previousMonthlyBaseKrw: Long?,
    val effectiveWeek: LocalDate,
    val startedWeek: LocalDate,
)

/** 주 × 자산 스냅샷 — "그 주 왜 그 금액이었나"(FR-23) */
data class ExecutionRecord(
    val weekOf: LocalDate,
    val asset: PlanAsset,
    val weeklyBaseKrw: Long,
    val multiplier: Double,
    val plannedKrw: Long,
    val bandKey: String?,
    val gatePassed: Boolean?,
    val blockedReason: String?,
    val preregKey: String?,
    val indicatorValue: Double?,
    val fallback: Boolean,
    val status: ExecutionStatus,
    val executedKrw: Long?,
    val recordedAt: Instant?,
)

data class Allocation(val asset: PlanAsset, val pct: Double)

/** 서버 설정값 — 코드 상수 0(정책 "임계 · 배수 · 기본액 전부 설정값"). 값은 옛 Express env 와 같은 이름 · 같은 기본값 */
data class PlanConfig(
    /** 자산별 몫(%) — 합 100. 사용자에게 읽기 전용(D9) */
    val allocation: List<Allocation>,
    val monthlyMinKrw: Long,
    val monthlyMaxKrw: Long,
    /** 실제 금액 상한 = 그 자산 주간 기본액 × 이 값(FR-41) */
    val executionCapMultiple: Double,
    val kimchiHighPct: Double,
    val kimchiLowPct: Double,
    /** 김프 값이 이보다 오래되면 숨긴다(예측 결정일 값이라 한 주 + 여유) */
    val kimchiMaxAgeDays: Int,
) {
    init {
        PlanMath.assertAllocation(allocation)
    }
}

/** 사람 설정 — 사람마다 한 행(`plan_settings`) */
interface PlanSettingsStore {
    fun get(userId: String): PlanSettingsRecord?

    /** 그 사람 설정 쓰기를 줄 세운다 — 트랜잭션 안에서만(끝나면 풀린다) */
    fun lock(userId: String)

    /** 덮어쓰기(사람마다 한 행) */
    fun save(userId: String, record: PlanSettingsRecord)
}

/** 주 × 자산 스냅샷(`weekly_plan_executions`) — 쓰기는 전부 한 문장(행마다 흩지 않는다) */
interface ExecutionStore {
    /** from 이상 to 이하, 주 · 자산 오름차순 */
    fun list(userId: String, fromWeek: LocalDate, toWeek: LocalDate): List<ExecutionRecord>

    /** 없으면 넣기(같은 주 · 자산이 있으면 그대로 — 처음 만든 스냅샷을 지킨다) */
    fun insertMissing(userId: String, rows: List<ExecutionRecord>)

    /** beforeWeek 전 `planned` → `skipped`(미실행 마감) */
    fun closeBefore(userId: String, beforeWeek: LocalDate)

    /** 그 주 자산들을 실행으로(덮어쓰기 — 금액 고침 허용) */
    fun markExecuted(userId: String, weekOf: LocalDate, items: List<Pair<PlanAsset, Long>>, at: Instant)
}

/** 예측 밴드 뷰(`forecast.v_accumulation_band` · `_week`) — 서버는 뷰로만 읽는다 */
interface BandReader {
    /** 자산마다 가장 최근 결정 주 한 행 */
    fun latest(): List<BandWeekRow>

    /** 결정 주 from 이상 to 이하(KST 월요일 날짜) */
    fun weeks(fromWeek: LocalDate, toWeek: LocalDate): List<BandWeekRow>
}
