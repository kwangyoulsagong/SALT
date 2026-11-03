package com.salt.kernel

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * 금액 — **이 제품에서 가장 중요한 커널 타입**이다. Express `shared/domain/Money.ts` 와 같은 규칙 셋:
 *
 * 1. **중간 반올림 금지.** [toKrwInteger] 는 `api` 층에서 응답 직전 1회만 부른다 — ArchUnit 이 호출 위치를 검사한다
 * 2. **통화가 다르면 던진다.** 조용히 더해지는 것이 가장 비싼 버그다
 * 3. **절사/반올림 방식을 커널이 하드코딩하지 않는다.** 호출하는 쪽이 [RoundingMode] 를 준다(기본은 Express 와 같은 HALF_UP)
 *
 * ## 왜 `value class` 가 아닌가 (`SRV-REQ-043` FR-3 — "값 둘을 드는 구현 형태는 S0 에서 정한다")
 *
 * Kotlin `value class` 는 프로퍼티 하나만 든다. 금액은 값 + 통화 둘이라 **불변 일반 클래스**로 두고 생성자를 막았다.
 * 값만 감싸 통화를 타입으로 올리는 안(`KrwAmount` · `UsdAmount`)은 통화 혼합을 컴파일러가 막아 주지만, 환산 · 저장 · 응답이
 * 통화 문자열로 오가는 지금 계약(`currency: "KRW"`)과 Express 쪽 한 타입과 갈라진다 — 이전 기간에 두 모양을 맞출 비용이 크다.
 *
 * `BigDecimal.equals` 는 자릿수(scale)까지 본다(`1.0 != 1.00`). 금액 비교는 값으로 해야 해서 [equals] 는 `compareTo` 로 한다.
 */
class Money private constructor(
    private val amount: BigDecimal,
    val currency: Currency,
) : Comparable<Money> {
    operator fun plus(other: Money): Money {
        assertSameCurrency(other, "더할")
        return Money(amount + other.amount, currency)
    }

    operator fun minus(other: Money): Money {
        assertSameCurrency(other, "뺄")
        return Money(amount - other.amount, currency)
    }

    /** 단가 × 수량. 수량은 통화가 없으므로 통화 검사가 없다. */
    operator fun times(quantity: Quantity): Money = Money(amount * quantity.toDecimal(), currency)

    /** 배수(세율 · 비율 등). 무차원 값만 받는다. */
    fun scale(factor: BigDecimal): Money = Money(amount * factor, currency)

    fun isNegative(): Boolean = amount.signum() < 0

    fun isZero(): Boolean = amount.signum() == 0

    /** 비교. 통화가 다르면 던진다. */
    override fun compareTo(other: Money): Int {
        assertSameCurrency(other, "비교할")
        return amount.compareTo(other.amount)
    }

    override fun equals(other: Any?): Boolean =
        other is Money && currency == other.currency && amount.compareTo(other.amount) == 0

    override fun hashCode(): Int = 31 * amount.stripTrailingZeros().hashCode() + currency.hashCode()

    /** 계산용 원시값. 저장 · 전송에 쓰지 않는다. */
    fun toDecimal(): BigDecimal = amount

    /** 저장용 문자열. 지수 표기 없이(`1E+3` 이 아니라 `1000`). `Double` 로 내려보내지 않는다. */
    fun toStorageString(): String = amount.toPlainString()

    /**
     * 원 단위 정수. **응답 직전 1회만 부른다** — 중간에 부르면 반올림이 누적돼 청구서 항등식(잔차 ≤ 100원)이 깨진다.
     * 호출 위치는 `api` 층으로 제한하고 ArchUnit(`app` 의 경계 테스트)이 검사한다.
     */
    fun toKrwInteger(rounding: RoundingMode = RoundingMode.HALF_UP): Long {
        check(currency == Currency.KRW) { "원 단위로 바꿀 수 없다: 통화가 $currency 다. 환산은 fx 컨텍스트가 한다." }
        return amount.setScale(0, rounding).longValueExact()
    }

    override fun toString(): String = "${amount.toPlainString()} $currency"

    private fun assertSameCurrency(other: Money, action: String) {
        require(currency == other.currency) {
            "통화가 다른 금액을 $action 수 없다: $currency vs ${other.currency}. 환산은 fx 컨텍스트가 한다."
        }
    }

    companion object {
        fun of(value: BigDecimal, currency: Currency): Money = Money(value, currency)

        /** 문자열에서 — 저장된 NUMERIC 을 읽을 때. `Double` 생성자는 두지 않는다(0.1 이 0.1000000000000000055… 가 된다). */
        fun of(value: String, currency: Currency): Money = Money(BigDecimal(value), currency)

        fun krw(value: BigDecimal): Money = of(value, Currency.KRW)

        fun krw(value: String): Money = of(value, Currency.KRW)

        fun krw(value: Long): Money = of(BigDecimal.valueOf(value), Currency.KRW)

        fun usd(value: String): Money = of(value, Currency.USD)

        fun zero(currency: Currency): Money = of(BigDecimal.ZERO, currency)
    }
}
