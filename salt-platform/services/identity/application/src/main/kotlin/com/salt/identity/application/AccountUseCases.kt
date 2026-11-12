package com.salt.identity.application

import com.salt.identity.domain.AccountCredential
import com.salt.identity.domain.AccountNotFound
import com.salt.identity.domain.AccountStore
import com.salt.identity.domain.AccountView
import com.salt.identity.domain.EmailAlreadyRegistered
import com.salt.identity.domain.GuestAccessDisabled
import com.salt.identity.domain.InvalidCredentials
import com.salt.identity.domain.InviteAcceptance
import com.salt.identity.domain.InviteAttemptLog
import com.salt.identity.domain.InviteCode
import com.salt.identity.domain.InviteCodeRaceLost
import com.salt.identity.domain.InviteCodeStore
import com.salt.identity.domain.InviteRejection
import com.salt.identity.domain.NewAccount
import com.salt.identity.domain.PasswordHasher
import com.salt.identity.domain.ProfileChange
import com.salt.identity.domain.ProfileNotFound
import com.salt.identity.domain.SessionExpired
import com.salt.identity.domain.SessionTokens
import com.salt.identity.domain.TokenIssuer
import com.salt.identity.domain.TokenSubject
import com.salt.identity.domain.toError
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.temporal.ChronoUnit

/*
 * 계정 · 세션 유스케이스(`SRV-REQ-048` FR-8, 서버 S3b) — 옛 Express `auth/application` · `modules/user` 프로필 둘을 옮겼다.
 * 응답 모양 · 오류 코드 · 판정 순서가 옛것과 같다(BFF · 화면 무변경). 시각은 밀리초로 자른다 — 옛 응답(Prisma Date)이 늘 밀리초 세 자리였다.
 */

private fun Clock.nowMillis(): Instant = instant().truncatedTo(ChronoUnit.MILLIS)

data class AcceptInviteCommand(val code: String, val email: String, val nickname: String, val password: String, val clientKey: String?)

data class AcceptInviteResult(val user: AccountView, val tokens: SessionTokens)

/** 점유 + 계정 생성 + `UserRegistered` 아웃박스 — 한 트랜잭션(포트 계약). bcrypt 는 이 밖에서 먼저 */
open class RedeemInvite(private val invites: InviteCodeStore) {
    @Transactional(transactionManager = IDENTITY_TX)
    open fun execute(codeId: String, account: NewAccount, at: Instant): AccountView? = invites.redeem(codeId, account, at)
}

/**
 * 초대 코드로 계정을 만든다 — **계정이 생기는 유일한 경로**. 판정은 [InviteAcceptance], 여기는 조합만. 상한은 설정값(생성자).
 * 검증과 점유 사이에 남이 끼어들 수 있다 — 조건부 점유가 유일한 방어선이고 위 판정은 빠른 거절일 뿐이다.
 */
class AcceptInviteCode(
    private val invites: InviteCodeStore,
    private val redeem: RedeemInvite,
    private val accounts: AccountStore,
    private val hasher: PasswordHasher,
    private val tokens: TokenIssuer,
    private val attempts: InviteAttemptLog,
    private val maxAccounts: Int,
    private val clock: Clock,
) {
    fun execute(cmd: AcceptInviteCommand): AcceptInviteResult {
        val code = InviteCode.normalize(cmd.code)
        val now = clock.nowMillis()
        val invite = invites.findByCode(code)
        val rejection = InviteAcceptance.judge(invite, now, accounts.countActive(), maxAccounts)
        if (rejection != null) {
            attempts.record(code, rejection, cmd.clientKey)
            throw rejection.toError()
        }
        // 코드가 멀쩡한데 이메일이 겹친다 — **코드를 소모시키지 않는다**(오타 한 번에 10장뿐인 초대장이 줄지 않게)
        if (accounts.existsByEmail(cmd.email)) throw EmailAlreadyRegistered()
        val passwordHash = hasher.hash(cmd.password)
        val user = redeem.execute(invite!!.id, NewAccount(cmd.email, cmd.nickname, passwordHash), now)
        if (user == null) {
            attempts.record(code, InviteRejection.USED, cmd.clientKey)
            throw InviteCodeRaceLost()
        }
        return AcceptInviteResult(user, tokens.issue(TokenSubject(user.id, user.email)))
    }
}

