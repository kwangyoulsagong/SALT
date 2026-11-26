package com.salt.portfolio.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters

/**
 * 금액 — 기본액 환산 · 배수 · 1,000원 반올림(`SRV-REQ-020` FR-5 · FR-70~72 · 공통 수용 기준 3 "금액은 서버").
 * **계산은 BigDecimal, 결과는 원 정수.** 나눗셈은 몫을 바로 원하는 자리에서 한 번 반올림한다(중간 정밀도 0 — 옛 Express Decimal 20자리보다 정확하고,
 * 같은 입력이면 같은 값: 1,000원 경계에 정확히 걸리는 값은 둘 다 유한소수라 같다).
 */
object PlanMath {
    const val UNIT_KRW: Long = 1000
    private val UNIT = BigDecimal.valueOf(UNIT_KRW)
    private val HUNDRED = BigDecimal.valueOf(100)

    /** 1,000원 단위 반올림(0.5 는 올림) — 이미 정확한 값 */
    fun roundToUnit(value: BigDecimal): Long = value.divide(UNIT, 0, RoundingMode.HALF_UP).multiply(UNIT).longValueExact()

    /** 월 적립액 검증 — 정수 · 1,000원 단위 · 하한 · 상한(설정값). 어기면 422 `PLAN_BASE_AMOUNT_INVALID`(FR-72) */
    fun assertMonthlyBase(value: Long, config: PlanConfig) {
        val ok = value % UNIT_KRW == 0L && value >= config.monthlyMinKrw && value <= config.monthlyMaxKrw
        if (!ok) throw PlanBaseAmountInvalid(config.monthlyMinKrw, config.monthlyMaxKrw, UNIT_KRW)
    }

    /** 배분 검증 — 자산이 겹치지 않고 몫 합이 100. 기동 때 한 번(설정 오류는 서버가 뜨지 않게) */
    fun assertAllocation(allocation: List<Allocation>) {
        val sum = allocation.fold(BigDecimal.ZERO) { s, a -> s + BigDecimal.valueOf(a.pct) }
        require(allocation.map { it.asset }.toSet().size == allocation.size && sum.compareTo(HUNDRED) == 0 && allocation.none { it.pct < 0 }) {
            "적립 배분이 틀렸다 — 자산 중복 없이 몫 합 100 이어야 한다: $allocation"
        }
    }

    /** 주간 기본액 = 자산 월 몫 × 12 ÷ 52, 1,000원 반올림(FR-71). 월 1,300,000 · 50% → 150,000 */
    fun weeklyBaseKrw(monthlyKrw: Long, pct: Double): Long =
        BigDecimal.valueOf(monthlyKrw).multiply(BigDecimal.valueOf(pct)).multiply(BigDecimal.valueOf(12))
            .divide(BigDecimal.valueOf(100L * 52 * UNIT_KRW), 0, RoundingMode.HALF_UP).multiply(UNIT).longValueExact()

    /** 그 주에 쓰는 월 적립액 — 수정은 다음 주부터(FR-75) */
    fun monthlyForWeek(settings: PlanSettingsRecord, weekOf: LocalDate): Long =
        if (weekOf >= settings.effectiveWeek) settings.monthlyBaseKrw else settings.previousMonthlyBaseKrw ?: settings.monthlyBaseKrw

    /** 그 주 자산 기본액 */
    fun weeklyBaseFor(settings: PlanSettingsRecord, weekOf: LocalDate, asset: PlanAsset, allocation: List<Allocation>): Long =
        weeklyBaseKrw(monthlyForWeek(settings, weekOf), allocation.firstOrNull { it.asset == asset }?.pct ?: 0.0)

    /** 이번 주 계획 금액 = 기본액 × 배수, 1,000원 반올림(FR-5). 배수 0 이면 0 */
    fun plannedKrw(weeklyBase: Long, multiplier: Double): Long =
        roundToUnit(BigDecimal.valueOf(weeklyBase).multiply(BigDecimal.valueOf(multiplier)))
}

