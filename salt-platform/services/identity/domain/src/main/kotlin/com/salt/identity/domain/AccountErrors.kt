package com.salt.identity.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind

/*
 * 계정 · 세션 도메인 오류 — 코드 · 종류 · 문구가 옛 Express `auth/domain/errors.ts` 와 같다(화면 · BFF 가 code 로 가른다, 골든).
 *
 * 초대 실패 넷은 전부 403 — 없는 코드와 이미 쓴 코드를 상태로 구분해 주면 그 자체가 무차별 대입 신호다. 구분은 code 로만.
 */

class InviteCodeNotFound : DomainError("INVITE_NOT_FOUND", ErrorKind.FORBIDDEN, "초대 코드를 찾을 수 없다")

class InviteCodeAlreadyUsed : DomainError("INVITE_ALREADY_USED", ErrorKind.FORBIDDEN, "이미 사용된 초대 코드다")

class InviteCodeExpired : DomainError("INVITE_EXPIRED", ErrorKind.FORBIDDEN, "만료된 초대 코드다")

class InviteQuotaExceeded : DomainError("INVITE_QUOTA_EXCEEDED", ErrorKind.FORBIDDEN, "가입 가능한 인원이 모두 찼다")

/** 점유 순간 남이 먼저 가져감 — 화면에는 이미 쓴 코드와 같고, 동시 사용이 일어났다는 사실은 시도 기록에 남는다 */
class InviteCodeRaceLost : DomainError("INVITE_ALREADY_USED", ErrorKind.FORBIDDEN, "이미 사용된 초대 코드다")

class EmailAlreadyRegistered : DomainError("AUTH_EMAIL_TAKEN", ErrorKind.CONFLICT, "이미 가입된 이메일이다")

/** 로그인 실패 — 이메일이 없는 것과 비밀번호가 틀린 것을 구분하지 않는다(이메일 존재가 드러난다) */
class InvalidCredentials : DomainError("AUTH_INVALID_CREDENTIALS", ErrorKind.UNAUTHENTICATED, "Invalid credentials")

class SessionExpired : DomainError("AUTH_SESSION_EXPIRED", ErrorKind.UNAUTHENTICATED, "Invalid refresh token")

class AccountNotFound : DomainError("AUTH_ACCOUNT_NOT_FOUND", ErrorKind.UNAUTHENTICATED, "User not found")

/** 게스트 공개가 꺼짐 — 화면은 로그인으로 */
class GuestAccessDisabled : DomainError("GUEST_DISABLED", ErrorKind.FORBIDDEN, "Guest access is disabled")

/** 프로필 — 옛 Express `modules/user` 는 `NotFoundError('User not found')`(404) 였다 */
class ProfileNotFound : DomainError("NOT_FOUND", ErrorKind.NOT_FOUND, "User not found")

fun InviteRejection.toError(): DomainError = when (this) {
    InviteRejection.NOT_FOUND -> InviteCodeNotFound()
    InviteRejection.USED -> InviteCodeAlreadyUsed()
    InviteRejection.EXPIRED -> InviteCodeExpired()
    InviteRejection.QUOTA -> InviteQuotaExceeded()
}
