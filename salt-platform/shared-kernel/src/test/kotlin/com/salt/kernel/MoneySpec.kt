package com.salt.kernel

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import java.math.RoundingMode

class MoneySpec : StringSpec({
    "자릿수가 달라도 값이 같으면 같은 금액이다" {
        Money.krw("1.0") shouldBe Money.krw("1.00")
        Money.krw("1.0").hashCode() shouldBe Money.krw("1.00").hashCode()
    }

    "통화가 다르면 같은 값이어도 다른 금액이다" {
        Money.krw("1") shouldNotBe Money.usd("1")
    }

    "통화가 다른 금액은 더하지 못한다" {
        shouldThrow<IllegalArgumentException> { Money.krw("1") + Money.usd("1") }
    }

    "중간 반올림이 없다 — 0.1 을 열 번 더하면 정확히 1 이다" {
        val sum = (1..10).fold(Money.zero(Currency.KRW)) { acc, _ -> acc + Money.krw("0.1") }
        sum shouldBe Money.krw("1")
    }

    "원 단위 정수는 기본 HALF_UP, 호출한 쪽이 방식을 바꿀 수 있다" {
        Money.krw("1234.5").toKrwInteger() shouldBe 1235L
        Money.krw("1234.5").toKrwInteger(RoundingMode.DOWN) shouldBe 1234L
    }

    "원이 아닌 금액을 원 정수로 바꾸면 던진다" {
        shouldThrow<IllegalStateException> { Money.usd("1").toKrwInteger() }
    }

    "단가 × 수량" {
        (Money.krw("1000") * Quantity.of("0.5")) shouldBe Money.krw("500")
    }

    "저장 문자열은 지수 표기가 없다" {
        Money.krw("1E+3").toStorageString() shouldBe "1000"
    }

    "수량은 음수가 될 수 없고 차감이 음수면 던진다" {
        shouldThrow<IllegalArgumentException> { Quantity.of("-1") }
        shouldThrow<IllegalArgumentException> { Quantity.of("1") - Quantity.of("2") }
    }
})
