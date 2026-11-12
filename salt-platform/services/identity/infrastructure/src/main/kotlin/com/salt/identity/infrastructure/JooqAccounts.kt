package com.salt.identity.infrastructure

import com.salt.identity.domain.AccountCredential
import com.salt.identity.domain.AccountStore
import com.salt.identity.domain.AccountView
import com.salt.identity.domain.InviteAttemptLog
import com.salt.identity.domain.InviteCode
import com.salt.identity.domain.InviteCodeStore
import com.salt.identity.domain.InviteRejection
import com.salt.identity.domain.NewAccount
import com.salt.identity.domain.ProfileChange
import com.salt.identity.infrastructure.jooq.Tables.INVITE_CODES
import com.salt.identity.infrastructure.jooq.Tables.INVITE_CODE_ATTEMPTS
import com.salt.identity.infrastructure.jooq.Tables.USERS
import com.salt.identity.infrastructure.jooq.tables.records.UsersRecord
import org.jooq.DSLContext
import org.slf4j.LoggerFactory
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

private fun Instant.utc(): OffsetDateTime = atOffset(ZoneOffset.UTC)

private fun UsersRecord.view() = AccountView(
    id = id,
    email = email,
    nickname = nickname,
    profileImageUrl = profileImageUrl,
    totalPoints = totalPoints,
    userLevel = userLevel,
    createdAt = createdAt.toInstant(),
    lastLoginAt = lastLoginAt?.toInstant(),
)

/** 계정 — 해시는 [findCredentialByEmail] 하나만 읽는다(응답 모양 [AccountView] 에 해시 칸이 없다) */
class JooqAccounts(private val dsl: DSLContext) : AccountStore {
    override fun existsByEmail(email: String): Boolean = dsl.fetchExists(USERS, USERS.EMAIL.eq(email))

    override fun findCredentialByEmail(email: String): AccountCredential? =
        dsl.select(USERS.ID, USERS.EMAIL, USERS.PASSWORD_HASH).from(USERS).where(USERS.EMAIL.eq(email))
            .fetchOne { AccountCredential(it[USERS.ID], it[USERS.EMAIL], it[USERS.PASSWORD_HASH]) }

    override fun findById(userId: String): AccountView? = dsl.selectFrom(USERS).where(USERS.ID.eq(userId)).fetchOne()?.view()

    override fun countActive(): Long = dsl.fetchCount(USERS).toLong()

    override fun touchLastLogin(userId: String, at: Instant) {
        dsl.update(USERS).set(USERS.LAST_LOGIN_AT, at.utc()).where(USERS.ID.eq(userId)).execute()
    }

    /** 한 문장 UPDATE … RETURNING — 없는 사용자면 0행 → null. 안 보낸 칸은 그 열 그대로 */
    override fun updateProfile(userId: String, change: ProfileChange, at: Instant): AccountView? {
        var update = dsl.update(USERS).set(USERS.UPDATED_AT, at.utc())
        change.nickname?.let { update = update.set(USERS.NICKNAME, it) }
        change.profileImageUrl?.let { update = update.set(USERS.PROFILE_IMAGE_URL, it) }
        return update.where(USERS.ID.eq(userId)).returning().fetchOne()?.view()
    }
}

/**
 * 초대 코드 — 점유 + 계정 생성 + `UserRegistered`(아웃박스)가 **호출한 쪽 트랜잭션 하나**(`RedeemInvite`).
 *
 * **점유가 먼저다.** 새 계정 id 로 조건부 UPDATE(`used_by_user_id IS NULL`)를 먼저 하고, 0행이면 남이 먼저 — 아무것도 쓰지 않고 null.
 * 그래서 경합을 예외 · 롤백으로 가르지 않는다(`feedback-no-error-code-control-flow`). 점유가 아직 없는 계정 id 를 가리키는 순간이 있어
 * FK 는 커밋 때 검사한다(V2 `DEFERRABLE INITIALLY DEFERRED`). 같은 트랜잭션에서 계정을 넣지 못하면(이메일 경합) 예외 → 점유째 롤백.
 */
class JooqInviteCodes(private val dsl: DSLContext, private val events: IdentityEvents) : InviteCodeStore {
    override fun findByCode(code: String): InviteCode? =
        dsl.selectFrom(INVITE_CODES).where(INVITE_CODES.CODE.eq(code)).fetchOne()
            ?.let { InviteCode(it.id, it.code, it.expiresAt.toInstant(), it.usedByUserId) }

    override fun redeem(codeId: String, account: NewAccount, at: Instant): AccountView? {
        val userId = UUID.randomUUID().toString()
        val claimed = dsl.update(INVITE_CODES)
            .set(INVITE_CODES.USED_BY_USER_ID, userId)
            .set(INVITE_CODES.USED_AT, at.utc())
            .where(INVITE_CODES.ID.eq(codeId).and(INVITE_CODES.USED_BY_USER_ID.isNull))
            .execute()
        if (claimed == 0) return null
        val user = dsl.insertInto(USERS)
            .set(USERS.ID, userId)
            .set(USERS.EMAIL, account.email)
            .set(USERS.NICKNAME, account.nickname)
            .set(USERS.PASSWORD_HASH, account.passwordHash)
            .set(USERS.CREATED_AT, at.utc())
            .set(USERS.UPDATED_AT, at.utc())
            .returning()
            .fetchOne()!!
            .view()
        events.userRegistered(user.id, at)
        return user
    }
}

/** 실패한 코드 시도(감사) — 코드는 앞 4자만. **기록 실패가 요청을 막지 않는다** */
class JooqInviteAttempts(private val dsl: DSLContext, private val clock: java.time.Clock) : InviteAttemptLog {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun record(code: String, reason: InviteRejection, clientKey: String?) {
        runCatching {
            dsl.insertInto(INVITE_CODE_ATTEMPTS)
                .set(INVITE_CODE_ATTEMPTS.ID, UUID.randomUUID().toString())
                .set(INVITE_CODE_ATTEMPTS.CODE_PREFIX, code.take(PREFIX_LENGTH))
                .set(INVITE_CODE_ATTEMPTS.REASON_CODE, reason.key)
                .set(INVITE_CODE_ATTEMPTS.CLIENT_KEY, clientKey?.take(128))
                .set(INVITE_CODE_ATTEMPTS.CREATED_AT, clock.instant().utc())
                .execute()
        }.onFailure { log.warn("초대 코드 시도 기록에 실패했다 {}", it.javaClass.simpleName) }
    }

    private companion object {
        const val PREFIX_LENGTH = 4
    }
}
