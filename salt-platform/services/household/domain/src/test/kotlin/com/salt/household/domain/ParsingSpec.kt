package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldNotContain
import java.time.LocalDate

/**
 * 카드사 문자 표본 파싱(`SRV-REQ-046` 수용 기준 3 · 마스킹 포함). 표본은 카드사 문자 **꼴**을 흉내 낸 가짜 — 이름 · 번호는 지어낸 값이다.
 * 마스킹 확인은 "후보 어느 칸에도 번호 · 이름 조각이 없다"로 한다(원문은 함수 밖으로 나가지 않는다).
 */
class ParsingSpec : StringSpec({
    val today = LocalDate.of(2026, 11, 4)
    val krw = { v: Long -> Money.krw(v) }

    "한 줄 — 낱말 + 숫자 · 숫자 + 가맹점 · 만/천 단위 · 원 붙임" {
        InputParser.line("점심 12000", today).candidates.single().let {
            it.amount shouldBe krw(12_000)
            it.merchant shouldBe "점심"
            it.category shouldBe Category.FOOD
            it.spentOn shouldBe today
        }
        InputParser.line("12,000 스타벅스", today).candidates.single().let {
            it.amount shouldBe krw(12_000)
            it.merchant shouldBe "스타벅스"
            it.category shouldBe Category.CAFE
        }
        InputParser.line("택시 1.2만", today).candidates.single().amount shouldBe krw(12_000)
        InputParser.line("3만5천 저녁", today).candidates.single().let {
            it.amount shouldBe krw(35_000)
            it.category shouldBe Category.FOOD
        }
        InputParser.line("커피 4500원", today).candidates.single().amount shouldBe krw(4_500)
        InputParser.line("점심12000", today).candidates.single().amount shouldBe krw(12_000)
        // 리뷰 2026-11-04 — 만 뒤 그냥 숫자 · 만 앞 쉼표 숫자
        InputParser.line("택시 1만2000", today).candidates.single().let {
            it.amount shouldBe krw(12_000)
            it.merchant shouldBe "택시"
        }
        InputParser.line("월세 1,200만", today).candidates.single().amount shouldBe krw(12_000_000)
        InputParser.line("2만 저녁", today).candidates.single().amount shouldBe krw(20_000)
    }

    "한 줄 — 가맹점 이름 속 숫자는 금액이 아니다(GS25)" {
        InputParser.line("GS25 3000", today).candidates.single().let {
            it.amount shouldBe krw(3_000)
            it.merchant shouldBe "GS25"
            it.category shouldBe Category.CAFE
        }
    }

    "한 줄 — 금액이 없으면 후보 0 · 이유 no_amount" {
        InputParser.line("점심 먹음", today).let {
            it.candidates shouldBe emptyList()
            it.skipped shouldBe listOf(SkipReason.NO_AMOUNT)
        }
    }

    "분류 — 긴 낱말이 이긴다(메가박스 ≠ 메가커피)" {
        CategoryRules.suggest("메가박스 코엑스") shouldBe Category.CULTURE
        CategoryRules.suggest("메가커피 강남") shouldBe Category.CAFE
        CategoryRules.suggest("알 수 없는 곳") shouldBe null
    }

    val samples = """
        [Web발신]
        신한카드(1234)승인 홍*동 12,000원(일시불)10/31 12:34 스타벅스 누적1,234,567원

        [Web발신]
        KB국민카드1234승인
        김*수님
        35,000원 03개월
        10/30 19:20
        쿠팡
        누적2,345,000원

        [Web발신]
        삼성1234승인 이*영
        45,000원 일시불
        11/01 18:30 이마트

        [Web발신]
        현대카드 승인 박지민님 8,900원 일시불 11/02 08:10 GS25

        [Web발신]
        신한카드(1234)취소 홍*동 12,000원(일시불)10/31 12:40 스타벅스
    """.trimIndent()

    "결제 문자 5건 — 4건 후보 · 취소 1건은 버림 · 할부 3개월 인식" {
        val r = InputParser.messages(samples, today)
        r.skipped shouldBe listOf(SkipReason.CANCELLED)
        r.candidates.map { it.amount } shouldBe listOf(krw(12_000), krw(35_000), krw(45_000), krw(8_900))
        r.candidates.map { it.merchant } shouldBe listOf("스타벅스", "쿠팡", "이마트", "GS25")
        r.candidates.map { it.spentOn } shouldBe listOf(
            LocalDate.of(2026, 10, 31), LocalDate.of(2026, 10, 30), LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 2),
        )
        r.candidates.map { it.installmentMonths } shouldBe listOf(null, 3, null, null)
        r.candidates.map { it.category } shouldBe listOf(Category.CAFE, Category.SHOPPING, Category.LIVING, Category.CAFE)
    }

    "마스킹 — 후보 어느 칸에도 카드번호 · 이름 · 누적 금액이 없다" {
        val r = InputParser.messages(samples, today)
        val everything = r.candidates.joinToString("|") { "${it.merchant} ${it.amount} ${it.spentOn}" }
        listOf("1234", "홍", "김", "이*", "박지민", "1,234,567", "2,345,000").forEach { everything shouldNotContain it }
    }

    "표시 없이 한 줄에 한 건씩 붙여넣어도 건마다 자른다" {
        val r = InputParser.messages("우리카드 승인 5,000원 일시불 11/03 09:00 버스\n우리카드 승인 7,500원 일시불 11/03 12:00 김밥천국", today)
        r.candidates.map { it.amount } shouldBe listOf(krw(5_000), krw(7_500))
        r.candidates.map { it.merchant } shouldBe listOf("버스", "김밥천국")
    }

    "오늘보다 뒤 날짜(12월 문자를 1월에) → 지난해" {
        val r = InputParser.messages("국민카드 승인 10,000원 12/30 10:00 서점", LocalDate.of(2027, 1, 2))
        r.candidates.single().spentOn shouldBe LocalDate.of(2026, 12, 30)
    }

    "금액 없는 조각은 no_amount 로 버린다 · 상한 30건" {
        InputParser.messages("[Web발신]\n안내 문자입니다", today).skipped shouldBe listOf(SkipReason.NO_AMOUNT)
        val many = (1..40).joinToString("\n\n") { "카드 승인 ${it}000원 11/01 10:00 가게$it" }
        InputParser.messages(many, today).candidates.size shouldBe InputParser.CANDIDATES_MAX
    }
})
