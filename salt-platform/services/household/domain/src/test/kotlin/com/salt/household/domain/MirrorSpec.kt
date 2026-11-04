package com.salt.household.domain

import com.salt.kernel.Money
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * 가계부 S1c — 감정 태그 · 노동시간 · 무지출 달력의 경계 표(`SRV-REQ-046` FR-13 · 15 · 16).
 * 판단 번호는 루트 슬라이스 `MONEY-S1c-household-mirror-slice.md`.
 */
class MirrorSpec : StringSpec({
    val krw = { v: Long -> Money.krw(v) }
    val today = LocalDate.of(2026, 11, 4)
    val nov = YearMonth.of(2026, 11)

    fun feeling(emotion: Emotion, taggedOn: LocalDate = today, now: Int? = null, next: Int? = null, decided: Boolean = next != null) =
        ExpenseFeeling(ExpenseId.new(), "u", emotion, now, taggedOn, next, if (decided) Instant.EPOCH else null)

    "다음 날 묻기 창 — 태그 단 날은 안 묻고 다음 날 ~ 7일 묻는다 · 8일째부터 조용히 · 답했거나 넘겼으면 안 묻는다(판단 2)" {
        FeelingRules.askable(feeling(Emotion.STRESS, today), today) shouldBe false
        FeelingRules.askable(feeling(Emotion.STRESS, today.minusDays(1)), today) shouldBe true
        FeelingRules.askable(feeling(Emotion.STRESS, today.minusDays(7)), today) shouldBe true
        FeelingRules.askable(feeling(Emotion.STRESS, today.minusDays(8)), today) shouldBe false
        FeelingRules.askable(feeling(Emotion.STRESS, today.minusDays(1), next = 3), today) shouldBe false
        FeelingRules.askable(feeling(Emotion.STRESS, today.minusDays(1), decided = true), today) shouldBe false
        // 쿼리 경계와 규칙이 같은 창이다
        FeelingRules.askWindow(today) shouldBe (today.minusDays(7) to today.minusDays(1))
    }

    "만족 값 — 1~5 만 · 비우면 통과" {
        listOf(null, 1, 3, 5).forEach { FeelingRules.checkFelt(it, "X") }
        listOf(0, 6, -1).forEach { v -> shouldThrow<InvalidFeeling> { FeelingRules.checkFelt(v, "X") } }
    }

    "거울 — 감정 표 순서 · 태그 없는 감정은 빠진다 · 1~5 건수만(평균 · 점수 0) · 답 안 한 건은 건수에만(판단 3)" {
        val mirror = FeelingMirror.of(
            listOf(
                feeling(Emotion.REWARD, now = 5, next = 2),
                feeling(Emotion.REWARD, now = 4),
                feeling(Emotion.STRESS, now = 2, next = 2),
                feeling(Emotion.REWARD, decided = true),
            ),
        )
        mirror.map { it.emotion } shouldBe listOf(Emotion.STRESS, Emotion.REWARD)
        val reward = mirror[1]
        reward.count shouldBe 3
        reward.feltNow shouldBe listOf(0, 0, 0, 1, 1)
        reward.feltNext shouldBe listOf(0, 1, 0, 0, 0)
        FeelingMirror.of(emptyList()) shouldBe emptyList()
    }

    "노동시간 — 시급이면 금액 ÷ 시급 · 월급이면 ÷ 209(또는 적은 시간) · 분 반올림 한 번 · 꺼지면 null(판단 5)" {
        val hourly = WorkHoursSetting.of(true, WageBasis.HOURLY, krw(12_000), null)
        hourly.minutesFor(krw(12_000)) shouldBe 60
        hourly.minutesFor(krw(27_600)) shouldBe 138
        hourly.minutesFor(krw(100)) shouldBe 1 // 0.5분 → 반올림 1
        hourly.minutesFor(krw(99)) shouldBe 0
        val monthly = WorkHoursSetting.of(true, WageBasis.MONTHLY, krw(2_090_000), null)
        monthly.hourly shouldBe krw(10_000)
        monthly.minutesFor(krw(50_000)) shouldBe 300
        WorkHoursSetting.of(true, WageBasis.MONTHLY, krw(1_600_000), 160).minutesFor(krw(10_000)) shouldBe 60
        val off = WorkHoursSetting.of(false, WageBasis.HOURLY, krw(12_000), null)
        off.hourly shouldBe null
        off.minutesFor(krw(12_000)) shouldBe null
        WorkHoursSetting.OFF.minutesFor(krw(1)) shouldBe null
    }

    "노동시간 거절 표 — 켜려면 급여 · 방식과 금액은 같이 · 원 단위 양수 · 상한 · 월 시간은 월급에만 1~400" {
        val cases = listOf<() -> Unit>(
            { WorkHoursSetting.of(true, null, null, null) },
            { WorkHoursSetting.of(false, WageBasis.HOURLY, null, null) },
            { WorkHoursSetting.of(false, null, krw(1000), null) },
            { WorkHoursSetting.of(true, WageBasis.HOURLY, krw(0), null) },
            { WorkHoursSetting.of(true, WageBasis.HOURLY, Money.krw("100.5"), null) },
            { WorkHoursSetting.of(true, WageBasis.HOURLY, krw(10_000_001), null) },
            { WorkHoursSetting.of(true, WageBasis.HOURLY, krw(10_000), 160) },
            { WorkHoursSetting.of(true, WageBasis.MONTHLY, krw(2_000_000), 0) },
            { WorkHoursSetting.of(true, WageBasis.MONTHLY, krw(2_000_000), 401) },
        )
        cases.forEach { shouldThrow<InvalidSetting> { it() } }
        // 꺼짐 + 급여 없음 · 꺼짐 + 급여 남김은 된다
        WorkHoursSetting.of(false, null, null, null).on shouldBe false
        WorkHoursSetting.of(false, WageBasis.MONTHLY, krw(3_000_000), 200).amount shouldBe krw(3_000_000)
    }

    "달력 — 1일~말일 · 오늘 뒤는 future · 쓴 날은 스티커가 있어도 spent · 기록 없는 날은 blank(무지출로 세지 않는다) · 연속 개념 0(판단 6)" {
        val daily = mapOf(LocalDate.of(2026, 11, 2) to krw(8_000), LocalDate.of(2026, 11, 3) to krw(0))
        val stickers = setOf(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 2))
        val cal = CalendarRules.month(nov, today, daily, stickers)
        cal.days.size shouldBe 30
        cal.days[0].state shouldBe DayState.NO_SPEND
        cal.days[0].markable shouldBe false
        cal.days[1].state shouldBe DayState.SPENT
        cal.days[1].spent shouldBe krw(8_000)
        cal.days[2].state shouldBe DayState.BLANK
        cal.days[2].markable shouldBe true
        cal.days[3].state shouldBe DayState.BLANK // 오늘
        cal.days[3].markable shouldBe true
        cal.days[4].state shouldBe DayState.FUTURE
        cal.days[4].markable shouldBe false
        cal.noSpendDays shouldBe 1
        // 이 파일 공개 모양에 연속 일수 칸이 없다
        MonthCalendar::class.java.declaredFields.map { it.name.lowercase() }.none { "streak" in it || "consecutive" in it } shouldBe true
    }

    "표시 가능한 날 — 미래 거절 · 400일 넘은 과거 거절 · 그 사이는 된다" {
        shouldThrow<InvalidSticker> { CalendarRules.checkMarkable(today.plusDays(1), today) }
        shouldThrow<InvalidSticker> { CalendarRules.checkMarkable(today.minusDays(401), today) }
        CalendarRules.checkMarkable(today, today)
        CalendarRules.checkMarkable(today.minusDays(400), today)
        // 400일보다 오래된 달의 칸은 표시할 수 없다(2025-08 — 경계는 2025-09-30)
        val old = CalendarRules.month(YearMonth.from(today.minusDays(440)), today, emptyMap(), emptySet())
        old.days.none { it.markable } shouldBe true
    }
})
