package com.salt.support.web

import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

/**
 * 인증 설정. **비밀에 기본값 0** — 없으면 기동 실패(`kotlin-platform.md` §6).
 *
 * S3b(2026-11-12)부터 identity 가 RS256 을 발급하고(JWKS), 옛 공용 비밀(`JWT_SECRET`, HS256) 토큰은 [legacyHsUntil] 까지만 받는다
 * (`SRV-REQ-048` FR-8 — 이중 기간 2주). 그 뒤 HS 코드 · 이 비밀을 지운다.
 * 32자 하한 = HS256 이 요구하는 256비트. 짧은 비밀은 Nimbus 가 거부하므로 기동 때 먼저 막는다.
 */
@Validated
@ConfigurationProperties("salt.auth")
data class AuthProperties(
    @field:Size(min = 32, message = "HS256 비밀은 32바이트 이상이어야 한다")
    val jwtSecret: String,
    /** 옛 HS 토큰을 받는 마지막 시각(이 시각부터 401). 기본값 0 — 이중 기간 끝은 운영 설정이 정한다 */
    val legacyHsUntil: java.time.Instant,
    @field:NotEmpty
    val publicPaths: List<String> = listOf("/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**"),
)
