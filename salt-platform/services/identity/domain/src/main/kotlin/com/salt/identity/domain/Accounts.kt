package com.salt.identity.domain

import java.time.Instant

/**
 * 계정 — identity 가 만들고 인증하는 대상(`SRV-REQ-048` FR-8, 서버 S3b — 옛 Express `auth/domain/Account.ts` 를 옮김).
 *
 * Aggregate 로 만들지 않는다. 계정에 대해 지키는 불변식은 **이메일 유일성** 하나이고 그건 DB 제약이다.
 * 계정은 [InviteCodeStore.redeem] 으로만 생긴다 — 코드 없이 계정을 만드는 함수가 이 서비스에 없다.
 */

/** 계정 생성 입력. 비밀번호는 **해시된 뒤에만** 도메인을 지난다 */
data class NewAccount(val email: String, val nickname: String, val passwordHash: String)

/** 응답에 실리는 계정. 해시를 담지 않는다. 포인트 · 레벨은 옛 응답 모양(동면 미션) — 새로 쓰는 곳 0 */
data class AccountView(
    val id: String,
    val email: String,
    val nickname: String,
    val profileImageUrl: String?,
    val totalPoints: Int,
    val userLevel: Int,
    val createdAt: Instant,
    val lastLoginAt: Instant?,
)

/** 로그인 검증에 필요한 최소 정보. 목록 · 응답에 쓰지 않는다 */
data class AccountCredential(val id: String, val email: String, val passwordHash: String)

/** 발급된 세션 */
data class SessionTokens(val accessToken: String, val refreshToken: String)

/** 토큰이 담는 사람 — 옛 Express 토큰과 같은 두 클레임(`userId` · `email`) */
data class TokenSubject(val userId: String, val email: String)

/** 프로필 수정 — 안 보낸 칸(null)은 그대로 둔다(옛 Prisma `update` 의 undefined 와 같다) */
data class ProfileChange(val nickname: String?, val profileImageUrl: String?)
