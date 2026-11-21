package com.salt.notification.infrastructure

import com.salt.support.persistence.UserRowSet
import com.salt.support.persistence.UserRows
import org.jooq.DSLContext

/** 알림의 그 사람 행(`SRV-REQ-048` FR-3 · 4, 서버 S3c) — 받은 알림 · 도메인별 설정 · 푸시 받을 기기(`SRV-REQ-062` — 내보내기엔 주소 · 시각만, 암호 키 둘은 빼고) */
object NotificationUserRows {
    fun of(dsl: DSLContext): UserRows = UserRows(
        service = "notification",
        dsl = dsl,
        sets = listOf(UserRowSet("notification"), UserRowSet("notification_pref"), UserRowSet("push_subscription", select = "endpoint, created_at, last_seen_at"), UserRows.outbox()),
        notPersonal = UserRows.TECHNICAL,
    )
}
