package com.salt.household.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.temporal.ChronoUnit
import java.util.UUID

enum class LandingMethod(val key: String) {
    /** 지난 날들의 연속 창 합 분포(10 · 90% 분위) × 남은 날 */
    EMPIRICAL_WINDOW("empirical_window"),

    /** 쓰지 않는다(계약 · DB 값만 남김) — 2026-11-04 리뷰: 말일 발행이 한 점이 돼 적중이 늘 빗나갔다. 착지는 "오늘 시작 기준"이라 남은 날이 늘 1 이상이다 */
    MONTH_OVER("month_over"),
}

/** 구간이 없는 이유 · 적중 판정을 못 하는 이유 — 문장은 프론트 */
object LandingReason {
    /** 기록한 날이 [LandingEngine.MIN_HISTORY_DAYS] 보다 적다 */
    const val HISTORY_SHORT = "history_short"

    /** 지난달 같은 날짜까지 발행한 구간이 없다 */
    const val NOT_ISSUED = "not_issued"

    /** 이번 달이 아닌 달 — 착지는 이번 달에만 */
    const val NOT_CURRENT_MONTH = "not_current_month"
}

/**
 * 월말 착지 구간(FR-7 · `SRV-REQ-046` FR-8). [low] · [high] 는 이번 달 끝의 총지출 10 · 90% 구간 — 한 점이 아니다(`ADR-003` 정신).
 * 둘이 null 이면 [reason] 이 이유.
 */
data class Landing(
    val month: YearMonth,
    val method: LandingMethod,
    val spentSoFar: Money,
    val low: Money?,
    val high: Money?,
    val reason: String?,
    val daysOfHistory: Int,
)

/** 발행 기록(불변 — `landing_issued`). 다음 달 같은 날짜 적중 판정의 근거 */
data class IssuedLanding(val id: UUID, val userId: String, val issuedOn: LocalDate, val issuedAt: Instant, val landing: Landing)

/** 지난달 같은 날짜에 낸 구간이 실제 지난달 합을 담았나. 판정을 못 하면 [hit] 이 null 이고 [reason] 이 이유 */
data class LandingTrack(val month: YearMonth, val issuedOn: LocalDate?, val low: Money?, val high: Money?, val actual: Money?, val hit: Boolean?, val reason: String?)

/**
 * 착지 계산 — **오늘 시작 기준**: 어제까지 쓴 돈 + 오늘 포함 남은 날의 분포. 같은 날이면 몇 시에 계산해도 같은 구간이다
 * (그날 첫 저장에 발행해도 그날 나머지 지출이 구간 밖으로 새지 않는다 — 2026-11-04 리뷰). 화면의 "이번 달 쓴 돈"은 따로 오늘까지 합이다.
 * 표본은 **사용자가 기록을 시작한 날**(첫 저장 날짜 — 지출 날짜가 아니다: 지난날로 적은 대략 합계가 표본을 0원 날로 늘리지 않게)부터 어제까지.
 *
 * 남은 날 R 일의 합 분포를 연속 창 합으로 잰다: 창 길이 L = min(R, N − 6)(창이 7개 이상 나오게), 창 합 × R/L 의 10 · 90% 분위.
 * 무작위 재표집(부트스트랩)을 쓰지 않는 이유: 같은 입력이면 같은 구간이어야 발행 기록 · 적중 판정이 재현된다.
 * 대략 합계(밀린 날 한꺼번에)는 그날 하루에 몰려 꼬리를 키운다 — 구간이 넓어지는 쪽이라 감추지 않고 그대로 둔다.
 */
object LandingEngine {
    const val MIN_HISTORY_DAYS = 14
    private const val MIN_WINDOWS = 7
    private val LOW_Q = BigDecimal("0.10")
    private val HIGH_Q = BigDecimal("0.90")