/**
 * 주 경계(`SRV-REQ-020` FR-30 · 31) — `weekOf` = 그 주의 **KST 월요일** 날짜. 일요일 23:59 KST 는 그 주, 월요일 00:00 KST 는 다음 주.
 * 날짜 산술은 달력 날짜라 서버 tz 와 무관하다.
 */
object PlanWeeks {
    val KST: ZoneId = ZoneId.of("Asia/Seoul")

    fun kstDate(now: Instant): LocalDate = now.atZone(KST).toLocalDate()

    fun mondayOf(date: LocalDate): LocalDate = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

    fun weekOfKst(now: Instant): LocalDate = mondayOf(kstDate(now))

    /** from 이상 to 미만의 월요일들(둘 다 월요일) */
    fun weeksBetween(from: LocalDate, to: LocalDate): List<LocalDate> =
        generateSequence(from) { it.plusWeeks(1) }.takeWhile { it < to }.toList()

    /** 그 달에 속한 월요일(귀속 달 = 월요일의 달 — `DB-REQ-013` FR-16) */
    fun mondaysInMonth(month: YearMonth): List<LocalDate> {
        val first = month.atDay(1)
        val firstMonday = first.with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY))
        return weeksBetween(firstMonday, month.atEndOfMonth().plusDays(1))
    }

    /** 두 날짜 사이 일수(b − a) */
    fun daysBetween(a: LocalDate, b: LocalDate): Long = ChronoUnit.DAYS.between(a, b)
}

/** 밴드 카드 — 3종(근거 · 과거 성적 · 실패 사례) 렌더 게이트와 김프(`SRV-REQ-020` FR-10~12 · FR-50~54 · 공통 수용 기준 1) */
object BandCard {
    data class Gate(val renderable: Boolean, val blockedReason: String?)

    /** 게이트 차단은 에러가 아니다 — `renderable: false` + 사유. 금액은 막지 않는다(FR-22 — 기본액은 늘 보인다) */
    fun gate(band: BandWeekRow?): Gate {
        val reason = when {
            band == null -> "band_missing"
            band.indicatorValue == null || band.bandKey == null -> "indicator_missing"
            band.closedWeeks <= 0 || band.excess == null || band.ciLow == null || band.ciHigh == null -> "track_record_missing"
            band.failureCount <= 0 || band.failureCases.isEmpty() -> "failure_cases_missing"
            else -> null
        }
        return Gate(reason == null, reason)
    }

    data class Kimchi(val premiumPct: Double, val costKrwOnPlan: Long?, val level: String, val asOf: Instant)

    /** 김프 — 값이 없거나 오래되면 null(게이지만 숨김, 금액은 유지 — FR-54). 문장은 화면 몫(사실 서술 코드만) */
    fun kimchi(band: BandWeekRow?, btcPlannedKrw: Long?, now: Instant, config: PlanConfig): Kimchi? {
        val premium = band?.kimchiPremium ?: return null
        val asOf = band.kimchiAsOf ?: return null
        if (!premium.isFinite()) return null
        if (PlanWeeks.daysBetween(PlanWeeks.kstDate(asOf), PlanWeeks.kstDate(now)) > config.kimchiMaxAgeDays) return null
        val p = BigDecimal.valueOf(premium)
        val pct = p.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP).toDouble()
        val level = if (pct >= config.kimchiHighPct) "high" else if (pct <= config.kimchiLowPct) "low" else "normal"
        // 금액 × p ÷ (1 + p) — 음수면 싸게 사는 몫. 원 단위 한 번 반올림
        val cost = btcPlannedKrw?.let { BigDecimal.valueOf(it).multiply(p).divide(p.add(BigDecimal.ONE), 0, RoundingMode.HALF_UP).longValueExact() }
        return Kimchi(pct, cost, level, asOf)
    }
}

