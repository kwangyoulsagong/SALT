package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.time.LocalDate
import java.time.Year
import java.time.YearMonth
import java.util.UUID

/**
 * 리볼빙(일부결제금액이월약정) 띠(`SRV-REQ-046` FR-10 남은 몫 · `DB-REQ-038` FR-5 · FEATURE-013 FR-10, 가계부 S1h).
 *
 * 카드 · 계좌 연동이 없다 — 사용자가 **명세서 한 장**(이월 잔액 · 약정결제비율 · 수수료율 · 그 명세서의 달)을 적고, 서버가
 * "새로 쓰는 돈 없이 이대로 낸다면" 앞으로 6개월 청구를 **추정**한다. 규정 대조(슬라이스 판단 2):
 * - 청구 = 약정 적용 금액 × 약정결제비율 + 수수료 · 청구되지 않은 몫은 다음 달로 이월(카드사 약관 안내)
 * - 약정결제비율은 최소결제비율(신용도별 10% 이상)~100%, 1% 단위
 * - 수수료 = 이월 잔액 × 연 수수료율 × 이용 일수 ÷ 365(윤년 366), 원 미만 버림
 * - 수수료율 상한 연 20%(법정 최고금리)
 * 이름은 "리볼빙" · "일부결제금액이월약정"만 — "최소결제" · "일부만 결제"는 다른 서비스로 읽혀 쓰지 않는다(감독 당국 광고 개선).
 * 결제비율을 올리라 · 해지하라는 지시는 없다 — 숫자(청구 · 수수료 합 · 남는 잔액)만.
 */
@JvmInline
value class RevolvingId(val value: UUID) {
    override fun toString(): String = value.toString()

    companion object {
        fun parse(raw: String): RevolvingId? = runCatching { RevolvingId(UUID.fromString(raw)) }.getOrNull()
    }
}

data class RevolvingPlan(
    val id: RevolvingId,
    val userId: String,
    /** 사용자가 붙인 이름(카드 이름 등). 비우면 null — 화면이 "리볼빙 N" */
    val label: String?,
    /** 명세서의 이월 잔액 — 그달 결제 뒤 다음 달로 넘어간 돈 */
    val balance: Money,
    /** 약정결제비율(%) — 정수 */
    val payRatio: Int,
    /** 연 수수료율(%) — 소수 둘째 자리까지 */
    val annualRate: BigDecimal,
    /** 그 명세서의 달 — 첫 추정 청구는 다음 달 */
    val statementMonth: YearMonth,
    /** 다 갚았거나 해지했다고 적은 날. 그 달부터 띠에서 빠진다 */
    val endedOn: LocalDate?,
    val createdAt: Instant,
) {
    val horizonEnd: YearMonth get() = statementMonth.plusMonths(RevolvingMath.HORIZON_MONTHS.toLong())

    /** [month] 띠에 들어가나 — 끝냈다고 적은 달부터 빠진다 */
    fun activeIn(month: YearMonth): Boolean = endedOn == null || month.isBefore(YearMonth.from(endedOn))

    companion object {
        const val LABEL_MAX = 20

        /** 동시에 적어 둘 수 있는 리볼빙 — 카드 몇 장. 끝낸 것은 세지 않는다 */
        const val OPEN_MAX = 5

        /** 이월 잔액 상한 — 오타 막기(개인 카드 한도보다 넉넉히) */
        val BALANCE_MAX: Money = Money.krw(100_000_000L)

        const val RATIO_MIN = 10
        const val RATIO_MAX = 100

        /** 법정 최고금리 — 연 20% */
        val RATE_MAX: BigDecimal = BigDecimal("20")

        /** 명세서 달은 이번 달부터 6개월 앞까지 — 더 오래된 명세서는 띠가 모두 지나간다 */
        const val STATEMENT_BACK_MONTHS = 6L

        fun create(
            userId: String,
            label: String?,
            balance: Money,
            payRatio: Int,
            annualRate: BigDecimal,
            statementMonth: YearMonth,
            today: LocalDate,
            now: Instant,
        ): RevolvingPlan {
            val v = validated(label, balance, payRatio, annualRate, statementMonth, today)
            return RevolvingPlan(RevolvingId(UUID.randomUUID()), userId, v.label, balance, payRatio, v.rate, statementMonth, null, now)
        }

        /** 새 명세서로 고치기 — 같은 검사. 끝낸 것은 고치지 않는다(부르는 쪽이 0행으로 안다) */
        fun edited(plan: RevolvingPlan, label: String?, balance: Money, payRatio: Int, annualRate: BigDecimal, statementMonth: YearMonth, today: LocalDate): RevolvingPlan {
            val v = validated(label, balance, payRatio, annualRate, statementMonth, today)
            return plan.copy(label = v.label, balance = balance, payRatio = payRatio, annualRate = v.rate, statementMonth = statementMonth)
        }

        private data class Valid(val label: String?, val rate: BigDecimal)

        private fun validated(label: String?, balance: Money, payRatio: Int, annualRate: BigDecimal, statementMonth: YearMonth, today: LocalDate): Valid {
            val name = label?.trim()?.replace(Regex("\\s+"), " ")?.ifEmpty { null }
            if (name != null && name.length > LABEL_MAX) throw InvalidRevolving("REVOLVING_LABEL_TOO_LONG", "label must be at most $LABEL_MAX chars")
            if (name != null && name.any { it.isISOControl() }) throw InvalidRevolving("REVOLVING_LABEL_INVALID", "label has control characters")
            if (balance.isNegative() || balance.isZero() || !Expense.isWholeWon(balance)) throw InvalidRevolving("REVOLVING_BALANCE_INVALID", "balance must be a positive whole won")
            if (balance > BALANCE_MAX) throw InvalidRevolving("REVOLVING_BALANCE_TOO_LARGE", "balance is too large")
            if (payRatio !in RATIO_MIN..RATIO_MAX) throw InvalidRevolving("REVOLVING_RATIO_INVALID", "payRatio must be $RATIO_MIN..$RATIO_MAX")
            if (annualRate.signum() <= 0 || annualRate > RATE_MAX) throw InvalidRevolving("REVOLVING_RATE_INVALID", "annualRate must be in (0, 20]")
            if (annualRate.stripTrailingZeros().scale() > 2) throw InvalidRevolving("REVOLVING_RATE_INVALID", "annualRate has at most 2 decimals")
            val current = YearMonth.from(today)
            if (statementMonth.isAfter(current)) throw InvalidRevolving("REVOLVING_MONTH_FUTURE", "statementMonth is in the future")
            if (statementMonth.isBefore(current.minusMonths(STATEMENT_BACK_MONTHS))) throw InvalidRevolving("REVOLVING_MONTH_TOO_OLD", "statementMonth is too old")
            return Valid(name, annualRate.setScale(2, RoundingMode.UNNECESSARY))
        }
    }
}

