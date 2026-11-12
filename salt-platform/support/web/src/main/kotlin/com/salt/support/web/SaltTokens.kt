package com.salt.support.web

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.crypto.MACVerifier
import com.nimbusds.jose.crypto.RSASSAVerifier
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import java.time.Clock
import java.time.Instant

/**
 * 토큰 표지 — 발급자(identity) · 받는 쪽 셋(`SRV-REQ-048` FR-8, 서버 S3b).
 *
 * **불변식: 받는 쪽(`aud`)이 다른 토큰은 서로의 경로를 지나지 못한다.** 갱신 토큰으로 API 를 부르거나 게스트 토큰으로 사람 경로를 지나면
 * 안 된다 — 옛 HS 는 비밀을 셋으로 갈라 막았고(`JWT_SECRET` · `JWT_REFRESH_SECRET` · 게스트 파생 비밀), 새 RS 는 키가 하나라 `aud` 로 막는다.
 */
object SaltTokens {
    const val ISSUER = "salt-identity"
    const val AUDIENCE_API = "salt-api"
    const val AUDIENCE_REFRESH = "salt-refresh"
    const val AUDIENCE_GUEST = "salt-guest"

    /** 계정 삭제 허가 — 비밀번호를 다시 확인한 뒤 5분(서버 S3c, [EraseGrants]). API · 갱신 경로를 지나지 못한다 */
    const val AUDIENCE_ERASE = "salt-erase"
}

/** 믿는 공개키 — identity 의 JWKS(지금 키 + 아직 은퇴 안 한 옛 키). 한 프로세스(S0~S2 · §8)라 identity 조립이 꽂는다 */
fun interface TrustedKeys {
    /** 모르는 kid 면 [refresh] 가 true 로 다시 부른다 — 키를 막 바꾼 직후 */
    fun jwkSet(refresh: Boolean): JWKSet
}

/** 검증 결과 — 실패는 둘뿐(만료 · 그 밖). 401 문구 `Token expired` · `Invalid token` 이 이 둘에서 나온다 */
sealed interface TokenCheck {
    data class Valid(val claims: JWTClaimsSet, val legacy: Boolean) : TokenCheck

    data object Expired : TokenCheck

    data object Invalid : TokenCheck
}

/**
 * 이중 검증 — 새 RS256(identity JWKS) + 옛 HS256(공용 비밀), 옛것은 [legacyUntil] 까지만(`SRV-REQ-048` FR-8 · `BFF-REQ-045` FR-5).
 *
 * - RS: `kid` 로 키를 고르고 서명 · `iss` · `aud` · 만료를 본다. 시계 오차 0(옛 `jsonwebtoken` 기본과 같다)
 * - HS: 옛 Express 토큰 모양 그대로(`aud` · `iss` 없음). [legacyUntil] 이 지나면 서명이 맞아도 Invalid — 이중 기간 끝 = 이 값 하나
 * - 만료를 먼저 가르지 않는다: 서명이 틀린 토큰은 만료돼 있어도 Invalid(만료 문구가 서명 확인 전에 나가지 않게)
 */
class DualTokenVerifier(
    private val trusted: TrustedKeys,
    private val audience: String,
    private val legacySecret: String,
    private val legacyUntil: Instant,
    private val clock: Clock,
) {
    fun check(token: String): TokenCheck {
        val jwt = runCatching { SignedJWT.parse(token) }.getOrNull() ?: return TokenCheck.Invalid
        return when (jwt.header.algorithm) {
            JWSAlgorithm.RS256 -> checkRs(jwt)
            JWSAlgorithm.HS256 -> checkLegacy(jwt)
            else -> TokenCheck.Invalid
        }
    }

    private fun checkRs(jwt: SignedJWT): TokenCheck {
        val kid = jwt.header.keyID ?: return TokenCheck.Invalid
        val key = (trusted.jwkSet(false).getKeyByKeyId(kid) ?: trusted.jwkSet(true).getKeyByKeyId(kid)) as? RSAKey
            ?: return TokenCheck.Invalid
        if (!runCatching { jwt.verify(RSASSAVerifier(key)) }.getOrDefault(false)) return TokenCheck.Invalid
        val claims = jwt.jwtClaimsSet
        if (claims.issuer != SaltTokens.ISSUER || audience !in claims.audience.orEmpty()) return TokenCheck.Invalid
        return expiryOf(claims) ?: TokenCheck.Valid(claims, legacy = false)
    }

    private fun checkLegacy(jwt: SignedJWT): TokenCheck {
        if (!clock.instant().isBefore(legacyUntil)) return TokenCheck.Invalid
        val verifier = runCatching { MACVerifier(legacySecret.toByteArray(Charsets.UTF_8)) }.getOrNull() ?: return TokenCheck.Invalid
        if (!runCatching { jwt.verify(verifier) }.getOrDefault(false)) return TokenCheck.Invalid
        val claims = jwt.jwtClaimsSet
        // 옛 토큰에는 aud 가 없다. aud 가 있는 HS 토큰은 옛 게스트(salt-guest) — 사람 · 갱신 경로에서 받지 않는다
        if (claims.audience.orEmpty().isNotEmpty()) return TokenCheck.Invalid
        return expiryOf(claims) ?: TokenCheck.Valid(claims, legacy = true)
    }

    /** `exp` 없으면 Invalid(옛 발급도 늘 넣었다) · 지금 ≥ exp 면 Expired(`jsonwebtoken` 과 같은 경계) */
    private fun expiryOf(claims: JWTClaimsSet): TokenCheck? {
        val exp = claims.expirationTime?.toInstant() ?: return TokenCheck.Invalid
        return if (clock.instant().isBefore(exp)) null else TokenCheck.Expired
    }
}
