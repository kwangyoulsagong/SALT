package com.salt.identity.infrastructure

import com.salt.identity.domain.DeletionLog
import com.salt.identity.domain.PersonalRecords
import com.salt.identity.domain.PersonalTable
import com.salt.identity.infrastructure.jooq.Tables.ACCOUNT_DELETION_LOG
import com.salt.support.persistence.UserRowSet
import com.salt.support.persistence.UserRows
import org.jooq.DSLContext
import org.jooq.JSON
import tools.jackson.databind.json.JsonMapper
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID

/**
 * identity 의 그 사람 행(`SRV-REQ-048` FR-3 · 4). 계정 행은 **마지막** — 초대 코드는 지우지 않고 쓴 사람만 비운다(코드는 한 번 쓰인 채로 남아야 다시 못 쓴다).
 * 비밀번호 해시는 내보내지 않는다.
 */
object IdentityUserRows {
    fun of(dsl: DSLContext): UserRows = UserRows(
        service = "identity",
        dsl = dsl,
        sets = listOf(
            UserRowSet("user_domain_pref"),
            UserRowSet("invite_codes", "used_by_user_id = ?", select = "code, used_at, created_at", nullify = "used_by_user_id"),
            UserRows.outbox(),
            UserRowSet(
                "users", "id = ?",
                select = "id, email, nickname, profile_image_url, total_points, user_level, created_at, updated_at, last_login_at",
            ),
        ),
        notPersonal = UserRows.TECHNICAL + mapOf(
            "invite_code_attempts" to "실패한 코드 앞 4자 · 사유 · 요청 주소 — 계정이 생기기 전 기록(사람 id 0)",
            "signing_key" to "JWKS 공개키",
            "account_deletion_log" to "삭제 기록 — 사람 칸 0",
        ),
    )
}

class IdentityPersonalRecords(private val rows: UserRows) : PersonalRecords {
    override fun export(userId: String): List<PersonalTable> = rows.export(userId).map { PersonalTable(it.name, it.columns, it.rows) }

    override fun erase(userId: String): Map<String, Int> = rows.erase(userId)
}

class JooqDeletionLog(private val dsl: DSLContext, private val jsonMapper: JsonMapper) : DeletionLog {
    override fun record(counts: Map<String, Map<String, Int>>, at: Instant) {
        dsl.insertInto(ACCOUNT_DELETION_LOG)
            .set(ACCOUNT_DELETION_LOG.ID, UUID.randomUUID())
            .set(ACCOUNT_DELETION_LOG.DELETED_AT, at.atOffset(ZoneOffset.UTC))
            .set(ACCOUNT_DELETION_LOG.COUNTS, JSON.valueOf(jsonMapper.writeValueAsString(counts)))
            .execute()
    }
}