    /**
     * @param spentBeforeToday 이 달 1일~어제 합
     * @param dailyHistory 날짜 → 그날 합. 어제까지만 쓴다(그 뒤 날짜는 무시)
     * @param firstRecordedOn 사용자가 처음 기록한 날(저장 날짜) — 표본 시작. 없으면 표본 0
     */
    fun project(month: YearMonth, today: LocalDate, spentBeforeToday: Money, dailyHistory: Map<LocalDate, Money>, firstRecordedOn: LocalDate?): Landing {
        val spentSoFar = spentBeforeToday
        // 오늘 포함 — 늘 1 이상
        val remainingDays = month.lengthOfMonth() - today.dayOfMonth + 1
        val start = firstRecordedOn?.takeIf { !it.isAfter(today.minusDays(1)) }
        val samples = if (start == null) emptyList() else sampleDays(start, today.minusDays(1), dailyHistory)
        if (samples.size < MIN_HISTORY_DAYS) {
            return Landing(month, LandingMethod.EMPIRICAL_WINDOW, spentSoFar, null, null, LandingReason.HISTORY_SHORT, samples.size)
        }
        val window = minOf(remainingDays, samples.size - (MIN_WINDOWS - 1))
        val scale = BigDecimal(remainingDays).divide(BigDecimal(window), 20, RoundingMode.HALF_EVEN)
        val sums = windowSums(samples, window).map { it.multiply(scale) }.sorted()
        val low = spentSoFar + Money.krw(quantile(sums, LOW_Q))
        val high = spentSoFar + Money.krw(quantile(sums, HIGH_Q))
        return Landing(month, LandingMethod.EMPIRICAL_WINDOW, spentSoFar, low, high, null, samples.size)
    }

    /** 지난달 같은 날짜(말일이 짧으면 그 달 말일)까지 낸 마지막 구간 vs 지난달 실제 합 */
    fun track(lastMonth: YearMonth, today: LocalDate, issued: IssuedLanding?, lastMonthTotal: Money): LandingTrack {
        if (issued == null) return LandingTrack(lastMonth, null, null, null, lastMonthTotal, null, LandingReason.NOT_ISSUED)
        val l = issued.landing
        if (l.low == null || l.high == null) return LandingTrack(lastMonth, issued.issuedOn, null, null, lastMonthTotal, null, l.reason)
        return LandingTrack(lastMonth, issued.issuedOn, l.low, l.high, lastMonthTotal, lastMonthTotal >= l.low && lastMonthTotal <= l.high, null)
    }

    /** 지난달에서 오늘과 같은 날짜 — 31일이 없는 달이면 그 달 말일 */
    fun sameDayLastMonth(today: LocalDate): LocalDate {
        val last = YearMonth.from(today).minusMonths(1)
        return last.atDay(minOf(today.dayOfMonth, last.lengthOfMonth()))
    }

    private fun sampleDays(start: LocalDate, end: LocalDate, daily: Map<LocalDate, Money>): List<BigDecimal> {
        val n = ChronoUnit.DAYS.between(start, end).toInt() + 1
        return (0 until n).map { daily[start.plusDays(it.toLong())]?.toDecimal() ?: BigDecimal.ZERO }
    }

    private fun windowSums(samples: List<BigDecimal>, window: Int): List<BigDecimal> {
        var sum = samples.take(window).fold(BigDecimal.ZERO, BigDecimal::add)
        val out = ArrayList<BigDecimal>(samples.size - window + 1)
        out.add(sum)
        for (i in window until samples.size) {
            sum = sum + samples[i] - samples[i - window]
            out.add(sum)
        }
        return out
    }

    /** 선형 보간 분위(정렬된 표본) — 표본 수가 작아도 계단이 덜 진다 */
    internal fun quantile(sorted: List<BigDecimal>, q: BigDecimal): BigDecimal {
        val pos = q.multiply(BigDecimal(sorted.size - 1))
        val lower = pos.setScale(0, RoundingMode.FLOOR).toInt()
        val upper = minOf(lower + 1, sorted.size - 1)
        val frac = pos - BigDecimal(lower)
        return sorted[lower] + (sorted[upper] - sorted[lower]).multiply(frac)
    }
}