/** 실행 기록 — 수동 체크만(`SRV-REQ-020` FR-40~45 · ADR-002). 원장 · 보유 거래를 보지 않는다. 점수 · 등급 · 평가 문구 0 */
object Executions {
    /** 실제 금액 — 생략하면 계획액. 0 이상 · 주간 기본액 × N 이하(FR-41) */
    fun executedAmount(row: ExecutionRecord, amountKrw: Long?, capMultiple: Double): Long {
        val max = BigDecimal.valueOf(row.weeklyBaseKrw).multiply(BigDecimal.valueOf(capMultiple))
        val value = amountKrw ?: row.plannedKrw
        if (value < 0 || BigDecimal.valueOf(value) > max) throw PlanExecutionInvalid(row.asset.code, plainNumber(max))
        return value
    }

    data class Streak(val weeks: Int, val cumulativeKrw: Long, val skippedLast12: Int, val plannedLast12: Int)

    /** 연속 실행 주 — 이번 주를 아직 안 했으면 지난 주부터 센다(이번 주는 끝나지 않았다). 지난 12주(이번 주 제외) 미실행 · 계획 있던 주 */
    fun streakOf(rows: List<ExecutionRecord>, currentWeek: LocalDate): Streak {
        val executed = rows.filter { it.status == ExecutionStatus.EXECUTED }
        val executedWeeks = executed.map { it.weekOf }.toSet()
        val plannedWeeks = rows.map { it.weekOf }.toSet()
        var weeks = 0
        var w = if (currentWeek in executedWeeks) currentWeek else currentWeek.minusWeeks(1)
        while (w in executedWeeks) {
            weeks += 1
            w = w.minusWeeks(1)
        }
        val last12 = (1L..12L).map { currentWeek.minusWeeks(it) }.filter { it in plannedWeeks }
        return Streak(weeks, executed.sumOf { it.executedKrw ?: 0L }, last12.count { it !in executedWeeks }, last12.size)
    }

    /** 오류 상세의 상한 — 정수면 정수로(옛 JS 숫자와 같은 JSON) */
    private fun plainNumber(value: BigDecimal): Number =
        if (value.stripTrailingZeros().scale() <= 0) value.toBigInteger().toLong() else value.toDouble()
}

/** 이번 달 적립 합계(`SRV-REQ-020` FR-80~83) — 귀속 달 = `weekOf`(KST 월요일)의 달. 금액 · 진행률 · 남은 일수 전부 서버. 평가 문구 0 */
object MonthlySummaries {
    data class Summary(
        val month: YearMonth,
        val executedKrw: Long,
        val plannedKrw: Long,
        /** 0~100 소수 1자리 — 계획 0 이면 null */
        val progressPct: Double?,
        val executedWeeks: Int,
        /** 그 달 월요일 중 시작 주 이후 */
        val totalWeeks: Int,
        /** 오늘(KST)부터 말일까지 — 지난 달이면 0, 다음 달이면 그 달 일수 */
        val daysLeft: Long,
    )

    fun of(month: YearMonth, today: LocalDate, startedWeek: LocalDate?, rows: List<ExecutionRecord>): Summary {
        val first = month.atDay(1)
        val last = month.atEndOfMonth()
        val inMonth = rows.filter { it.weekOf >= first && it.weekOf <= last }
        val executed = inMonth.filter { it.status == ExecutionStatus.EXECUTED }
        val executedKrw = executed.sumOf { it.executedKrw ?: 0L }
        val plannedKrw = inMonth.sumOf { it.plannedKrw }
        val progress = if (plannedKrw == 0L) {
            null
        } else {
            BigDecimal.valueOf(executedKrw).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(plannedKrw), 1, RoundingMode.HALF_UP).toDouble()
        }
        val totalWeeks = startedWeek?.let { s -> PlanWeeks.mondaysInMonth(month).count { it >= s } } ?: 0
        val daysLeft = if (today > last) 0 else PlanWeeks.daysBetween(if (today < first) first else today, last) + 1
        return Summary(month, executedKrw, plannedKrw, progress, executed.map { it.weekOf }.toSet().size, totalWeeks, daysLeft)
    }
}

