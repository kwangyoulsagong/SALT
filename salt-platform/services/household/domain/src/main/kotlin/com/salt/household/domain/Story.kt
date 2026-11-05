package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.Year
import java.time.YearMonth

/**
 * 이야기 카드 — 월말 · 연말(`SRV-REQ-046` FR-20 · FEATURE-013 FR-21, 가계부 S1g).
 * 불변식 두 줄:
 * 1. **기록을 비출 뿐 평가하지 않는다** — 점수 · 순위 · 지난번 대비 · 잘함/못함 0. 줄은 사실(합 · 가장 많이 쓴 곳 · 사용자가 붙인 스티커 수)만
 * 2. **어떤 줄을 보일지는 여기서 정한다** — 값이 없는 줄은 빠진다(0 을 "0일"로 내밀지 않는다). 화면은 받은 줄을 그린다
 * 공유 이미지의 금액 가림은 화면 몫이다(기본 가림) — 서버는 금액을 그대로 주고, 어느 값이 금액인지는 줄 종류가 말한다.
 */
sealed interface StoryPeriod {
    val from: LocalDate
    val to: LocalDate
    val key: String

    data class Month(val month: YearMonth) : StoryPeriod {
        override val from: LocalDate get() = month.atDay(1)
        override val to: LocalDate get() = month.atEndOfMonth()
        override val key: String get() = month.toString()
    }

    data class OfYear(val year: Year) : StoryPeriod {
        override val from: LocalDate get() = year.atDay(1)
        override val to: LocalDate get() = year.atMonth(12).atEndOfMonth()
        override val key: String get() = year.toString()
    }

    companion object {
        private val MONTH = Regex("^(\\d{4})-(0[1-9]|1[0-2])$")
        private val YEAR = Regex("^\\d{4}$")

        /** `YYYY-MM` 은 달, `YYYY` 는 해. 나머지는 null(부르는 쪽이 400) */
        fun parse(raw: String): StoryPeriod? = when {
            MONTH.matches(raw) -> Month(YearMonth.parse(raw))
            YEAR.matches(raw) -> OfYear(Year.of(raw.toInt()))
            else -> null
        }
    }
}

/** 지출 한 묶음 — (날짜, 분류, 정밀도)별 합. 인프라가 한 문장으로 낸다 */
data class StorySpend(val date: LocalDate, val category: Category, val approx: Boolean, val amount: Money, val count: Int)

/** 이야기 카드의 재료 — 기간 안 지출 묶음 · 사용자가 붙인 표시들. 금액 계산은 [StoryRules] 한 곳 */
data class StoryFacts(
    val spends: List<StorySpend>,
    val noSpendStickers: Set<LocalDate>,
    val challengeDays: Set<LocalDate>,
    val challengeSaved: Money,
    val feelingsTagged: Int,
)

/** 카드 한 줄 — 종류마다 필요한 값만. 금액 줄은 [Spent] · [TopCategory] · [TopMonth] · [ChallengeSaved] */
sealed interface StoryLine {
    val kind: String

    /** [recordedDays] 지출을 적은 날 수 · [approx] 대략 합계가 섞였나 */
    data class Spent(val total: Money, val count: Int, val recordedDays: Int, val approx: Boolean) : StoryLine {
        override val kind = "spent"
    }

    /** [sharePercent] 전체 지출 중 몫(정수 %, 반올림) — 금액을 가려도 남는 값 */
    data class TopCategory(val category: Category, val amount: Money, val sharePercent: Int) : StoryLine {
        override val kind = "top_category"
    }

    /** 연말 카드만 — 지출을 적은 달이 둘 이상일 때 */
    data class TopMonth(val month: YearMonth, val amount: Money) : StoryLine {
        override val kind = "top_month"
    }

    data class NoSpendDays(val days: Int) : StoryLine {
        override val kind = "no_spend_days"
    }

    data class ChallengeDays(val days: Int) : StoryLine {
        override val kind = "challenge_days"
    }

    data class ChallengeSaved(val amount: Money) : StoryLine {
        override val kind = "challenge_saved"
    }

    /** 기분을 남긴 지출 수 — 어떤 기분이었는지 · 만족 점수는 싣지 않는다(민감 정보 · 평가 0) */
    data class FeelingsTagged(val count: Int) : StoryLine {
        override val kind = "feelings_tagged"
    }
}

