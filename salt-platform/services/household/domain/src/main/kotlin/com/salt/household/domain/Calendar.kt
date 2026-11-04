package com.salt.household.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import com.salt.kernel.Money
import java.time.LocalDate
import java.time.YearMonth

/**
 * 무지출일 달력 + 스티커(`SRV-REQ-046` FR-16 · `DB-REQ-038` FR-11 · FEATURE-013 FR-20, 가계부 S1c 판단 6).
 * 챌린지 "한 날" 스티커(가계부 S1d)는 칸 상태와 따로 붙는다 — 표는 `challenge_day`(어느 챌린지 날인지 남기려고).
 * **기록 없는 날 ≠ 안 쓴 날** — 스티커는 사용자가 "안 쓴 날"이라고 표시해야 붙는다(적지 않은 날을 무지출로 세지 않는다).
 * **연속 일수를 세지 않는다** — 끊겨도 잃는 게 없게. 이 파일에 연속 · 기록 갱신 개념이 없다.
 */
enum class StickerKind(val key: String) {
    NO_SPEND("no_spend"),
    ;

    companion object {
        fun fromKey(key: String): StickerKind? = entries.firstOrNull { it.key == key }
    }
}

/** 하루 칸 상태 — 서버가 정한다. future(아직) · spent(쓴 날) · no_spend(안 쓴 날 스티커) · blank(기록 없음) */
enum class DayState(val key: String) {
    FUTURE("future"),
    SPENT("spent"),
    NO_SPEND("no_spend"),
    BLANK("blank"),
}

data class CalendarDay(
    val date: LocalDate,
    val state: DayState,
    val spent: Money,
    /** 지금 "안 쓴 날"로 표시할 수 있나 — blank 이고 표시 가능한 날짜 */
    val markable: Boolean,
    /** 챌린지 "한 날" 스티커(가계부 S1d) — 칸 상태와 따로다: 커피를 아낀 날에도 다른 지출은 있을 수 있다 */
    val challenge: Boolean = false,
)

data class MonthCalendar(val days: List<CalendarDay>, val noSpendDays: Int, val challengeDays: Int = 0)

object CalendarRules {
    /** 표시할 수 있는 가장 먼 과거 — 지출 날짜 규칙과 같다(밀린 날 메우기) */
    val PAST_DAYS_MAX: Long = Expense.PAST_DAYS_MAX

    fun checkMarkable(day: LocalDate, today: LocalDate) {
        if (day.isAfter(today)) throw InvalidSticker("STICKER_DATE_FUTURE", "day is in the future")
        if (day.isBefore(today.minusDays(PAST_DAYS_MAX))) throw InvalidSticker("STICKER_DATE_TOO_OLD", "day is too old")
    }

    /**
     * 그 달 칸 전부(1일 ~ 말일). 쓴 날이면 스티커가 있어도 spent — 표시 뒤 그날 지출을 적었으면 숨긴다(행은 남는다: 지출을 지우면 다시 보인다).
     */
    fun month(
        month: YearMonth,
        today: LocalDate,
        daily: Map<LocalDate, Money>,
        stickers: Set<LocalDate>,
        challengeDays: Set<LocalDate> = emptySet(),
    ): MonthCalendar {
        val oldest = today.minusDays(PAST_DAYS_MAX)
        val days = (1..month.lengthOfMonth()).map { d ->
            val date = month.atDay(d)
            val spent = daily[date] ?: Money.krw(0)
            val state = when {
                date.isAfter(today) -> DayState.FUTURE
                !spent.isZero() -> DayState.SPENT
                date in stickers -> DayState.NO_SPEND
                else -> DayState.BLANK
            }
            CalendarDay(date, state, spent, state == DayState.BLANK && !date.isBefore(oldest), date in challengeDays && !date.isAfter(today))
        }
        return MonthCalendar(days, days.count { it.state == DayState.NO_SPEND }, days.count { it.challenge })
    }
}

interface Stickers {
    /** 이미 있으면 아무것도 쓰지 않는다(`ON CONFLICT DO NOTHING`) */
    fun add(userId: String, day: LocalDate, kind: StickerKind, now: java.time.Instant)

    fun remove(userId: String, day: LocalDate, kind: StickerKind): Int

    fun inMonth(userId: String, month: YearMonth, kind: StickerKind): Set<LocalDate>
}

class InvalidSticker(code: String, message: String) : DomainError(code, ErrorKind.INVALID, message)
