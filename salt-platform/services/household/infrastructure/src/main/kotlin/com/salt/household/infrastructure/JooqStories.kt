package com.salt.household.infrastructure

import com.salt.household.domain.Category
import com.salt.household.domain.Precision
import com.salt.household.domain.StickerKind
import com.salt.household.domain.StoryFacts
import com.salt.household.domain.StorySources
import com.salt.household.domain.StorySpend
import com.salt.household.infrastructure.jooq.Tables.CALENDAR_STICKER
import com.salt.household.infrastructure.jooq.Tables.CHALLENGE_DAY
import com.salt.household.infrastructure.jooq.Tables.CHALLENGE_SAVING
import com.salt.household.infrastructure.jooq.Tables.EXPENSE
import com.salt.household.infrastructure.jooq.Tables.EXPENSE_TAG
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.math.BigDecimal
import java.time.LocalDate

/**
 * 이야기 카드 재료(가계부 S1g — `SRV-REQ-046` FR-20). 문장 다섯 — 지출 묶음 · 스티커 · 챌린지 날 · 아낀 돈 · 기분 수.
 * 지출은 (날짜, 분류, 정밀도)로 묶은 한 문장 — 해 카드도 날 수 × 분류 수 행이라 지출 행을 다 읽지 않는다. 합 · 몫은 도메인(`StoryRules`).
 */
class JooqStories(private val dsl: DSLContext) : StorySources {
    override fun facts(userId: String, from: LocalDate, to: LocalDate): StoryFacts {
        val spends = dsl.select(EXPENSE.SPENT_ON, EXPENSE.CATEGORY, EXPENSE.PRECISION, DSL.sum(EXPENSE.AMOUNT), DSL.count())
            .from(EXPENSE)
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE.SPENT_ON.between(from, to)))
            .groupBy(EXPENSE.SPENT_ON, EXPENSE.CATEGORY, EXPENSE.PRECISION)
            .fetch()
            // 모르는 꼴의 키는 기타로 — 월 합(`monthSummary`)과 같은 규칙
            .map { StorySpend(it.value1(), Category.parse(it.value2()) ?: Category.OTHER, it.value3() == Precision.APPROX.key, money(it.value4()), it.value5()) }
        val stickers = dsl.select(CALENDAR_STICKER.STICKER_ON).from(CALENDAR_STICKER)
            .where(
                CALENDAR_STICKER.USER_ID.eq(userId)
                    .and(CALENDAR_STICKER.KIND.eq(StickerKind.NO_SPEND.key))
                    .and(CALENDAR_STICKER.STICKER_ON.between(from, to)),
            )
            .fetchSet(CALENDAR_STICKER.STICKER_ON)
        val challengeDays = dsl.selectDistinct(CHALLENGE_DAY.MARKED_ON).from(CHALLENGE_DAY)
            .where(CHALLENGE_DAY.USER_ID.eq(userId).and(CHALLENGE_DAY.MARKED_ON.between(from, to)))
            .fetchSet(CHALLENGE_DAY.MARKED_ON)
        val saved = dsl.select(DSL.coalesce(DSL.sum(CHALLENGE_SAVING.AMOUNT), BigDecimal.ZERO)).from(CHALLENGE_SAVING)
            .where(CHALLENGE_SAVING.USER_ID.eq(userId).and(CHALLENGE_SAVING.SAVED_ON.between(from, to)))
            .fetchOne()!!.value1()
        // 기분은 그 지출 날짜로 센다 — 태그를 단 날이 아니라(카드는 그 기간의 지출 이야기다)
        val feelings = dsl.selectCount().from(EXPENSE_TAG).join(EXPENSE).on(EXPENSE.ID.eq(EXPENSE_TAG.EXPENSE_ID))
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE_TAG.USER_ID.eq(userId)).and(EXPENSE.SPENT_ON.between(from, to)))
            .fetchOne()!!.value1()
        return StoryFacts(spends, stickers, challengeDays, money(saved), feelings)
    }
}
