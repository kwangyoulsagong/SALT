package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Instant
import java.time.LocalDate
import java.time.Year
import java.time.YearMonth

/**
 * 가계부 S1g — 이야기 카드. 불변식 두 줄:
 * 1. 값이 없는 줄은 빠진다 — 0 을 내밀지 않는다(평가 · 비교 줄은 처음부터 없다)
 * 2. 같은 재료면 늘 같은 답 — 같은 합이면 분류 표 순서 · 앞 달
 */
class StorySpec : StringSpec({
    val krw = { v: Long -> Money.krw(v) }
    val d = { s: String -> LocalDate.parse(s) }
    val none = StoryFacts(emptyList(), emptySet(), emptySet(), Money.krw(0), 0)
    val oct = StoryPeriod.Month(YearMonth.of(2026, 10))

    fun spend(date: String, category: Category, amount: Long, count: Int = 1, approx: Boolean = false) =
        StorySpend(d(date), category, approx, krw(amount), count)

    "기간 읽기 경계 — YYYY-MM 은 달 · YYYY 는 해 · 나머지는 null" {
        val table = listOf(
            "2026-10" to StoryPeriod.Month(YearMonth.of(2026, 10)),
            "2026-01" to StoryPeriod.Month(YearMonth.of(2026, 1)),
            "2026" to StoryPeriod.OfYear(Year.of(2026)),
            "2026-13" to null,
            "2026-00" to null,
            "2026-1" to null,
            "26" to null,
            "2026-10-01" to null,
            "" to null,
        )
        table.forEach { (raw, expected) -> StoryPeriod.parse(raw) shouldBe expected }
    }

    "볼 수 있는 날 경계 — 지난 기간은 지금 · 이번 기간은 마지막 3일부터 · 오지 않은 기간은 거절" {
        StoryRules.readyOn(oct, d("2026-11-05")) shouldBe null
        val nov = StoryPeriod.Month(YearMonth.of(2026, 11))
        StoryRules.readyOn(nov, d("2026-11-05")) shouldBe d("2026-11-28")
        StoryRules.readyOn(nov, d("2026-11-27")) shouldBe d("2026-11-28")
        StoryRules.readyOn(nov, d("2026-11-28")) shouldBe null
        StoryRules.readyOn(nov, d("2026-11-30")) shouldBe null
        // 월 마감과 같은 날부터
        listOf("2026-11-27", "2026-11-28").forEach { today ->
            (StoryRules.readyOn(nov, d(today)) == null) shouldBe MonthCloseRules.closable(YearMonth.of(2026, 11), d(today))
        }
        val y2026 = StoryPeriod.OfYear(Year.of(2026))
        StoryRules.readyOn(y2026, d("2026-11-05")) shouldBe d("2026-12-29")
        StoryRules.readyOn(y2026, d("2026-12-29")) shouldBe null
        StoryRules.readyOn(StoryPeriod.OfYear(Year.of(2025)), d("2026-01-01")) shouldBe null
        shouldThrow<InvalidStory> { StoryRules.readyOn(StoryPeriod.Month(YearMonth.of(2026, 12)), d("2026-11-30")) }.code shouldBe "STORY_PERIOD_FUTURE"
        shouldThrow<InvalidStory> { StoryRules.readyOn(StoryPeriod.OfYear(Year.of(2027)), d("2026-12-31")) }.code shouldBe "STORY_PERIOD_FUTURE"
    }

    "아무것도 없으면 줄 0 — 0 일 · 0 원 줄을 내밀지 않는다" {
        StoryRules.lines(oct, none, CategoryBook.DEFAULTS_ONLY) shouldBe emptyList()
    }

    "달 카드 — 합 · 적은 날 · 가장 많이 쓴 분류 몫 · 스티커 · 아낀 돈 · 기분 수" {
        val facts = StoryFacts(
            spends = listOf(
                spend("2026-10-01", Category.FOOD, 30_000, 3),
                spend("2026-10-01", Category.CAFE, 10_000, 2),
                spend("2026-10-02", Category.FOOD, 20_000),
                spend("2026-10-05", Category.HOUSING, 40_000, approx = true),
            ),
            noSpendStickers = setOf(d("2026-10-03"), d("2026-10-04"), d("2026-10-05")), // 5일은 그 뒤 지출을 적었다 — 빠진다
            challengeDays = setOf(d("2026-10-03")),
            challengeSaved = krw(4_500),
            feelingsTagged = 2,
        )
        StoryRules.lines(oct, facts, CategoryBook.DEFAULTS_ONLY) shouldBe listOf(
            StoryLine.Spent(krw(100_000), 7, 3, approx = true),
            StoryLine.TopCategory(Category.FOOD, krw(50_000), 50),
            StoryLine.NoSpendDays(2),
            StoryLine.ChallengeDays(1),
            StoryLine.ChallengeSaved(krw(4_500)),
            StoryLine.FeelingsTagged(2),
        )
    }

    "같은 합이면 분류 표 순서 — 내 분류는 기본 12 뒤 · 만든 순서" {
        val mine = CustomCategory.create("u", "강아지", Bucket.WANTS, Instant.parse("2026-10-01T00:00:00Z"))
        val book = CategoryBook(listOf(mine))
        val tie = StoryFacts(listOf(spend("2026-10-01", mine.category, 10_000), spend("2026-10-02", Category.OTHER, 10_000)), emptySet(), emptySet(), krw(0), 0)
        (StoryRules.lines(oct, tie, book)[1] as StoryLine.TopCategory).category shouldBe Category.OTHER
        val bigger = tie.copy(spends = tie.spends + spend("2026-10-03", mine.category, 1))
        (StoryRules.lines(oct, bigger, book)[1] as StoryLine.TopCategory).category shouldBe mine.category
    }

    "몫 반올림 경계 — 정수 % 한 번" {
        StoryRules.percent(krw(1), krw(3)) shouldBe 33
        StoryRules.percent(krw(2), krw(3)) shouldBe 67
        StoryRules.percent(krw(1), krw(200)) shouldBe 1 // 0.5 → 1
        StoryRules.percent(krw(1), krw(201)) shouldBe 0
        StoryRules.percent(krw(5), krw(5)) shouldBe 100
        StoryRules.percent(krw(0), krw(0)) shouldBe 0
    }

    "해 카드 — 달이 둘 이상이면 가장 많이 쓴 달(같으면 앞 달) · 하나면 줄 없음" {
        val y = StoryPeriod.OfYear(Year.of(2026))
        val two = StoryFacts(listOf(spend("2026-03-01", Category.FOOD, 10_000), spend("2026-07-01", Category.FOOD, 10_000)), emptySet(), emptySet(), krw(0), 0)
        StoryRules.lines(y, two, CategoryBook.DEFAULTS_ONLY).filterIsInstance<StoryLine.TopMonth>() shouldBe listOf(StoryLine.TopMonth(YearMonth.of(2026, 3), krw(10_000)))
        val one = two.copy(spends = two.spends.take(1))
        StoryRules.lines(y, one, CategoryBook.DEFAULTS_ONLY).filterIsInstance<StoryLine.TopMonth>() shouldBe emptyList()
        // 달 카드에는 달 줄이 없다
        StoryRules.lines(oct, two, CategoryBook.DEFAULTS_ONLY).filterIsInstance<StoryLine.TopMonth>() shouldBe emptyList()
    }

    "스티커 · 챌린지만 있어도 그 줄만 — 지출 줄은 없다" {
        val facts = none.copy(noSpendStickers = setOf(d("2026-10-03")), challengeDays = setOf(d("2026-10-03"), d("2026-10-04")))
        StoryRules.lines(oct, facts, CategoryBook.DEFAULTS_ONLY) shouldBe listOf(StoryLine.NoSpendDays(1), StoryLine.ChallengeDays(2))
    }
})
