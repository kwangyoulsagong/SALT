package com.salt.kernel

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * 수량 — 정밀도 8자리(크립토 사토시 단위). Express `Quantity.ts` 와 같은 규칙: 음수 0, 차감이 음수가 되면 던진다.
 *
 * 값 하나라 `value class` 다(`Money` 는 값 둘이라 아니다 — `Money` 주석).
 */
@JvmInline
value class Quantity private constructor(private val value: BigDecimal) : Comparable<Quantity> {
    operator fun plus(other: Quantity): Quantity = of(value + other.value)

    /** 차감. 음수가 되면 던진다 — lot 소진량 ≤ 보유량 불변식이 여기 걸린다. */
    operator fun minus(other: Quantity): Quantity {
        val next = value - other.value
        require(next.signum() >= 0) { "수량이 음수가 된다: ${value.toPlainString()} - ${other.value.toPlainString()}" }
        return of(next)
    }

    fun isZero(): Boolean = value.signum() == 0

    override fun compareTo(other: Quantity): Int = value.compareTo(other.value)

    fun toDecimal(): BigDecimal = value

    override fun toString(): String = value.stripTrailingZeros().toPlainString()

    companion object {
        const val SCALE = 8

        fun of(value: BigDecimal): Quantity {
            require(value.signum() >= 0) { "수량은 음수가 될 수 없다: ${value.toPlainString()}" }
            return Quantity(value.setScale(SCALE, RoundingMode.HALF_UP))
        }

        fun of(value: String): Quantity = of(BigDecimal(value))

        fun zero(): Quantity = of(BigDecimal.ZERO)
    }
}
