package com.salt.identity.api

import com.salt.support.web.TrustedKeys
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.util.concurrent.TimeUnit

/**
 * JWKS(`SRV-REQ-048` FR-8) — identity 가 발급한 RS256 토큰을 검증하는 공개키. 인증 없음(공개 경로).
 * 받는 쪽: Express `authMiddleware` · `marketReaderMiddleware`(`IDENTITY_JWKS_URL`). 플랫폼 안은 같은 [TrustedKeys] 를 직접 쓴다.
 * 공개 부분만 — `JWKSet.toString()` 은 개인 칸을 싣지 않는다(표에도 공개 부분만 있다).
 */
@Tag(name = "identity", description = "JWKS — 토큰 검증 공개키(SRV-REQ-048 FR-8)")
@RestController
class JwksController(private val keys: TrustedKeys) {
    @Operation(summary = "JWKS — 은퇴 전 서명 키의 공개 부분")
    @GetMapping("/.well-known/jwks.json", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun jwks(): ResponseEntity<String> =
        ResponseEntity.ok().cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES)).body(keys.jwkSet(false).toString(true))
}