/** 확인 결과 — quota 는 나오지 않는다 */
data class InviteCheck(val valid: Boolean, val reasonCode: String?)

/**
 * 코드 유효성만 — 계정을 만들지 않는다. 무인증 경로라 **상한을 드러내지 않는다**(정원이 찼어도 멀쩡한 코드는 valid).
 * 같은 판정을 쓰되 상한을 타지 않게 계정 수 0 을 넣고, 결과에서도 quota 를 지운다(이중).
 */
class CheckInviteCode(private val invites: InviteCodeStore, private val maxAccounts: Int, private val clock: Clock) {
    fun execute(raw: String): InviteCheck {
        val code = InviteCode.normalize(raw)
        if (code.isEmpty()) return InviteCheck(false, InviteRejection.NOT_FOUND.key)
        val rejection = InviteAcceptance.judge(invites.findByCode(code), clock.instant(), activeUserCount = 0, maxAccounts = maxAccounts)
        val reason = InviteAcceptance.publicRejectionOf(rejection)
        return if (reason == null) InviteCheck(true, null) else InviteCheck(false, reason.key)
    }
}

data class LoginResult(val user: AccountView, val tokens: SessionTokens)

/** 로그인 — 이메일이 없는 것과 비밀번호가 틀린 것이 같은 오류(이메일 존재가 드러나지 않게) */
class Login(private val accounts: AccountStore, private val hasher: PasswordHasher, private val tokens: TokenIssuer, private val clock: Clock) {
    fun execute(email: String, password: String): LoginResult {
        val credential: AccountCredential = accounts.findCredentialByEmail(email) ?: throw InvalidCredentials()
        if (!hasher.matches(password, credential.passwordHash)) throw InvalidCredentials()
        val account = accounts.findById(credential.id) ?: throw InvalidCredentials()
        accounts.touchLastLogin(account.id, clock.nowMillis())
        return LoginResult(account, tokens.issue(TokenSubject(account.id, account.email)))
    }
}

/**
 * 접근 토큰 재발급 — 갱신 토큰이 틀리거나 만료면 401 `Invalid refresh token`.
 * **계정이 없으면 같은 401**(서버 S3c) — 갱신 토큰은 서명만 보면 7일 동안 살아 있다. 지운 계정이 새 접근 토큰을 받으면 지운 것이 아니다.
 */
class RefreshSession(private val tokens: TokenIssuer, private val accounts: AccountStore) {
    fun execute(refreshToken: String): String {
        val subject = tokens.readRefresh(refreshToken) ?: throw SessionExpired()
        accounts.findById(subject.userId) ?: throw SessionExpired()
        return tokens.issueAccess(subject)
    }
}

/** 게스트 토큰(`SRV-REQ-056` · `ADR-011`) — 공개가 꺼지면 403(되돌리는 설정 한 줄) */
class IssueGuestToken(private val tokens: TokenIssuer, private val enabled: Boolean) {
    fun execute(): Pair<String, Long> {
        if (!enabled) throw GuestAccessDisabled()
        return tokens.issueGuest()
    }
}

/** 지금 사용자(`GET /api/auth/me`) — 없으면 401(옛 그대로) */
class GetAccount(private val accounts: AccountStore) {
    fun execute(userId: String): AccountView = accounts.findById(userId) ?: throw AccountNotFound()
}

/** 프로필(`GET /api/users/profile`) — 없으면 404(옛 `modules/user` 그대로) */
class GetProfile(private val accounts: AccountStore) {
    fun execute(userId: String): AccountView = accounts.findById(userId) ?: throw ProfileNotFound()
}

/** 프로필 수정(`PATCH /api/users/profile`) — 별명 · 사진 주소만. 안 보낸 칸은 그대로 */
open class UpdateProfile(private val accounts: AccountStore, private val clock: Clock) {
    @Transactional(transactionManager = IDENTITY_TX)
    open fun execute(userId: String, change: ProfileChange): AccountView =
        accounts.updateProfile(userId, change, clock.nowMillis()) ?: throw ProfileNotFound()
}
