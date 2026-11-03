package com.salt.support.web

import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Size
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.validation.annotation.Validated

/**
 * 인증 설정. **비밀에 기본값 0** — 없으면 기동 실패(`kotlin-platform.md` §6).
 *
 * S3 전까지는 Express 와 같은 공용 비밀(`JWT_SECRET`, HS256)로 검증한다(`SRV-REQ-043` FR-7). S3 에서 identity JWKS 로(`SRV-REQ-048`).
 * 32자 하한 = HS256 이 요구하는 256비트. 짧은 비밀은 Nimbus 가 거부하므로 기동 때 먼저 막는다.
 */
@Validated
@ConfigurationProperties("salt.auth")
data class AuthProperties(
    @field:Size(min = 32, message = "HS256 비밀은 32바이트 이상이어야 한다")
    val jwtSecret: String,
    @field:NotEmpty
    val publicPaths: List<String> = listOf("/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**"),
)
