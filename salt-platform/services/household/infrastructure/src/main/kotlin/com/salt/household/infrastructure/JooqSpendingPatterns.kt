package com.salt.household.infrastructure

import com.salt.household.domain.Category
import com.salt.household.domain.CategoryBaseline
import com.salt.household.domain.ExpenseId
import com.salt.household.domain.FixedCostIncrease
import com.salt.household.domain.InputKind
import com.salt.household.domain.MerchantCharge
import com.salt.household.domain.PaymentMethod
import com.salt.household.domain.Precision
import com.salt.household.domain.SpendingPatterns
import com.salt.household.infrastructure.jooq.Tables.EXPENSE
import com.salt.household.infrastructure.jooq.Tables.FIXED_COST_HIDDEN
import com.salt.household.infrastructure.jooq.Tables.FIXED_COST_INCREASE
import org.jooq.DSLContext
import org.jooq.impl.DSL
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate

/** 고정비 찾기(가계부 S1e) — 표본 · 분류 기준 · 숨김 · 증가 발행 기록 */
class JooqSpendingPatterns(private val dsl: DSLContext) : SpendingPatterns {
    /** 부분 인덱스(`expense_user_merchant_day_idx`)와 같은 조건 — 가맹점 있음 · 정확 · 템플릿 아님 */
    private fun directExact() = EXPENSE.MERCHANT.isNotNull
        .and(EXPENSE.PRECISION.eq(Precision.EXACT.key))
        .and(EXPENSE.INPUT_KIND.ne(InputKind.TEMPLATE.key))

    override fun charges(userId: String, from: LocalDate): List<MerchantCharge> =
        dsl.select(EXPENSE.ID, EXPENSE.MERCHANT, EXPENSE.CATEGORY, EXPENSE.PAYMENT_METHOD, EXPENSE.AMOUNT, EXPENSE.SPENT_ON, EXPENSE.CREATED_AT)
            .from(EXPENSE)
            .where(EXPENSE.USER_ID.eq(userId).and(EXPENSE.SPENT_ON.ge(from)).and(directExact()))
            .fetch()
            .map {
                MerchantCharge(
                    ExpenseId(it.value1()),
                    it.value2(),
                    Category.parse(it.value3()) ?: Category.OTHER,
                    PaymentMethod.fromKey(it.value4()) ?: PaymentMethod.OTHER,
                    money(it.value5()),
                    it.value6(),
                    it.value7().toInstant(),
                )
            }

    /** 정확 · 템플릿 아닌 지출만(가맹점 유무 무관). `percentile_disc` 는 표본 값 하나를 그대로 돌려준다 — 금액이 소수로 갈라지지 않는다 */
    override fun baselines(userId: String, from: LocalDate, to: LocalDate): Map<Category, CategoryBaseline> {
        val median = DSL.percentileDisc(BigDecimal("0.5")).withinGroupOrderBy(EXPENSE.AMOUNT)
        return dsl.select(EXPENSE.CATEGORY, median, DSL.count())
            .from(EXPENSE)
            .where(
                EXPENSE.USER_ID.eq(userId)
                    .and(EXPENSE.SPENT_ON.between(from, to))
                    .and(EXPENSE.PRECISION.eq(Precision.EXACT.key))
                    .and(EXPENSE.INPUT_KIND.ne(InputKind.TEMPLATE.key)),
            )
            .groupBy(EXPENSE.CATEGORY)
            .fetch()
            .mapNotNull { r ->
                val category = Category.parse(r.value1()) ?: return@mapNotNull null
                val value = r.value2() ?: return@mapNotNull null
                category to CategoryBaseline(money(BigDecimal(value.toString())), r.value3())
            }
            .toMap()
    }

    override fun hiddenKeys(userId: String): Set<String> =
        dsl.select(FIXED_COST_HIDDEN.MERCHANT_KEY).from(FIXED_COST_HIDDEN).where(FIXED_COST_HIDDEN.USER_ID.eq(userId)).fetchSet(FIXED_COST_HIDDEN.MERCHANT_KEY)

    override fun hide(userId: String, key: String, now: Instant) {
        dsl.insertInto(FIXED_COST_HIDDEN)
            .set(FIXED_COST_HIDDEN.USER_ID, userId)
            .set(FIXED_COST_HIDDEN.MERCHANT_KEY, key)
            .set(FIXED_COST_HIDDEN.HIDDEN_AT, now.utc())
            .onConflictDoNothing()
            .execute()
    }

    override fun show(userId: String, key: String): Int =
        dsl.deleteFrom(FIXED_COST_HIDDEN).where(FIXED_COST_HIDDEN.USER_ID.eq(userId).and(FIXED_COST_HIDDEN.MERCHANT_KEY.eq(key))).execute()

    override fun recordIncrease(increase: FixedCostIncrease): Boolean =
        dsl.insertInto(FIXED_COST_INCREASE)
            .set(FIXED_COST_INCREASE.ID, increase.id)
            .set(FIXED_COST_INCREASE.USER_ID, increase.userId)
            .set(FIXED_COST_INCREASE.MERCHANT_KEY, increase.merchantKey)
            .set(FIXED_COST_INCREASE.MONTH, increase.month.atDay(1))
            .set(FIXED_COST_INCREASE.EXPENSE_ID, increase.expenseId.value)
            .set(FIXED_COST_INCREASE.CATEGORY, increase.category.key)
            .set(FIXED_COST_INCREASE.PREVIOUS, increase.previous.toDecimal())
            .set(FIXED_COST_INCREASE.CURRENT, increase.current.toDecimal())
            .set(FIXED_COST_INCREASE.DETECTED_AT, increase.detectedAt.utc())
            .onConflictDoNothing()
            .execute() == 1
}
