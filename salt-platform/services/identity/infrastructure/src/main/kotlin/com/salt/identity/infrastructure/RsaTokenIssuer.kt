package com.salt.identity.infrastructure

import com.nimbusds.jose.JOSEObjectType
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.salt.identity.domain.SessionTokens
import com.salt.identity.domain.TokenIssuer
import com.salt.identity.domain.TokenSubject
import com.salt.support.web.DualTokenVerifier
import com.salt.support.web.SaltTokens
import com.salt.support.web.TokenCheck
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.Date

/** 토큰 수명 — 옛 Express 기본과 같다(접근 15분 · 갱신 7일 · 게스트 30분) */
data class TokenLifetimes(val access: Duration, val refresh: Duration, val guest: Duration)

/**
 * RS256 발급(`SRV-REQ-048` FR-8) — 접근 · 갱신 · 게스트가 **같은 키, 다른 `aud`**(`SaltTokens` 불변식).
 * 사람 토큰 클레임은 옛 Express 와 같은 `userId` · `email`(+ 표준 `sub` · `iss` · `aud`) — 검증하는 쪽(Express · 플랫폼)이 읽는 이름 그대로.
 * 갱신 토큰 읽기는 [refreshVerifier] — 이중 기간엔 옛 HS 갱신 토큰(`JWT_REFRESH_SECRET`)도 받아 새 RS 접근 토큰을 준다.
 */
class RsaTokenIssuer(
    private val key: RSAKey,
    private val lifetimes: TokenLifetimes,
    private val refreshVerifier: DualTokenVerifier,
    private val clock: Clock,
) : TokenIssuer {
    private val signer = RSASSASigner(key)

    override fun issue(subject: TokenSubject): SessionTokens =
        SessionTokens(issueAccess(subject), sign(person(subject, SaltTokens.AUDIENCE_REFRESH, lifetimes.refresh)))

    override fun issueAccess(subject: TokenSubject): String = sign(person(subject, SaltTokens.AUDIENCE_API, lifetimes.access))

    override fun readRefresh(token: String): TokenSubject? {
        val claims = (refreshVerifier.check(token) as? TokenCheck.Valid)?.claims ?: return null
        val userId = claims.getStringClaim("userId") ?: return null
        return TokenSubject(userId, claims.getStringClaim("email").orEmpty())
    }

    override fun issueGuest(): Pair<String, Long> {
        val claims = base(SaltTokens.AUDIENCE_GUEST, lifetimes.guest).claim("kind", "guest").build()
        return sign(claims) to lifetimes.guest.seconds
    }

    private fun person(subject: TokenSubject, audience: String, ttl: Duration): JWTClaimsSet =
        base(audience, ttl).subject(subject.userId).claim("userId", subject.userId).claim("email", subject.email).build()

    /** iat · exp 는 초 단위(JWT NumericDate) — 옛 jsonwebtoken 과 같게 지금을 초로 내린다 */
    private fun base(audience: String, ttl: Duration): JWTClaimsSet.Builder {
        val now = Instant.ofEpochSecond(clock.instant().epochSecond)
        return JWTClaimsSet.Builder().issuer(SaltTokens.ISSUER).audience(audience)
            .issueTime(Date.from(now)).expirationTime(Date.from(now.plus(ttl)))
    }

    private fun sign(claims: JWTClaimsSet): String =
        SignedJWT(JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.keyID).type(JOSEObjectType.JWT).build(), claims)
            .apply { sign(signer) }
            .serialize()
}
