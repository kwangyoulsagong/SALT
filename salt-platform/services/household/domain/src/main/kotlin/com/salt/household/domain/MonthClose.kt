package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.util.UUID

/**
 * 월 마감 리뷰(`SRV-REQ-046` FR-9 · `DB-REQ-038` FR-7, 가계부 S1b). 답은 저장만 — 점수 · 등급 · 평가 문구 0(슬라이스 판단 7).
 * 처음 닫을 때 그달 예산을 붙잡는다(판단 6) — 닫은 달 화면은 이 사본으로 본다.
 */
data class ReviewAnswers(val satisfied: String?, val tryNext: String?, val knownNext: String?) {
    companion object {
        const val ANSWER_MAX = 300

        /** 문항 키 — 문장은 프론트가 키로 고른다 */
        val QUESTION_KEYS = listOf("satisfied", "try_next", "known_next")

        fun of(satisfied: String?, tryNext: String?, knownNext: String?): ReviewAnswers =
            ReviewAnswers(clean(satisfied), clean(tryNext), clean(knownNext))

        private fun clean(raw: String?): String? {
            val t = raw?.trim()?.ifEmpty { null } ?: return null
            if (t.length > ANSWER_MAX) throw InvalidMonthClose("CLOSE_ANSWER_TOO_LONG", "answer must be at most $ANSWER_MAX chars")
            return t
        }
    }
}

data class MonthClose(
    val id: UUID,
    val userId: String,
    val month: YearMonth,
    val answers: ReviewAnswers,
    /** 닫을 때의 예산 — 예산이 없던 달이면 null */
    val budget: Budget?,
    val closedAt: Instant,
    val updatedAt: Instant,
)

object MonthCloseRules {
    /** 이번 달은 마지막 이만큼 날(오늘 포함)부터 닫을 수 있다 — 지난 달은 언제든 */
    const val CURRENT_MONTH_LAST_DAYS = 3

    fun closable(month: YearMonth, today: LocalDate): Boolean {
        val current = YearMonth.from(today)
        return when {
            month.isBefore(current) -> true
            month == current -> current.lengthOfMonth() - today.dayOfMonth + 1 <= CURRENT_MONTH_LAST_DAYS
            else -> false
        }
    }
}

/**
 * 할부 띠(`SRV-REQ-046` FR-10 — 리볼빙은 ~~S1c~~ ~~S1d~~ ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기), 2026-11-04 정정 — S1d 는 챌린지만). 원거래 = 지출 한 행(S1a 판단 4), 월 청구는 계산값(`DB-REQ-038` FR-5 "저장 안 함").
 * 첫 청구는 산 다음 달, 원 단위로 나눈 나머지는 첫 달에(판단 8 — 결제일 · 카드사를 모른다). 원거래는 산 달 지출 합에 그대로 든다.
 */
data class InstallmentPlan(val expense: Expense, val months: Int) {
    val firstMonth: YearMonth get() = YearMonth.from(expense.spentOn).plusMonths(1)
    val lastMonth: YearMonth get() = firstMonth.plusMonths((months - 1).toLong())

    /** 회차별 청구 — 합 = 원거래 금액(불변식). 원 단위 */
    fun charges(): List<Money> {
        val total = expense.amount.toDecimal()
        val base = total.divideToIntegralValue(BigDecimal(months))
        val remainder = total - base * BigDecimal(months)
        return (0 until months).map { i -> Money.krw(if (i == 0) base + remainder else base) }
    }

    /** [month] 가 몇 회차인가(1부터) — 청구 달이 아니면 null */
    fun indexOf(month: YearMonth): Int? {
        if (month.isBefore(firstMonth) || month.isAfter(lastMonth)) return null
        return (month.year - firstMonth.year) * 12 + (month.monthValue - firstMonth.monthValue) + 1
    }

    fun chargeIn(month: YearMonth): Money? = indexOf(month)?.let { charges()[it - 1] }

    /** [month] 청구 뒤에 남은 청구 합 */
    fun remainingAfter(month: YearMonth): Money {
        val i = indexOf(month) ?: return if (month.isBefore(firstMonth)) expense.amount else Money.krw(0)
        return charges().drop(i).fold(Money.krw(0), Money::plus)
    }

    companion object {
        fun of(expense: Expense): InstallmentPlan? = expense.installmentMonths?.let { InstallmentPlan(expense, it) }
    }
}

data class InstallmentLine(val plan: InstallmentPlan, val index: Int, val charge: Money, val remainingAfter: Money)

data class MonthCharge(val month: YearMonth, val amount: Money)

data class InstallmentBand(val lines: List<InstallmentLine>, val monthCharge: Money, val upcoming: List<MonthCharge>)

object InstallmentMath {
    /** 앞으로 몇 달 — FEATURE-013 FR-10 "6개월 고정 청구" */
    const val UPCOMING_MONTHS = 6

    /** 할부 하나가 청구를 이어 가는 가장 긴 기간 — 이만큼 앞의 할부까지 읽는다 */
    const val MAX_MONTHS = 36

    /**
     * [month] 화면의 띠. [plans] 는 그 달 끝까지 산 할부(판단 8 — 그 뒤 산 것은 섞지 않는다).
     * 줄 순서: 이번 달 청구가 큰 순 → 산 날 최신순.
     */
    fun band(month: YearMonth, plans: List<InstallmentPlan>): InstallmentBand {
        val lines = plans.mapNotNull { p -> p.indexOf(month)?.let { i -> InstallmentLine(p, i, p.charges()[i - 1], p.remainingAfter(month)) } }
            .sortedWith(compareByDescending<InstallmentLine> { it.charge }.thenByDescending { it.plan.expense.spentOn })
        val upcoming = (0 until UPCOMING_MONTHS).map { k ->
            val m = month.plusMonths(k.toLong())
            MonthCharge(m, plans.mapNotNull { it.chargeIn(m) }.fold(Money.krw(0), Money::plus))
        }
        return InstallmentBand(lines, lines.fold(Money.krw(0)) { acc, l -> acc + l.charge }, upcoming)
    }
}

interface MonthCloses {
    fun find(userId: String, month: YearMonth): MonthClose?

    /** 처음 닫기 — 이미 닫혔으면(경합 포함) 아무것도 쓰지 않고 false(`ON CONFLICT DO NOTHING`) */
    fun insertIfAbsent(close: MonthClose): Boolean

    /** 답만 고친다 — 사본 · 닫은 시각은 그대로 */
    fun updateAnswers(userId: String, month: YearMonth, answers: ReviewAnswers, now: Instant): Int
}

class InvalidMonthClose(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)
