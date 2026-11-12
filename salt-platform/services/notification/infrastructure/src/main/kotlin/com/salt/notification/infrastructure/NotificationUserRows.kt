package com.salt.notification.infrastructure

import com.salt.support.persistence.UserRowSet
import com.salt.support.persistence.UserRows
import org.jooq.DSLContext

/** 알림의 그 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 받은 알림 · 도메인별 설정 */
object NotificationUserRows {
    fun of(dsl: DSLContext): UserRows = UserRows(
        service = "notification",
        dsl = dsl,
        sets = listOf(UserRowSet("notification"), UserRowSet("notification_pref"), UserRows.outbox()),
        notPersonal = UserRows.TECHNICAL,
    )
}
