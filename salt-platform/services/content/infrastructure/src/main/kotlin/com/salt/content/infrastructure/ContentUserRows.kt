package com.salt.content.infrastructure

import com.salt.support.persistence.UserRowSet
import com.salt.support.persistence.UserRows
import org.jooq.DSLContext

/** 금융 팁의 그 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 퀴즈 답 · 닫은 팁 · 받은 신호. 글 · 정책 값은 모두의 것 */
object ContentUserRows {
    fun of(dsl: DSLContext): UserRows = UserRows(
        service = "content",
        dsl = dsl,
        sets = listOf(UserRowSet("quiz_answer"), UserRowSet("tip_dismissal"), UserRowSet("user_signal"), UserRows.outbox()),
        notPersonal = UserRows.TECHNICAL + mapOf(
            "tip" to "공개 글 목록",
            "tip_revision" to "글 고친 이력",
            "trigger_rule" to "글을 띄우는 규칙",
            "policy_param" to "제도 값(세율 · 한도)",
        ),
    )
}