/** [readyOn] — 아직이면 볼 수 있는 첫날, 볼 수 있으면 null */
data class Story(val period: StoryPeriod, val readyOn: LocalDate?, val lines: List<StoryLine>) {
    val ready: Boolean get() = readyOn == null
}

object StoryRules {
    /** 이번 달 · 올해는 마지막 이만큼 날(오늘 포함)부터 — 월 마감과 같은 값(`MonthCloseRules`) */
    const val LAST_DAYS = MonthCloseRules.CURRENT_MONTH_LAST_DAYS

    /**
     * 볼 수 있는 첫날 — 지난 기간은 null(지금 볼 수 있다). 이번 기간은 마지막 [LAST_DAYS] 일의 첫날 — 오늘이 그 뒤면 null.
     * 오지 않은 기간은 거절.
     */
    fun readyOn(period: StoryPeriod, today: LocalDate): LocalDate? {
        if (period.from.isAfter(today)) throw InvalidStory("STORY_PERIOD_FUTURE", "period is in the future")
        if (period.to.isBefore(today)) return null
        val first = period.to.minusDays((LAST_DAYS - 1).toLong())
        return first.takeIf { today.isBefore(it) }
    }

    fun lines(period: StoryPeriod, facts: StoryFacts, book: CategoryBook): List<StoryLine> {
        val lines = mutableListOf<StoryLine>()
        val count = facts.spends.sumOf { it.count }
        val spendDays = facts.spends.mapTo(HashSet()) { it.date }
        if (count > 0) {
            val total = facts.spends.map { it.amount }.reduce(Money::plus)
            lines += StoryLine.Spent(total, count, spendDays.size, facts.spends.any { it.approx })
            topCategory(facts.spends, total, book)?.let(lines::add)
            if (period is StoryPeriod.OfYear) topMonth(facts.spends)?.let(lines::add)
        }
        // 스티커를 붙인 뒤 그날 지출을 적었으면 달력에서 숨는다(`CalendarRules.month`) — 카드도 같은 답
        (facts.noSpendStickers - spendDays).size.takeIf { it > 0 }?.let { lines += StoryLine.NoSpendDays(it) }
        facts.challengeDays.size.takeIf { it > 0 }?.let { lines += StoryLine.ChallengeDays(it) }
        if (!facts.challengeSaved.isZero()) lines += StoryLine.ChallengeSaved(facts.challengeSaved)
        if (facts.feelingsTagged > 0) lines += StoryLine.FeelingsTagged(facts.feelingsTagged)
        return lines
    }

    /** 같은 합이면 분류 표 순서가 앞인 것 — 같은 재료면 늘 같은 답 */
    private fun topCategory(spends: List<StorySpend>, total: Money, book: CategoryBook): StoryLine.TopCategory? {
        val sums = spends.groupBy { it.category }.mapValues { (_, v) -> v.map { it.amount }.reduce(Money::plus) }
        val order = book.order.withIndex().associate { it.value to it.index }
        val top = sums.entries.sortedWith(
            compareByDescending<Map.Entry<Category, Money>> { it.value }.thenBy { order[it.key] ?: Int.MAX_VALUE }.thenBy { it.key.key },
        ).firstOrNull() ?: return null
        return StoryLine.TopCategory(top.key, top.value, percent(top.value, total))
    }

    /** 같은 합이면 앞 달 */
    private fun topMonth(spends: List<StorySpend>): StoryLine.TopMonth? {
        val sums = spends.groupBy { YearMonth.from(it.date) }.mapValues { (_, v) -> v.map { it.amount }.reduce(Money::plus) }
        if (sums.size < 2) return null
        val top = sums.entries.sortedWith(compareByDescending<Map.Entry<YearMonth, Money>> { it.value }.thenBy { it.key }).first()
        return StoryLine.TopMonth(top.key, top.value)
    }

    /** 몫(%) — 정수로 한 번 반올림. 금액이 아니라 비율이라 여기서 끝낸다 */
    internal fun percent(part: Money, total: Money): Int =
        if (total.isZero()) 0 else part.toDecimal().multiply(BigDecimal(100)).divide(total.toDecimal(), 0, RoundingMode.HALF_UP).toInt()
}

interface StorySources {
    /** 기간 [from] ~ [to] 의 재료 — 지출 묶음 한 문장 + 스티커 · 챌린지 날 · 아낀 돈 · 기분 수 */
    fun facts(userId: String, from: LocalDate, to: LocalDate): StoryFacts
}

class InvalidStory(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)
