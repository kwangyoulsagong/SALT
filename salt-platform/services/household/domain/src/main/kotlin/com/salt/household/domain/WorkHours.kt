package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode
import java.time.Instant

/**
 * 노동시간 환산(`SRV-REQ-046` FR-15, 가계부 S1c 판단 5) — "이 지출 = 근무 2시간 18분". 끄고 켠다(기본 꺼짐).
 * 시급 또는 월급(+ 월 근로시간)을 사용자가 적는다 — 급여는 민감 정보: 이벤트 · 로그 0. 끄면 값은 남긴다(다시 켜도 다시 적지 않게).
 */
enum class WageBasis(val key: String) {
    HOURLY("hourly"),
    MONTHLY("monthly"),
    ;

    companion object {
        fun fromKey(key: String): WageBasis? = entries.firstOrNull { it.key == key }
    }
}

data class WorkHoursSetting(
    val on: Boolean,
    val basis: WageBasis?,
    val amount: Money?,
    /** 월급일 때만 — 비우면 [DEFAULT_MONTHLY_HOURS] */
    val monthlyHours: Int?,
) {
    /** 1시간 값 — 꺼졌거나 급여가 없으면 null. 금액 반올림 0(응답 직전 1회) */
    val hourly: Money?
        get() {
            if (!on || basis == null || amount == null) return null
            return when (basis) {
                WageBasis.HOURLY -> amount
                WageBasis.MONTHLY -> Money.krw(amount.toDecimal().divide(BigDecimal(monthlyHours ?: DEFAULT_MONTHLY_HOURS), MathContext.DECIMAL64))
            }
        }

    /** 금액 → 근무 분(반올림 한 번). 꺼졌으면 null. 분은 금액이 아니다 — 표시 단위의 최종값이라 여기서 정한다 */
    fun minutesFor(spent: Money): Long? {
        val h = hourly ?: return null
        return spent.toDecimal().multiply(BigDecimal(60)).divide(h.toDecimal(), 0, RoundingMode.HALF_UP).toLong()
    }

    companion object {
        /** 주 40시간 + 주휴 — 월 소정근로 209시간(최저임금 월 환산에 쓰는 값) */
        const val DEFAULT_MONTHLY_HOURS = 209
        const val MONTHLY_HOURS_MAX = 400

        /** 시급 상한 — 오타 방지. 월급 상한은 [Expense.MAX_AMOUNT] */
        val HOURLY_MAX: Money = Money.krw(10_000_000L)

        val OFF = WorkHoursSetting(false, null, null, null)

        fun of(on: Boolean, basis: WageBasis?, amount: Money?, monthlyHours: Int?): WorkHoursSetting {
            if ((basis == null) != (amount == null)) throw InvalidSetting("WAGE_INCOMPLETE", "basis and amount go together")
            if (on && amount == null) throw InvalidSetting("WAGE_REQUIRED", "wage is required to turn work hours on")
            if (amount != null) {
                if (amount.isNegative() || amount.isZero() || !Expense.isWholeWon(amount)) throw InvalidSetting("WAGE_INVALID", "wage must be positive whole won")
                val max = if (basis == WageBasis.HOURLY) HOURLY_MAX else Expense.MAX_AMOUNT
                if (amount > max) throw InvalidSetting("WAGE_TOO_LARGE", "wage is too large")
            }
            if (monthlyHours != null) {
                if (basis != WageBasis.MONTHLY) throw InvalidSetting("MONTHLY_HOURS_INVALID", "monthlyHours goes with monthly basis")
                if (monthlyHours !in 1..MONTHLY_HOURS_MAX) throw InvalidSetting("MONTHLY_HOURS_INVALID", "monthlyHours must be 1..$MONTHLY_HOURS_MAX")
            }
            return WorkHoursSetting(on, basis, amount, monthlyHours)
        }
    }
}

interface Settings {
    /** 없으면 [WorkHoursSetting.OFF] */
    fun workHours(userId: String): WorkHoursSetting

    fun saveWorkHours(userId: String, setting: WorkHoursSetting, now: Instant)
}

class InvalidSetting(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)