/** 한 달 추정 청구 — 원금 몫(이월 잔액 × 비율) + 수수료. [balanceAfter] = 그 결제 뒤 다음 달로 넘어가는 잔액 */
data class RevolvingCharge(val month: YearMonth, val principal: Money, val fee: Money, val balanceAfter: Money) {
    val total: Money get() = principal + fee
}

/** 명세서 하나의 추정 — 다음 달부터 [RevolvingMath.HORIZON_MONTHS] 달. 잔액이 0 이 되면 거기서 끝 */
data class RevolvingProjection(val plan: RevolvingPlan, val charges: List<RevolvingCharge>) {
    val feeTotal: Money get() = charges.fold(Money.krw(0)) { acc, c -> acc + c.fee }

    /** 추정 기간 뒤 남는 잔액 */
    val balanceAtEnd: Money get() = charges.lastOrNull()?.balanceAfter ?: plan.balance

    fun chargeIn(month: YearMonth): RevolvingCharge? = charges.firstOrNull { it.month == month }
}

data class RevolvingLine(val projection: RevolvingProjection, val charge: RevolvingCharge)

/**
 * [month] 화면의 리볼빙 띠. [stale] = 추정 기간이 지난 명세서(새 명세서를 적으면 다시 나온다 — 숫자를 지어내지 않는다).
 * [upcoming] = 이 달부터 6개월, 추정 기간 안의 청구만 더한다.
 */
data class RevolvingBand(
    val lines: List<RevolvingLine>,
    val monthCharge: Money,
    val upcoming: List<MonthCharge>,
    val stale: List<RevolvingPlan>,
)

object RevolvingMath {
    /** 앞으로 몇 달 — FEATURE-013 FR-10 "6개월 고정 청구", 할부 띠와 같다 */
    const val HORIZON_MONTHS = InstallmentMath.UPCOMING_MONTHS

    private val HUNDRED = BigDecimal(100)

