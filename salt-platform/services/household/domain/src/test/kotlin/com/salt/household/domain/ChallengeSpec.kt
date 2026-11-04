package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * 가계부 S1d — 내가 고르는 챌린지의 경계 표(`SRV-REQ-046` FR-19 · FR-16 챌린지 스티커).
 * 판단 번호는 루트 슬라이스 `MONEY-S1d-household-challenge-slice.md`.
 */
class ChallengeSpec : StringSpec({
    val krw = { v: Long -> Money.krw(v) }
    val today = LocalDate.of(2026, 11, 4)
    val now = Instant.parse("2026-11-04T03:00:00Z")

    fun challenge(starts: LocalDate = today, ends: LocalDate = today.plusDays(6), endedOn: LocalDate? = null) =
        Challenge.create("u", "커피 한 잔 아끼기", starts, ends, today, now).copy(endedOn = endedOn)

    "고르기 — 이름 1~40자(앞뒤 공백 지움) · 시작은 오늘 ~ 30일 뒤 · 기간 1 ~ 92일(판단 2)" {
        Challenge.create("u", "  무지출 주말  ", today, today, today, now).title shouldBe "무지출 주말"
        Challenge.create("u", "가".repeat(40), today.plusDays(30), today.plusDays(30 + 91), today, now).endsOn shouldBe today.plusDays(121)
        val rejects = listOf(
            Triple("   ", today to today, "CHALLENGE_TITLE_REQUIRED"),
            Triple("가".repeat(41), today to today, "CHALLENGE_TITLE_TOO_LONG"),
            Triple("x", today.minusDays(1) to today, "CHALLENGE_START_PAST"),
            Triple("x", today.plusDays(31) to today.plusDays(31), "CHALLENGE_START_TOO_FAR"),
            Triple("x", today to today.minusDays(1), "CHALLENGE_PERIOD_INVALID"),
            Triple("x", today to today.plusDays(92), "CHALLENGE_PERIOD_TOO_LONG"),
        )
        rejects.forEach { (title, period, code) ->
            shouldThrow<InvalidChallenge> { Challenge.create("u", title, period.first, period.second, today, now) }.code shouldBe code
        }
    }

    "단계 — 시작 전 · 하는 중 · 끝(기간이 지났든 그만뒀든 같은 끝 — 실패 단계 없음, 판단 1)" {
        challenge(starts = today.plusDays(1), ends = today.plusDays(3)).phase(today) shouldBe ChallengePhase.UPCOMING
        challenge().phase(today) shouldBe ChallengePhase.RUNNING
        challenge(ends = today.plusDays(6)).phase(today.plusDays(6)) shouldBe ChallengePhase.RUNNING
        challenge(ends = today.plusDays(6)).phase(today.plusDays(7)) shouldBe ChallengePhase.ENDED
        challenge(endedOn = today).phase(today) shouldBe ChallengePhase.ENDED
        ChallengePhase.entries.map { it.key } shouldBe listOf("upcoming", "running", "ended")
    }

    "한 날 · 아낀 돈을 받는 날 — 기간 안 · 오늘까지 · 그만둔 날까지. 끝난 뒤에도 지난 날은 받는다(재촉 0)" {
        val c = challenge(starts = today.minusDays(0), ends = today.plusDays(6))
        c.accepts(today, today) shouldBe true
        c.accepts(today.minusDays(1), today) shouldBe false
        c.accepts(today.plusDays(1), today) shouldBe false
        c.accepts(today.plusDays(1), today.plusDays(1)) shouldBe true
        // 기간이 끝난 뒤(오늘 = 끝 + 3) 기간 안 지난 날은 받는다 · 기간 밖은 아니다
        c.accepts(today.plusDays(6), today.plusDays(9)) shouldBe true
        c.accepts(today.plusDays(7), today.plusDays(9)) shouldBe false
        // 그만둔 날 뒤로는 받지 않는다
        val ended = challenge(ends = today.plusDays(6), endedOn = today.plusDays(2))
        ended.accepts(today.plusDays(2), today.plusDays(5)) shouldBe true
        ended.accepts(today.plusDays(3), today.plusDays(5)) shouldBe false
        shouldThrow<InvalidChallenge> { c.checkDay(today.plusDays(1), today) }.code shouldBe "CHALLENGE_DATE_FUTURE"
        shouldThrow<InvalidChallenge> { c.checkDay(today.minusDays(1), today) }.code shouldBe "CHALLENGE_DATE_OUTSIDE"
    }

    "아낀 돈 — 원 단위 양수 · 1천만 원까지 · 메모 100자 · 기간 안(판단 4)" {
        val c = challenge()
        ChallengeSaving.create(c, krw(4_500), today, "  아메리카노 ", today, now).note shouldBe "아메리카노"
        ChallengeSaving.create(c, krw(10_000_000), today, "", today, now).note shouldBe null
        val rejects = listOf(
            krw(0) to "CHALLENGE_SAVING_AMOUNT_INVALID",
            krw(-1) to "CHALLENGE_SAVING_AMOUNT_INVALID",
            Money.krw("0.5") to "CHALLENGE_SAVING_AMOUNT_INVALID",
            krw(10_000_001) to "CHALLENGE_SAVING_AMOUNT_TOO_LARGE",
        )
        rejects.forEach { (amount, code) -> shouldThrow<InvalidChallenge> { ChallengeSaving.create(c, amount, today, null, today, now) }.code shouldBe code }
        shouldThrow<InvalidChallenge> { ChallengeSaving.create(c, krw(1), today, "가".repeat(101), today, now) }.code shouldBe "CHALLENGE_SAVING_NOTE_TOO_LONG"
        shouldThrow<InvalidChallenge> { ChallengeSaving.create(c, krw(1), today.minusDays(1), null, today, now) }.code shouldBe "CHALLENGE_DATE_OUTSIDE"
    }

    "카드 몫 — 아낀 돈 합 · 보탠 합 · 날 순 · 오늘 표시 가능(그만두면 아니다)" {
        val c = challenge()
        val a = ChallengeSaving.create(c, krw(4_500), today, null, today, now)
        val b = ChallengeSaving.create(c, krw(3_000), today, null, today, now.plusSeconds(1)).copy(contribution = Contribution(java.util.UUID.randomUUID(), now))
        val s = ChallengeSummary.of(c, listOf(today.plusDays(0), today), listOf(a, b), today)
        s.savedTotal shouldBe krw(7_500)
        s.contributedTotal shouldBe krw(3_000)
        s.savings.first() shouldBe b
        s.todayMarkable shouldBe true
        ChallengeSummary.of(c.copy(endedOn = today.minusDays(0)), emptyList(), emptyList(), today).todayMarkable shouldBe true
        ChallengeSummary.of(challenge(starts = today.plusDays(1)), emptyList(), emptyList(), today).todayMarkable shouldBe false
    }

    "목록 순서 — 진행 · 예정 먼저(시작일 순), 끝난 것은 뒤(최근 끝난 순)" {
        val running = ChallengeSummary.of(challenge(starts = today), emptyList(), emptyList(), today)
        val upcoming = ChallengeSummary.of(challenge(starts = today.plusDays(2), ends = today.plusDays(3)), emptyList(), emptyList(), today)
        val endedOld = ChallengeSummary.of(challenge(endedOn = today), emptyList(), emptyList(), today.plusDays(10))
            .let { it.copy(challenge = it.challenge.copy(endedOn = today), phase = ChallengePhase.ENDED) }
        val endedNew = ChallengeSummary.of(challenge(ends = today.plusDays(6)), emptyList(), emptyList(), today.plusDays(10))
        ChallengeSummary.order(listOf(endedOld, upcoming, endedNew, running)) shouldBe listOf(running, upcoming, endedNew, endedOld)
    }

    "달력 — 챌린지 한 날은 칸 상태와 따로 · 쓴 날에도 붙는다 · 미래 칸에는 안 붙는다 · 개수만(연속 0)" {
        val nov = YearMonth.of(2026, 11)
        val cal = CalendarRules.month(
            nov, today,
            daily = mapOf(today to krw(3_000)),
            stickers = setOf(today.minusDays(1)),
            challengeDays = setOf(today, today.minusDays(1), today.plusDays(1)),
        )
        cal.days[today.dayOfMonth - 1].state shouldBe DayState.SPENT
        cal.days[today.dayOfMonth - 1].challenge shouldBe true
        cal.days[today.dayOfMonth - 2].state shouldBe DayState.NO_SPEND
        cal.days[today.dayOfMonth - 2].challenge shouldBe true
        cal.days[today.dayOfMonth].challenge shouldBe false
        cal.challengeDays shouldBe 2
    }
})
