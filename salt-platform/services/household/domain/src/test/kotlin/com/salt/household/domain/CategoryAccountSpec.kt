package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Instant

/**
 * 가계부 S1f — 내 분류 · 통장 쪼개기. 불변식 두 줄:
 * 1. 분류 키는 지출이 든 그대로 남는다 — 이름 · 묶음 · 보관은 키를 바꾸지 않고, 고를 수 있는지만 바꾼다
 * 2. 통장 쪼개기는 지출을 막지 않는다 — 급여 통장(템플릿) · 생활비 통장(나머지)에 모든 지출이 든다(봉투 밖 0)
 */
class CategoryAccountSpec : StringSpec({
    val krw = { v: Long -> Money.krw(v) }
    val now = Instant.parse("2026-11-05T03:00:00Z")

    fun custom(name: String, bucket: Bucket, archived: Boolean = false) = CustomCategory.create("u", name, bucket, now).copy(archived = archived)

    "키 읽기 경계 — 기본 키 · 내 분류 꼴은 그대로, 나머지는 null" {
        val table = listOf(
            "food" to "food",
            "other" to "other",
            "u_0123456789ab" to "u_0123456789ab",
            "u_0123456789AB" to null, // 대문자 — 서버가 짓는 키가 아니다
            "u_0123456789a" to null, // 11자리
            "u_0123456789abc" to null, // 13자리
            "x_0123456789ab" to null,
            "" to null,
            "Food" to null,
        )
        table.forEach { (raw, expected) -> Category.parse(raw)?.key shouldBe expected }
        Category.fromKey("u_0123456789ab") shouldBe null // 기본 분류만
        Category.newCustom().let { Category.parse(it.key) shouldBe it }
    }

    "이름 경계 — 공백 정리 · 1~12자 · 제어 문자 거절" {
        CustomCategory.cleanName("  강아지   간식 ") shouldBe "강아지 간식"
        CustomCategory.cleanName("가".repeat(12)) shouldBe "가".repeat(12)
        shouldThrow<InvalidCategory> { CustomCategory.cleanName("가".repeat(13)) }.code shouldBe "CATEGORY_NAME_TOO_LONG"
        shouldThrow<InvalidCategory> { CustomCategory.cleanName("   ") }.code shouldBe "CATEGORY_NAME_REQUIRED"
        shouldThrow<InvalidCategory> { CustomCategory.cleanName("간\u0000식") }.code shouldBe "CATEGORY_NAME_INVALID"
    }

    "고를 수 있나 · 묶음 표 — 기본 · 내 분류 · 보관 · 남의 키" {
        val pet = custom("강아지", Bucket.NEEDS)
        val ott = custom("OTT", Bucket.WANTS, archived = true)
        val book = CategoryBook(listOf(pet, ott))
        val stranger = Category.newCustom()
        // (분류, 고를 수 있나, 묶음)
        listOf(
            Triple(Category.FOOD, true, Bucket.NEEDS),
            Triple(Category.CAFE, true, Bucket.WANTS),
            Triple(pet.category, true, Bucket.NEEDS),
            Triple(ott.category, false, Bucket.WANTS), // 보관 — 지난 지출의 묶음은 그대로
            Triple(stranger, false, Bucket.WANTS), // 남의 · 없는 키 — 기타와 같은 묶음
        ).forEach { (c, selectable, bucket) ->
            book.selectable(c) shouldBe selectable
            book.bucketOf(c) shouldBe bucket
        }
        book.pick(pet.category.key) shouldBe pet.category
        book.pick(ott.category.key) shouldBe null
        book.order shouldBe Category.entries + listOf(pet.category, ott.category)
        book.active shouldBe listOf(pet)
    }

    "50/30/20 — 내 분류는 고른 묶음 봉투로" {
        val pet = custom("강아지", Bucket.NEEDS)
        val book = CategoryBook(listOf(pet))
        val b = Budget.fiftyThirtyTwenty("u", krw(3_000_000), now)
        val summary = MonthSummary(MonthTotals(krw(70_000), krw(0), 2), mapOf(pet.category to krw(50_000), Category.CAFE to krw(20_000)), krw(0))
        BudgetMath.envelopes(b, summary, book).associate { it.key to it.spent } shouldBe mapOf("needs" to krw(50_000), "wants" to krw(20_000))
    }

    "봉투 방식 — 내 분류 봉투는 분류 표 순서 · 보관한 분류로 새 봉투는 거절" {
        val pet = custom("강아지", Bucket.NEEDS)
        val old = custom("옛것", Bucket.WANTS, archived = true)
        val book = CategoryBook(listOf(pet, old))
        val b = Budget.envelopes("u", mapOf(pet.category.key to krw(100_000), "food" to krw(300_000)), book, now)
        b.envelopes.keys.toList() shouldBe listOf("food", pet.category.key)
        shouldThrow<InvalidBudget> { Budget.envelopes("u", mapOf(old.category.key to krw(1)), book, now) }.code shouldBe "BUDGET_CATEGORY_UNKNOWN"
        // 지금 예산에 이미 있던 봉투(keep)면 보관한 분류여도 다시 받는다 — 순서는 분류 표(보관 포함) 그대로
        Budget.envelopes("u", mapOf(old.category.key to krw(5_000), "food" to krw(1)), book, now, keep = setOf(old.category.key)).envelopes.keys.toList() shouldBe
            listOf("food", old.category.key)
    }

    "통장 쪼개기 — 급여 통장 몫 = 소득 − 셋 · 저축 · 비상금 0 이면 빈 칸 · 합이 소득을 넘으면 거절" {
        val b = Budget.accountSplit("u", krw(3_000_000), krw(1_000_000), krw(800_000), krw(0), now)
        b.envelopes shouldBe mapOf(Accounts.SPENDING to krw(1_000_000), Accounts.SAVING to krw(800_000))
        b.salaryShare shouldBe krw(1_200_000)
        b.spending shouldBe mapOf(Accounts.SALARY to krw(1_200_000), Accounts.SPENDING to krw(1_000_000))
        b.setAside shouldBe mapOf(Accounts.SAVING to krw(800_000))
        b.savingsShare shouldBe null
        b.total shouldBe krw(2_200_000)
        // 경계 — 딱 소득이면 급여 통장 0(받는다), 1원 넘으면 거절
        Budget.accountSplit("u", krw(3_000_000), krw(1_000_000), krw(1_000_000), krw(1_000_000), now).salaryShare shouldBe krw(0)
        shouldThrow<InvalidBudget> { Budget.accountSplit("u", krw(3_000_000), krw(1_000_000), krw(1_000_000), krw(1_000_001), now) }.code shouldBe
            "BUDGET_SPLIT_OVER_INCOME"
        shouldThrow<InvalidBudget> { Budget.accountSplit("u", krw(3_000_000), krw(0), null, null, now) }.code shouldBe "BUDGET_AMOUNT_INVALID"
        shouldThrow<InvalidBudget> { Budget.accountSplit("u", krw(3_000_000), krw(1_000), krw(-1), null, now) }.code shouldBe "BUDGET_AMOUNT_INVALID"
    }

    "통장 쪼개기 — 템플릿 지출은 급여 통장, 나머지는 생활비 통장 · 봉투 밖 0 · 넘쳐도 음수일 뿐" {
        val b = Budget.accountSplit("u", krw(2_000_000), krw(500_000), null, null, now)
        val book = CategoryBook.DEFAULTS_ONLY
        listOf(InputKind.TEMPLATE to Accounts.SALARY, InputKind.QUICK to Accounts.SPENDING, InputKind.PASTE to Accounts.SPENDING, InputKind.APPROX to Accounts.SPENDING)
            .forEach { (kind, account) -> b.envelopeOf(Category.HOUSING, kind, book) shouldBe account }
        // 이번 달: 월세(템플릿) 700,000 · 식비 600,000
        val summary = MonthSummary(MonthTotals(krw(1_300_000), krw(0), 2), mapOf(Category.HOUSING to krw(700_000), Category.FOOD to krw(600_000)), krw(700_000))
        val envelopes = BudgetMath.envelopes(b, summary, book).associate { it.key to it.remaining }
        envelopes shouldBe mapOf(Accounts.SALARY to krw(800_000), Accounts.SPENDING to krw(-100_000))
        BudgetMath.unbudgeted(b, summary, book) shouldBe krw(0)
    }

    "읽은 봉투 순서 — 묶음 · 기본 분류 · 통장 다음 내 분류 키 순" {
        val rows = mapOf("u_bbbbbbbbbbbb" to krw(1), "food" to krw(2), "u_aaaaaaaaaaaa" to krw(3), "cafe" to krw(4))
        Budget.ordered(rows).keys.toList() shouldBe listOf("food", "cafe", "u_aaaaaaaaaaaa", "u_bbbbbbbbbbbb")
        Budget.ordered(mapOf(Accounts.EMERGENCY to krw(1), Accounts.SPENDING to krw(2))).keys.toList() shouldBe listOf(Accounts.SPENDING, Accounts.EMERGENCY)
    }
})