/** 설정 저장 본문에 오면 422 `PLAN_BAND_READ_ONLY` 인 키(`SRV-REQ-020` FR-73 · D9) — 조용히 무시하지 않는다. 배분도 읽기 전용 */
object ReadOnlyKeys {
    val KEYS: List<String> = listOf("bandConfig", "bands", "thresholds", "multipliers", "multiplier", "allocation")

    fun assertNone(keys: Set<String>) {
        KEYS.firstOrNull { it in keys }?.let { throw PlanBandReadOnly(it) }
    }
}

/**
 * 주 계획 스냅샷 · 채움 — 그 주 예측 행이 있으면 그 배수, 없으면 정액(1.0) + `fallback`(`SRV-REQ-020` FR-20 · 22 · 23 · 32).
 * **배수를 서버가 다시 판정하지 않는다** — 관문 · 밴드는 예측(`band-accumulation@2`)이 낸다. 여기는 그 값을 믿을지(범위 0~3 · 관문 실패면 1.0)만 지킨다.
 * 같은 주 · 자산 한 행이고 처음 만든 값을 지킨다(멱등).
 */
object WeekPlans {
    private const val MAX_MULTIPLIER = 3.0

    data class Resolved(val multiplier: Double, val fallback: Boolean)

    /** 예측 행 → 그 주 배수. 행이 없거나 값이 범위 밖이면 정액 + fallback. 관문 실패 = 정액이 정상 경로(배수 효과 미검증) */
    fun resolveMultiplier(band: BandWeekRow?): Resolved {
        if (band == null) return Resolved(1.0, true)
        if (!band.gatePassed) return Resolved(1.0, false)
        val m = band.multiplier
        if (!m.isFinite() || m < 0 || m > MAX_MULTIPLIER) return Resolved(1.0, true)
        return Resolved(m, false)
    }

    fun snapshotWeek(
        settings: PlanSettingsRecord,
        weekOf: LocalDate,
        asset: PlanAsset,
        band: BandWeekRow?,
        status: ExecutionStatus,
        allocation: List<Allocation>,
    ): ExecutionRecord {
        val base = PlanMath.weeklyBaseFor(settings, weekOf, asset, allocation)
        val resolved = resolveMultiplier(band)
        return ExecutionRecord(
            weekOf = weekOf,
            asset = asset,
            weeklyBaseKrw = base,
            multiplier = resolved.multiplier,
            plannedKrw = PlanMath.plannedKrw(base, resolved.multiplier),
            bandKey = band?.bandKey,
            gatePassed = band?.gatePassed,
            blockedReason = band?.blockedReason,
            preregKey = band?.preregKey,
            indicatorValue = band?.indicatorValue,
            fallback = resolved.fallback,
            status = status,
            executedKrw = null,
            recordedAt = null,
        )
    }

    /**
     * 채워야 할 행 — 시작 주부터 지난 주까지 빠진 주는 `skipped`(열지 않은 주도 미실행이다 — FR-43),
     * 이번 주는 **그 주 예측 행이 있을 때만** `planned`(월요일 아침 예측 회차 전에 정액으로 굳히지 않는다).
     */
    fun missingWeeks(
        settings: PlanSettingsRecord,
        currentWeek: LocalDate,
        existing: List<ExecutionRecord>,
        bandsByWeek: Map<Pair<LocalDate, PlanAsset>, BandWeekRow>,
        allocation: List<Allocation>,
    ): List<ExecutionRecord> {
        val have = existing.map { it.weekOf to it.asset }.toSet()
        val assets = allocation.map { it.asset }
        val out = mutableListOf<ExecutionRecord>()
        for (weekOf in PlanWeeks.weeksBetween(settings.startedWeek, currentWeek)) {
            for (asset in assets) {
                if ((weekOf to asset) in have) continue
                out += snapshotWeek(settings, weekOf, asset, bandsByWeek[weekOf to asset], ExecutionStatus.SKIPPED, allocation)
            }
        }
        for (asset in assets) {
            if ((currentWeek to asset) in have) continue
            bandsByWeek[currentWeek to asset]?.let { out += snapshotWeek(settings, currentWeek, asset, it, ExecutionStatus.PLANNED, allocation) }
        }
        return out
    }
}
