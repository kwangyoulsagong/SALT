package com.salt.support.web

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Clock
import java.time.Instant

/** 지우기 허가가 없거나 다른 사람 것 · 만료 — 화면은 비밀번호를 다시 묻는다 */
class EraseGrantRequired : DomainError("ERASE_GRANT_REQUIRED", ErrorKind.FORBIDDEN, "비밀번호를 다시 확인해 주세요")

/**
 * 계정 삭제 허가(`SRV-REQ-048` FR-4, 서버 S3c) — identity 가 **비밀번호를 다시 확인한 뒤에만** 내주는 5분 토큰(`aud` = salt-erase).
 *
 * 불변식: **접근 토큰 하나로는 아무것도 지울 수 없다.** 지우는 경로는 접근 토큰(누구인가) + 이 허가([HEADER], 방금 비밀번호를 쳤다)를
 * 둘 다 받고, 두 토큰의 사람이 같아야 한다. 옛 HS 는 받지 않는다(허가는 S3c 에 처음 생겼다 — 옛 발급자가 만든 적이 없다).
 * 같은 판정을 Express(`shared/lib/eraseGrant.ts`)가 돈다.
 */
class EraseGrants(trusted: TrustedKeys, clock: Clock) {
    private val verifier = DualTokenVerifier(trusted, SaltTokens.AUDIENCE_ERASE, legacySecret = "", legacyUntil = Instant.EPOCH, clock = clock)

    fun require(grant: String?, user: AuthenticatedUser) {
        val claims = grant?.takeIf { it.isNotBlank() }?.let { (verifier.check(it) as? TokenCheck.Valid)?.claims } ?: throw EraseGrantRequired()
        if (claims.getStringClaim("userId") != user.userId) throw EraseGrantRequired()
    }

    companion object {
        const val HEADER = "X-Salt-Erase"
    }
}
