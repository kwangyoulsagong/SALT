package com.salt.support.web

import com.nimbusds.jose.JOSEObjectType
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.Base64
import java.util.Date

/**
 * 이중 검증 경계 표(`SRV-REQ-048` FR-8 · 수용 기준 "이중 검증 기간 옛 · 새 토큰 모두 통과, 종료 후 옛 토큰 401").
 *
 * 불변식 둘 — ① 받는 쪽(`aud`)이 다른 토큰은 서로의 경로를 지나지 못한다(갱신 · 게스트 → API 0) ② 옛 HS 는 끝 시각부터 서명이 맞아도 거절.
 * 같은 표를 Express 판(`salt-server` `tokenVerifier.test.ts`)이 그대로 돈다.
 */
class DualTokenVerifierSpec : StringSpec({
    val now = Instant.parse("2026-11-12T03:00:00Z")
    val until = Instant.parse("2026-11-26T15:00:00Z")
    val secret = "legacy-secret-at-least-32-bytes-long-0123"
    val key: RSAKey = RSAKeyGenerator(2048).keyIDFromThumbprint(true).generate()
    val stranger: RSAKey = RSAKeyGenerator(2048).keyIDFromThumbprint(true).generate()
    val keys = TrustedKeys { JWKSet(key.toPublicJWK()) }

    fun verifier(at: Instant = now, audience: String = SaltTokens.AUDIENCE_API) =
        DualTokenVerifier(keys, audience, secret, until, Clock.fixed(at, ZoneOffset.UTC))

    fun claims(aud: String? = SaltTokens.AUDIENCE_API, iss: String? = SaltTokens.ISSUER, exp: Instant? = now.plusSeconds(900)) =
        JWTClaimsSet.Builder().claim("userId", "u1").claim("email", "u1@example.com")
            .apply { aud?.let { audience(it) }; iss?.let { issuer(it) }; exp?.let { expirationTime(Date.from(it)) } }
            .issueTime(Date.from(now.minusSeconds(10))).build()

    fun rs(c: JWTClaimsSet, signer: RSAKey = key, kid: String? = signer.keyID) =
        SignedJWT(JWSHeader.Builder(JWSAlgorithm.RS256).apply { kid?.let { keyID(it) } }.type(JOSEObjectType.JWT).build(), c)
            .apply { sign(RSASSASigner(signer)) }.serialize()

    fun hs(c: JWTClaimsSet, s: String = secret) = SignedJWT(JWSHeader(JWSAlgorithm.HS256), c).apply { sign(MACSigner(s)) }.serialize()

    // 옛 Express 토큰 모양 — aud · iss 없음
    val legacy = claims(aud = null, iss = null)

    "새 RS · 옛 HS 둘 다 통과 — 이중 기간" {
        verifier().check(rs(claims())).shouldBeInstanceOf<TokenCheck.Valid>().legacy shouldBe false
        verifier().check(hs(legacy)).shouldBeInstanceOf<TokenCheck.Valid>().legacy shouldBe true
    }

    "끝 시각부터 옛 HS 는 서명이 맞아도 Invalid · 1초 전은 통과 · 새 RS 는 그대로" {
        verifier(at = until).check(hs(legacy.copy(exp = until.plusSeconds(60)))) shouldBe TokenCheck.Invalid
        verifier(at = until.minusSeconds(1)).check(hs(legacy.copy(exp = until.plusSeconds(60)))).shouldBeInstanceOf<TokenCheck.Valid>()
        verifier(at = until.plusSeconds(1)).check(rs(claims(exp = until.plusSeconds(600)))).shouldBeInstanceOf<TokenCheck.Valid>()
    }

    "받는 쪽이 다르면 Invalid — 갱신 · 게스트 · aud 없는 RS 는 API 를 못 지난다" {
        verifier().check(rs(claims(aud = SaltTokens.AUDIENCE_REFRESH))) shouldBe TokenCheck.Invalid
        verifier().check(rs(claims(aud = SaltTokens.AUDIENCE_GUEST))) shouldBe TokenCheck.Invalid
        verifier().check(rs(claims(aud = null))) shouldBe TokenCheck.Invalid
        // 거꾸로 — 갱신 검증기는 접근 토큰을 받지 않는다
        verifier(audience = SaltTokens.AUDIENCE_REFRESH).check(rs(claims())) shouldBe TokenCheck.Invalid
        verifier(audience = SaltTokens.AUDIENCE_REFRESH).check(rs(claims(aud = SaltTokens.AUDIENCE_REFRESH))).shouldBeInstanceOf<TokenCheck.Valid>()
    }

    "옛 HS 에 aud 가 있으면(옛 게스트 모양) Invalid · 다른 비밀 Invalid" {
        verifier().check(hs(claims(aud = SaltTokens.AUDIENCE_GUEST, iss = null))) shouldBe TokenCheck.Invalid
        verifier().check(hs(legacy, "another-secret-at-least-32-bytes-long-999")) shouldBe TokenCheck.Invalid
    }

    "발급자 다름 · 모르는 kid · kid 없음 · 믿지 않는 키 서명 Invalid" {
        verifier().check(rs(claims(iss = "someone"))) shouldBe TokenCheck.Invalid
        verifier().check(rs(claims(), signer = stranger)) shouldBe TokenCheck.Invalid
        verifier().check(rs(claims(), kid = null)) shouldBe TokenCheck.Invalid
        // 믿는 kid 를 달고 다른 키로 서명
        verifier().check(rs(claims(), signer = stranger, kid = key.keyID)) shouldBe TokenCheck.Invalid
    }

    "만료 경계 — exp 정각은 Expired · 1초 전 통과 · exp 없음 Invalid" {
        verifier().check(rs(claims(exp = now))) shouldBe TokenCheck.Expired
        verifier().check(rs(claims(exp = now.plusSeconds(1)))).shouldBeInstanceOf<TokenCheck.Valid>()
        verifier().check(hs(legacy.copy(exp = now))) shouldBe TokenCheck.Expired
        verifier().check(rs(claims(exp = null))) shouldBe TokenCheck.Invalid
    }

    "서명이 틀리면 만료여도 Invalid — 만료 문구가 서명 확인 전에 나가지 않는다" {
        verifier().check(rs(claims(exp = now.minusSeconds(60)), signer = stranger, kid = key.keyID)) shouldBe TokenCheck.Invalid
        verifier().check(hs(legacy.copy(exp = now.minusSeconds(60)), "another-secret-at-least-32-bytes-long-999")) shouldBe TokenCheck.Invalid
    }

    "알고리즘 none · 다른 알고리즘 · 깨진 글자 Invalid" {
        val none = Base64.getUrlEncoder().withoutPadding().encodeToString("""{"alg":"none"}""".toByteArray()) + "." +
            Base64.getUrlEncoder().withoutPadding().encodeToString(legacy.toString().toByteArray()) + "."
        verifier().check(none) shouldBe TokenCheck.Invalid
        verifier().check("abc.def.ghi") shouldBe TokenCheck.Invalid
        verifier().check("") shouldBe TokenCheck.Invalid
        val hs512 = SignedJWT(JWSHeader(JWSAlgorithm.HS512), legacy).apply { sign(MACSigner(secret + secret)) }.serialize()
        verifier().check(hs512) shouldBe TokenCheck.Invalid
    }

    "모르는 kid 면 키를 다시 읽는다 — 키를 막 바꾼 직후" {
        var current = JWKSet(stranger.toPublicJWK())
        val rotating = TrustedKeys { refresh -> if (refresh) JWKSet(key.toPublicJWK()).also { current = it } else current }
        DualTokenVerifier(rotating, SaltTokens.AUDIENCE_API, secret, until, Clock.fixed(now, ZoneOffset.UTC))
            .check(rs(claims())).shouldBeInstanceOf<TokenCheck.Valid>()
    }
})

private fun JWTClaimsSet.copy(exp: Instant): JWTClaimsSet = JWTClaimsSet.Builder(this).expirationTime(Date.from(exp)).build()
