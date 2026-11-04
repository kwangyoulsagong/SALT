package com.salt.household.infrastructure

import com.salt.household.domain.Category
import com.salt.household.domain.Emotion
import com.salt.household.domain.ExpenseFeeling
import com.salt.household.domain.ExpenseId
import com.salt.household.domain.FeelingAsk
import com.salt.household.domain.Feelings
import com.salt.household.domain.Settings
import com.salt.household.domain.StickerKind
import com.salt.household.domain.Stickers
import com.salt.household.domain.WageBasis
import com.salt.household.domain.WorkHoursSetting
import com.salt.household.infrastructure.jooq.Tables.CALENDAR_STICKER
import com.salt.household.infrastructure.jooq.Tables.EXPENSE
import com.salt.household.infrastructure.jooq.Tables.EXPENSE_TAG
import com.salt.household.infrastructure.jooq.Tables.HOUSEHOLD_SETTING
import com.salt.household.infrastructure.jooq.tables.records.ExpenseTagRecord
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth

/**
 * 감정 태그 · 다음 날 만족(가계부 S1c — `SRV-REQ-046` FR-13 · `DB-REQ-038` FR-6). 민감 정보 — 이 어댑터는 값을 로그에 남기지 않는다.
 * 같은 파일에 무지출 스티커(FR-11) · 설정(FR-14) 어댑터.
 */
class JooqFeelings(private val dsl: DSLContext) : Feelings {
    override fun tag(feeling: ExpenseFeeling, now: Instant): Int {
        val at = DSL.`val`(now.utc())
        return dsl.insertInto(
            EXPENSE_TAG,
            EXPENSE_TAG.EXPENSE_ID, EXPENSE_TAG.USER_ID, EXPENSE_TAG.EMOTION, EXPENSE_TAG.FELT_NOW, EXPENSE_TAG.TAGGED_ON,
            EXPENSE_TAG.CREATED_AT, EXPENSE_TAG.UPDATED_AT,
        )
            .select(
                dsl.select(
                    EXPENSE.ID, EXPENSE.USER_ID, DSL.`val`(feeling.emotion.key), DSL.`val`(feeling.feltNow?.toShort(), EXPENSE_TAG.FELT_NOW),
                    DSL.`val`(feeling.taggedOn), at, at,
                ).from(EXPENSE).where(EXPENSE.ID.eq(feeling.expenseId.value).and(EXPENSE.USER_ID.eq(feeling.userId))),
            )
            // 이미 있으면 감정 · 산 직후만 — 태그 날짜 · 다음 날 답은 그대로(판단 2)
            .onConflict(EXPENSE_TAG.EXPENSE_ID).doUpdate()
            .set(EXPENSE_TAG.EMOTION, DSL.excluded(EXPENSE_TAG.EMOTION))
            .set(EXPENSE_TAG.FELT_NOW, DSL.excluded(EXPENSE_TAG.FELT_NOW))
            .set(EXPENSE_TAG.UPDATED_AT, DSL.excluded(EXPENSE_TAG.UPDATED_AT))
            .execute()
    }

    override fun delete(expenseId: ExpenseId, userId: String): Int =
        dsl.deleteFrom(EXPENSE_TAG).where(EXPENSE_TAG.EXPENSE_ID.eq(expenseId.value).and(EXPENSE_TAG.USER_ID.eq(userId))).execute()

    override fun find(expenseId: ExpenseId, userId: String): ExpenseFeeling? =
        dsl.selectFrom(EXPENSE_TAG).where(EXPENSE_TAG.EXPENSE_ID.eq(expenseId.value).and(EXPENSE_TAG.USER_ID.eq(userId))).fetchOne(::toFeeling)

    /** 아직 정하지 않은 행만 — 두 탭이 같이 답해도 하나만 바뀐다(오류 코드 분기 0) */
    override fun decideNext(expenseId: ExpenseId, userId: String, felt: Int?, now: Instant): Int =
        dsl.update(EXPENSE_TAG)
            .set(EXPENSE_TAG.FELT_NEXT, felt?.toShort())
            .set(EXPENSE_TAG.NEXT_DECIDED_AT, now.utc())
            .set(EXPENSE_TAG.UPDATED_AT, now.utc())
            .where(EXPENSE_TAG.EXPENSE_ID.eq(expenseId.value).and(EXPENSE_TAG.USER_ID.eq(userId)).and(EXPENSE_TAG.NEXT_DECIDED_AT.isNull))
            .execute()

