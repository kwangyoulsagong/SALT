package com.salt.identity.infrastructure

import com.nimbusds.jose.jwk.JWK
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.KeyUse
import com.nimbusds.jose.jwk.RSAKey
import com.salt.identity.infrastructure.jooq.Tables.SIGNING_KEY
import com.salt.support.web.TrustedKeys
import org.jooq.DSLContext
import java.security.KeyFactory
import java.security.interfaces.RSAPrivateCrtKey
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.RSAPublicKeySpec
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import java.util.Base64
import java.util.concurrent.atomic.AtomicReference

/**
 * 서명 키(`DB-REQ-040` FR-5 · `SRV-REQ-048` FR-8). **개인키는 환경 변수뿐**(`IDENTITY_SIGNING_KEY` — PKCS#8 PEM), 표에는 공개 부분만.
 *
 * - kid = RFC 7638 지문 — 같은 키면 같은 kid 라 기동마다 [register] 해도 행 하나
 * - JWKS = 은퇴 전 키 전부(retired_at 없음 또는 미래). 키를 바꾸면 옛 키 행이 남아 옛 토큰이 만료될 때까지 검증된다
 * - 검증은 요청마다라 1분 캐시. 모르는 kid 면 한 번 다시 읽는다(5초에 한 번 — 틀린 kid 를 마구 보내도 DB 를 두드리지 않게)
 */
class SigningKeys(private val dsl: DSLContext, private val clock: Clock) : TrustedKeys {
    private data class Cached(val set: JWKSet, val loadedAt: Instant)

    private val cache = AtomicReference<Cached?>(null)

    /** 지금 서명 키의 공개 부분을 JWKS 에 올린다 — 이미 있으면 그대로(활성 시각을 덮지 않는다) */
    fun register(key: RSAKey) {
        dsl.insertInto(SIGNING_KEY)
            .set(SIGNING_KEY.KID, key.keyID)
            .set(SIGNING_KEY.PUBLIC_JWK, key.toPublicJWK().toJSONString())
            .set(SIGNING_KEY.ACTIVATED_AT, clock.instant().atOffset(ZoneOffset.UTC))
            .onConflict(SIGNING_KEY.KID)
            .doNothing()
            .execute()
        cache.set(null)
    }

    override fun jwkSet(refresh: Boolean): JWKSet {
        val now = clock.instant()
        val cached = cache.get()
        val fresh = cached != null && Duration.between(cached.loadedAt, now) < TTL
        val canReload = cached == null || Duration.between(cached.loadedAt, now) >= MIN_RELOAD
        if (cached != null && (fresh && !refresh || !canReload)) return cached.set
        val keys = dsl.select(SIGNING_KEY.PUBLIC_JWK).from(SIGNING_KEY)
            .where(SIGNING_KEY.RETIRED_AT.isNull.or(SIGNING_KEY.RETIRED_AT.gt(now.atOffset(ZoneOffset.UTC))))
            .orderBy(SIGNING_KEY.ACTIVATED_AT.desc())
            .fetch { JWK.parse(it.value1()) }
        return JWKSet(keys).also { cache.set(Cached(it, now)) }
    }

    companion object {
        private val TTL = Duration.ofMinutes(1)
        private val MIN_RELOAD = Duration.ofSeconds(5)

        /** PKCS#8 PEM(줄바꿈 또는 `\n` 글자) → 서명용 RSA JWK(kid = 지문 · 용도 sig · RS256). 2048비트 미만은 거절 */
        fun fromPem(pem: String): RSAKey {
            val body = pem.replace("\\n", "\n")
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace(Regex("\\s"), "")
            val private = KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(Base64.getDecoder().decode(body))) as RSAPrivateCrtKey
            require(private.modulus.bitLength() >= 2048) { "IDENTITY_SIGNING_KEY 는 RSA 2048비트 이상이어야 한다" }
            val public = KeyFactory.getInstance("RSA").generatePublic(RSAPublicKeySpec(private.modulus, private.publicExponent))
            val unnamed = RSAKey.Builder(public as java.security.interfaces.RSAPublicKey).privateKey(private).build()
            return RSAKey.Builder(unnamed).keyIDFromThumbprint().keyUse(KeyUse.SIGNATURE)
                .algorithm(com.nimbusds.jose.JWSAlgorithm.RS256).build()
        }
    }
}