    /**
     * 명세서 하나 → 앞으로 6개월. 불변식: 원금 몫 합 + 마지막 잔액 = 처음 이월 잔액 · 잔액은 늘지 않는다(새로 쓰는 돈 0 가정).
     * 수수료는 그 잔액이 넘어가 있던 달의 일수로 — 명세서 달 다음 달 청구는 명세서 달 일수(결제일을 모른다 — 달 단위 근사).
     */
    fun project(plan: RevolvingPlan): RevolvingProjection {
        val rate = plan.annualRate.divide(HUNDRED)
        val ratio = BigDecimal(plan.payRatio).divide(HUNDRED)
        var balance = plan.balance.toDecimal()
        val charges = mutableListOf<RevolvingCharge>()
        for (k in 1..HORIZON_MONTHS) {
            if (balance.signum() <= 0) break
            val carried = plan.statementMonth.plusMonths((k - 1).toLong())
            val yearDays = if (Year.isLeap(carried.year.toLong())) 366 else 365
            val fee = (balance * rate * BigDecimal(carried.lengthOfMonth())).divide(BigDecimal(yearDays), 0, RoundingMode.FLOOR)
            // 원금 몫 원 미만 버림 · 남는 돈이 1원도 못 줄면 한 번에(비율이 작고 잔액이 몇 원일 때 끝없이 남지 않게)
            val principal = (balance * ratio).setScale(0, RoundingMode.FLOOR).let { if (it.signum() == 0) balance else it }.min(balance)
            balance -= principal
            charges += RevolvingCharge(plan.statementMonth.plusMonths(k.toLong()), Money.krw(principal), Money.krw(fee), Money.krw(balance))
        }
        return RevolvingProjection(plan, charges)
    }

    /** [plans] 는 끝내지 않은 것 + 그 달 뒤에 끝낸 것. 줄 순서: 이 달 청구가 큰 순 → 명세서 최신순 */
    fun band(month: YearMonth, plans: List<RevolvingPlan>): RevolvingBand {
        val active = plans.filter { it.activeIn(month) && !it.statementMonth.isAfter(month) }
        val projections = active.map(::project)
        val lines = projections.mapNotNull { p -> p.chargeIn(month)?.let { RevolvingLine(p, it) } }
            .sortedWith(compareByDescending<RevolvingLine> { it.charge.total }.thenByDescending { it.projection.plan.statementMonth })
        val stale = active.filter { month.isAfter(it.horizonEnd) }.sortedByDescending { it.statementMonth }
        val upcoming = (0 until HORIZON_MONTHS).map { k ->
            val m = month.plusMonths(k.toLong())
            MonthCharge(m, projections.filter { it.plan.activeIn(m) }.mapNotNull { it.chargeIn(m)?.total }.fold(Money.krw(0), Money::plus))
        }
        return RevolvingBand(lines, lines.fold(Money.krw(0)) { acc, l -> acc + l.charge.total }, upcoming, stale)
    }
}

interface RevolvingPlans {
    fun add(plan: RevolvingPlan)

    /** 본인 것만 */
    fun find(id: RevolvingId, userId: String): RevolvingPlan?

    /** 끝내지 않은 것 + 끝낸 것(최근 [endedLimit] 개) — 관리 화면 */
    fun list(userId: String, endedLimit: Int): List<RevolvingPlan>

    /** [month] 띠 재료 — 끝내지 않았거나 그 달 뒤에 끝낸 것, 명세서가 그 달까지인 것(한 문장) */
    fun forMonth(userId: String, month: YearMonth): List<RevolvingPlan>

    fun countOpen(userId: String): Int

    /** 끝내지 않은 것만 고친다 — 바꾼 행 수 */
    fun update(plan: RevolvingPlan, now: Instant): Int

    /** 끝냈다고 적기 — 이미 끝냈으면 0행(멱등) */
    fun end(id: RevolvingId, userId: String, on: LocalDate): Int
}

class InvalidRevolving(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)

class RevolvingNotFound(id: String) : DomainError("REVOLVING_NOT_FOUND", ErrorKind.NOT_FOUND, "Revolving plan not found", mapOf("revolvingId" to id))

class RevolvingLimitReached(limit: Int) :
    DomainError("REVOLVING_LIMIT_REACHED", ErrorKind.CONFLICT, "Too many open revolving plans", mapOf("limit" to limit))

class RevolvingEnded(id: String) : DomainError("REVOLVING_ENDED", ErrorKind.CONFLICT, "Revolving plan is already ended", mapOf("revolvingId" to id))