    override fun inMonth(userId: String, month: YearMonth): List<ExpenseFeeling> =
        dsl.select(EXPENSE_TAG.asterisk())
            .from(EXPENSE_TAG)
            .join(EXPENSE).on(EXPENSE.ID.eq(EXPENSE_TAG.EXPENSE_ID))
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE.SPENT_ON.between(month.atDay(1), month.atEndOfMonth())))
            .fetchInto(EXPENSE_TAG)
            .map(::toFeeling)

    override fun pendingAsks(userId: String, from: LocalDate, to: LocalDate): List<FeelingAsk> =
        dsl.select(EXPENSE_TAG.asterisk(), EXPENSE.AMOUNT, EXPENSE.SPENT_ON, EXPENSE.CATEGORY, EXPENSE.MERCHANT)
            .from(EXPENSE_TAG)
            .join(EXPENSE).on(EXPENSE.ID.eq(EXPENSE_TAG.EXPENSE_ID))
            .where(
                EXPENSE_TAG.USER_ID.eq(userId)
                    .and(EXPENSE_TAG.NEXT_DECIDED_AT.isNull)
                    .and(EXPENSE_TAG.TAGGED_ON.between(from, to)),
            )
            .orderBy(EXPENSE_TAG.TAGGED_ON.asc(), EXPENSE.SPENT_ON.asc())
            .fetch()
            .map { r ->
                FeelingAsk(
                    feeling = toFeeling(r.into(EXPENSE_TAG)),
                    amount = money(r.get(EXPENSE.AMOUNT)),
                    spentOn = r.get(EXPENSE.SPENT_ON),
                    category = Category.fromKey(r.get(EXPENSE.CATEGORY)) ?: Category.OTHER,
                    merchant = r.get(EXPENSE.MERCHANT),
                )
            }

    private fun toFeeling(r: ExpenseTagRecord): ExpenseFeeling = ExpenseFeeling(
        expenseId = ExpenseId(r.expenseId),
        userId = r.userId,
        emotion = Emotion.fromKey(r.emotion) ?: Emotion.STRESS,
        feltNow = r.feltNow?.toInt(),
        taggedOn = r.taggedOn,
        feltNext = r.feltNext?.toInt(),
        nextDecidedAt = r.nextDecidedAt?.toInstant(),
    )
}

class JooqStickers(private val dsl: DSLContext) : Stickers {
    override fun add(userId: String, day: LocalDate, kind: StickerKind, now: Instant) {
        dsl.insertInto(CALENDAR_STICKER)
            .set(CALENDAR_STICKER.USER_ID, userId)
            .set(CALENDAR_STICKER.STICKER_ON, day)
            .set(CALENDAR_STICKER.KIND, kind.key)
            .set(CALENDAR_STICKER.CREATED_AT, now.utc())
            .onConflictDoNothing()
            .execute()
    }

    override fun remove(userId: String, day: LocalDate, kind: StickerKind): Int =
        dsl.deleteFrom(CALENDAR_STICKER)
            .where(CALENDAR_STICKER.USER_ID.eq(userId).and(CALENDAR_STICKER.STICKER_ON.eq(day)).and(CALENDAR_STICKER.KIND.eq(kind.key)))
            .execute()

    override fun inMonth(userId: String, month: YearMonth, kind: StickerKind): Set<LocalDate> =
        dsl.select(CALENDAR_STICKER.STICKER_ON).from(CALENDAR_STICKER)
            .where(
                CALENDAR_STICKER.USER_ID.eq(userId)
                    .and(CALENDAR_STICKER.KIND.eq(kind.key))
                    .and(CALENDAR_STICKER.STICKER_ON.between(month.atDay(1), month.atEndOfMonth())),
            )
            .fetchSet(CALENDAR_STICKER.STICKER_ON)
}

/** 가계부 설정 — 지금은 노동시간 하나(가계부 S1c FR-15). 급여는 민감 정보 */
class JooqSettings(private val dsl: DSLContext) : Settings {
    override fun workHours(userId: String): WorkHoursSetting {
        val r = dsl.selectFrom(HOUSEHOLD_SETTING).where(HOUSEHOLD_SETTING.USER_ID.eq(userId)).fetchOne() ?: return WorkHoursSetting.OFF
        return WorkHoursSetting(
            on = r.workHoursOn,
            basis = r.wageBasis?.let(WageBasis::fromKey),
            amount = r.wageAmount?.let(::money),
            monthlyHours = r.wageMonthlyHours?.toInt(),
        )
    }

    override fun saveWorkHours(userId: String, setting: WorkHoursSetting, now: Instant) {
        dsl.insertInto(HOUSEHOLD_SETTING)
            .set(HOUSEHOLD_SETTING.USER_ID, userId)
            .set(HOUSEHOLD_SETTING.WORK_HOURS_ON, setting.on)
            .set(HOUSEHOLD_SETTING.WAGE_BASIS, setting.basis?.key)
            .set(HOUSEHOLD_SETTING.WAGE_AMOUNT, setting.amount?.toDecimal())
            .set(HOUSEHOLD_SETTING.WAGE_MONTHLY_HOURS, setting.monthlyHours?.toShort())
            .set(HOUSEHOLD_SETTING.UPDATED_AT, now.utc())
            .onConflict(HOUSEHOLD_SETTING.USER_ID)
            .doUpdate()
            .set(HOUSEHOLD_SETTING.WORK_HOURS_ON, setting.on)
            .set(HOUSEHOLD_SETTING.WAGE_BASIS, setting.basis?.key)
            .set(HOUSEHOLD_SETTING.WAGE_AMOUNT, setting.amount?.toDecimal())
            .set(HOUSEHOLD_SETTING.WAGE_MONTHLY_HOURS, setting.monthlyHours?.toShort())
            .set(HOUSEHOLD_SETTING.UPDATED_AT, now.utc())
            .execute()
    }
}
