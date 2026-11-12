package com.salt.household.infrastructure

import com.salt.support.persistence.UserRowSet
import com.salt.support.persistence.UserRows
import org.jooq.DSLContext

/**
 * 가계부의 그 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 자식 먼저(연쇄가 아닌 FK: 반복 회차 → 지출 · 템플릿, 챌린지 날 · 아낀 돈 → 챌린지).
 * 착지 원장(`landing_issued`)은 덧붙이기만이지만 계정 삭제 때는 지운다(V9 예외 — `salt.erase`). 감정 · 급여(민감 표)도 여기서 같이 지운다.
 */
object HouseholdUserRows {
    fun of(dsl: DSLContext): UserRows = UserRows(
        service = "household",
        dsl = dsl,
        sets = listOf(
            UserRowSet("expense_tag"),
            UserRowSet("recurring_occurrence"),
            UserRowSet("fixed_cost_increase"),
            UserRowSet("fixed_cost_hidden"),
            UserRowSet("expense"),
            UserRowSet("recurring_template"),
            UserRowSet("challenge_day"),
            UserRowSet("challenge_saving"),
            UserRowSet("challenge"),
            UserRowSet("month_close_envelope", "close_id IN (SELECT id FROM month_close WHERE user_id = ?)"),
            UserRowSet("month_close"),
            UserRowSet("budget_envelope"),
            UserRowSet("budget"),
            UserRowSet("landing_issued"),
            UserRowSet("calendar_sticker"),
            UserRowSet("custom_category"),
            UserRowSet("household_setting"),
            UserRowSet("occasion_envelope"),
            UserRowSet("person_entry"),
            UserRowSet("revolving_plan"),
            UserRows.outbox(),
        ),
        notPersonal = UserRows.TECHNICAL,
    )
}
