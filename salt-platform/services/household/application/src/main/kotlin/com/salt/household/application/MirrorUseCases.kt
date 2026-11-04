package com.salt.household.application

import com.salt.household.domain.CalendarRules
import com.salt.household.domain.Emotion
import com.salt.household.domain.ExpenseFeeling
import com.salt.household.domain.ExpenseId
import com.salt.household.domain.Expenses
import com.salt.household.domain.FeelingDecided
import com.salt.household.domain.FeelingNotFound
import com.salt.household.domain.FeelingRules
import com.salt.household.domain.Feelings
import com.salt.household.domain.InvalidFeeling
import com.salt.household.domain.InvalidSticker
import com.salt.household.domain.Settings
import com.salt.household.domain.StickerKind
import com.salt.household.domain.Stickers
import com.salt.household.domain.WageBasis
import com.salt.household.domain.WorkHoursSetting
import com.salt.kernel.Money
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/**
 * 가계부 S1c — 하루를 비추는 거울 셋(`SRV-REQ-046` FR-13 · 15 · 16). 전부 **측정 · 기록**이다: 평가 · 재촉 · 연속 일수 0.
 * 감정 · 만족 · 급여는 민감 정보 — 이 파일의 유스케이스는 이벤트를 내지 않는다.
 */

/** 감정 키 · 산 직후 만족 → 도메인 값. 저장 경로(지출 적기)와 태그 경로가 같은 검사를 지난다 */
internal fun feelingOf(userId: String, expenseId: ExpenseId, emotionKey: String, feltNow: Int?, today: LocalDate): ExpenseFeeling {
    val emotion = Emotion.fromKey(emotionKey) ?: throw InvalidFeeling("FEELING_EMOTION_UNKNOWN", "unknown emotion")
    FeelingRules.checkFelt(feltNow, "FEELING_FELT_INVALID")
    return ExpenseFeeling(expenseId, userId, emotion, feltNow, today, null, null)
}

/** 태그 붙이기 · 바꾸기 — 본인 지출만(남의 것 · 없는 것은 404). 태그 날짜 · 다음 날 답은 처음 값 그대로 */
open class TagFeeling(private val feelings: Feelings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, emotionKey: String, feltNow: Int?): ExpenseFeeling {
        val id = ExpenseId.parse(rawId) ?: throw FeelingNotFound(rawId)
        if (feelings.tag(feelingOf(userId, id, emotionKey, feltNow, clock.todayKst()), clock.instant()) == 0) throw FeelingNotFound(rawId)
        return feelings.find(id, userId)!!
    }
}

open class UntagFeeling(private val feelings: Feelings) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String) {
        val id = ExpenseId.parse(rawId) ?: throw FeelingNotFound(rawId)
        if (feelings.delete(id, userId) == 0) throw FeelingNotFound(rawId)
    }
}

/**
 * 다음 날 만족 — 1~5 또는 넘김(null). 한 번만(두 번째는 409 — 조건부 UPDATE 가 0행). 태그 단 날 당일에는 받지 않는다(다음 날 비교가 뜻이다).
 */
open class AnswerNextDay(private val feelings: Feelings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, rawId: String, felt: Int?): ExpenseFeeling {
        val id = ExpenseId.parse(rawId) ?: throw FeelingNotFound(rawId)
        FeelingRules.checkFelt(felt, "FEELING_FELT_INVALID")
        val found = feelings.find(id, userId) ?: throw FeelingNotFound(rawId)
        if (found.nextDecided) throw FeelingDecided(rawId)
        if (!found.taggedOn.isBefore(clock.todayKst())) throw InvalidFeeling("FEELING_NEXT_TOO_EARLY", "next-day feeling starts the day after tagging")
        if (feelings.decideNext(id, userId, felt, clock.instant()) == 0) throw FeelingDecided(rawId)
        return feelings.find(id, userId)!!
    }
}

open class GetWorkHours(private val settings: Settings) {
    @Transactional(transactionManager = HOUSEHOLD_TX, readOnly = true)
    open fun execute(userId: String): WorkHoursSetting = settings.workHours(userId)
}

/** 노동시간 설정 — 통째로 바꾼다. 끄면서 급여를 비우지 않으면 값은 남는다(다시 켤 때 다시 적지 않게) */
open class SetWorkHours(private val settings: Settings, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, on: Boolean, basisKey: String?, amount: Money?, monthlyHours: Int?): WorkHoursSetting {
        val basis = basisKey?.let { WageBasis.fromKey(it) ?: throw com.salt.household.domain.InvalidSetting("WAGE_BASIS_INVALID", "unknown wage basis") }
        val setting = WorkHoursSetting.of(on, basis, amount, monthlyHours)
        settings.saveWorkHours(userId, setting, clock.instant())
        return setting
    }
}

/**
 * "안 쓴 날" 표시(FR-16 · 판단 6). 그날 지출이 있으면 거절 — 기록과 어긋난 스티커를 만들지 않는다. 다시 눌러도 같다(`ON CONFLICT DO NOTHING`).
 */
open class MarkNoSpend(private val stickers: Stickers, private val expenses: Expenses, private val clock: Clock) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, day: LocalDate) {
        CalendarRules.checkMarkable(day, clock.todayKst())
        val spent = expenses.dailyTotals(userId, day, day)[day]?.all
        if (spent != null && !spent.isZero()) throw InvalidSticker("STICKER_DAY_HAS_EXPENSE", "the day has expenses")
        stickers.add(userId, day, StickerKind.NO_SPEND, clock.instant())
    }
}

/** 표시 지우기 — 없어도 성공(멱등) */
open class UnmarkNoSpend(private val stickers: Stickers) {
    @Transactional(transactionManager = HOUSEHOLD_TX)
    open fun execute(userId: String, day: LocalDate) {
        stickers.remove(userId, day, StickerKind.NO_SPEND)
    }
}
