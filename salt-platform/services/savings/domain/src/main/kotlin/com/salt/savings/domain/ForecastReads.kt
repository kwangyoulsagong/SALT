package com.salt.savings.domain

import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.MathContext
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneId

/**
 * 예측(forecast)이 낸 숫자 두 가지 — 도달 구간 적중 이력(`SRV-REQ-045` FR-6) · 소비자물가(FR-10).
 * 예측이 주인인 뷰(`forecast.v_personal_coverage` · `v_price_index`)를 요청 때 읽는다(루트 `MONEY-O4-personal-projection-scoring-slice.md` 판단 9).
 * 못 읽으면 null — 그 칸만 이유로 답한다(목표 화면 전체를 잃지 않는다).
 */
interface ForecastReads {
    /** 저축 도달 구간 커버리지 — 기간(3 · 6개월)마다 한 줄. 못 읽으면 null */
    fun savingsCoverage(): List<Coverage>?

    /** 소비자물가 월 지수 — 오래된 달부터. 못 읽으면 null */
    fun priceIndex(): List<PriceIndexMonth>?
}

/** 기간 하나의 채점 집계 — 사람별 행 0(예측이 집계만 준다) */
data class Coverage(val windowMonths: Int, val intervals: Int, val hits: Int, val people: Int, val nominal: BigDecimal)

data class PriceIndexMonth(val month: YearMonth, val value: BigDecimal, val base: String, val availableAt: Instant)

/** 구간 적중 이력이 없는 이유 — 문장은 프론트 */
object TrackReason {
    /** 판정이 닫힌 구간이 아직 모자라다 */
    const val HISTORY_SHORT = "history_short"

    /** 채점 숫자를 못 읽었다 */
    const val UNAVAILABLE = "unavailable"
}

/**
 * 적중 이력(FR-6) — 6개월 창의 판정 수가 [MIN_INTERVALS] 이상일 때만 숫자를 낸다. 숫자는 늘 판정 수 · 맞은 수 · 사람 수와 한 덩어리
 * (적중률만 내보내지 않는다 — `modeling-evaluation.md` §4 와 같은 뜻). 둘 중 하나([coverage] · [reason])는 늘 있다
 */
data class Track(val coverage: Coverage?, val reason: String?) {
    companion object {
        const val WINDOW_MONTHS = 6
        const val MIN_INTERVALS = 10

        fun of(rows: List<Coverage>?): Track {
            if (rows == null) return Track(null, TrackReason.UNAVAILABLE)
            val row = rows.firstOrNull { it.windowMonths == WINDOW_MONTHS }
            return if (row == null || row.intervals < MIN_INTERVALS) Track(null, TrackReason.HISTORY_SHORT) else Track(row, null)
        }
    }
}

/** 오늘 돈을 안 보이는 이유 — 문장은 프론트 */
object TodayMoneyReason {
    /** 만든 지 [TodayMoney.MIN_AGE_MONTHS] 개월이 안 됐다(FEATURE-012 FR-9 "목표 생성 후 6개월마다") */
    const val TOO_RECENT = "too_recent"

    /** 만든 때 알던 지수와 지금 아는 지수가 같은 달이다 */
    const val NO_NEW_INDEX = "no_new_index"

    /** 물가지수를 못 읽었다 */
    const val UNAVAILABLE = "unavailable"
}

/**
 * 오늘 돈(FR-10) — 목표 금액을 정한 때 알던 최신 지수(as-of: 만든 시각까지 발표된 달)와 지금 아는 최신 지수로 다시 본다.
 * [worthToday] = 목표 × 그때 ÷ 지금(정한 금액이 지금 돈으로 얼마어치) · [sameValue] = 목표 × 지금 ÷ 그때(같은 값어치를 지키려면).
 * 금액을 고칠지는 사용자 몫 — 여기는 숫자만(반올림은 api 층 한 번)
 */
data class TodayMoney(
    val baseMonth: YearMonth?,
    val latestMonth: YearMonth?,
    val worthToday: Money?,
    val sameValue: Money?,
    /** 지금 ÷ 그때 − 1 */
    val change: BigDecimal?,
    val base: String?,
    val reason: String?,
) {
    companion object {
        const val MIN_AGE_MONTHS = 6L
        private val MC = MathContext.DECIMAL128
        private val KST: ZoneId = ZoneId.of("Asia/Seoul")

        fun of(target: Money, createdAt: Instant, now: Instant, index: List<PriceIndexMonth>?): TodayMoney {
            if (index == null) return none(TodayMoneyReason.UNAVAILABLE)
            val then = index.filter { !it.availableAt.isAfter(createdAt) }.maxByOrNull { it.month }
            val latest = index.filter { !it.availableAt.isAfter(now) }.maxByOrNull { it.month }
            if (then == null || latest == null) return none(TodayMoneyReason.UNAVAILABLE)
            // 기준이 다르면(개편 중 섞임) 비율이 거짓이다 — 예측이 통째로 바꾸지만 한 번 더 막는다
            if (then.base != latest.base) return none(TodayMoneyReason.UNAVAILABLE)
            val created = YearMonth.from(createdAt.atZone(KST))
            if (created.plusMonths(MIN_AGE_MONTHS) > YearMonth.from(now.atZone(KST))) {
                return TodayMoney(then.month, latest.month, null, null, null, latest.base, TodayMoneyReason.TOO_RECENT)
            }
            if (then.month == latest.month) {
                return TodayMoney(then.month, latest.month, null, null, null, latest.base, TodayMoneyReason.NO_NEW_INDEX)
            }
            val amount = target.toDecimal()
            val worth = amount.multiply(then.value, MC).divide(latest.value, MC)
            val same = amount.multiply(latest.value, MC).divide(then.value, MC)
            val change = latest.value.divide(then.value, MC) - BigDecimal.ONE
            return TodayMoney(
                then.month, latest.month,
                Money.of(worth, target.currency), Money.of(same, target.currency),
                change, latest.base, null,
            )
        }

        private fun none(reason: String) = TodayMoney(null, null, null, null, null, null, reason)
    }
}
