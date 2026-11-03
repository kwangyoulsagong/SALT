package com.salt.support.web

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.MethodParameter
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.AuthenticationException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtTimestampValidator
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.bind.support.WebDataBinderFactory
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.method.support.ModelAndViewContainer
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import tools.jackson.databind.json.JsonMapper
import java.time.Duration
import javax.crypto.spec.SecretKeySpec

/**
 * 리소스 서버(JWT 검증) — Express `authMiddleware` 의 Kotlin 판.
 *
 * - 공개 경로 밖은 전부 인증 필요(Express 는 경로마다 붙였다 — 여기서는 기본이 닫힘)
 * - 시계 오차 허용 0 — `jsonwebtoken` 기본과 같다. Nimbus 기본 60초를 쓰면 Express 가 거부한 만료 토큰을 1분 더 받는다
 * - 401 바디 문구 셋은 Express 와 같다: `No token provided` · `Invalid token` · `Token expired`
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AuthProperties::class)
class PlatformSecurity(private val properties: AuthProperties) : WebMvcConfigurer {
    @Bean
    fun jwtDecoder(): JwtDecoder {
        val key = SecretKeySpec(properties.jwtSecret.toByteArray(Charsets.UTF_8), "HmacSHA256")
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build().apply {
            setJwtValidator(DelegatingOAuth2TokenValidator(JwtTimestampValidator(Duration.ZERO)))
        }
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity, jsonMapper: JsonMapper): SecurityFilterChain {
        val entryPoint = ExpressStyleEntryPoint(jsonMapper)
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers(*properties.publicPaths.toTypedArray()).permitAll()
                it.anyRequest().authenticated()
            }
            .oauth2ResourceServer { it.jwt { } .authenticationEntryPoint(entryPoint) }
            .exceptionHandling { it.authenticationEntryPoint(entryPoint) }
        return http.build()
    }

    override fun addArgumentResolvers(resolvers: MutableList<HandlerMethodArgumentResolver>) {
        resolvers.add(AuthenticatedUserResolver)
    }

    private class ExpressStyleEntryPoint(private val jsonMapper: JsonMapper) : AuthenticationEntryPoint {
        override fun commence(
            request: jakarta.servlet.http.HttpServletRequest,
            response: jakarta.servlet.http.HttpServletResponse,
            authException: AuthenticationException,
        ) {
            val message = when {
                authException !is InvalidBearerTokenException -> "No token provided"
                authException.message.orEmpty().contains("expired", ignoreCase = true) -> "Token expired"
                else -> "Invalid token"
            }
            response.status = HttpStatus.UNAUTHORIZED.value()
            response.contentType = MediaType.APPLICATION_JSON_VALUE
            response.characterEncoding = Charsets.UTF_8.name()
            jsonMapper.writeValue(response.outputStream, ErrorBodies.plain(message))
        }
    }

    private object AuthenticatedUserResolver : HandlerMethodArgumentResolver {
        override fun supportsParameter(parameter: MethodParameter): Boolean =
            parameter.parameterType == AuthenticatedUser::class.java

        override fun resolveArgument(
            parameter: MethodParameter,
            mavContainer: ModelAndViewContainer?,
            webRequest: NativeWebRequest,
            binderFactory: WebDataBinderFactory?,
        ): AuthenticatedUser {
            val jwt: Jwt = (SecurityContextHolder.getContext().authentication as JwtAuthenticationToken).token
            // Express 토큰은 `sub` 가 아니라 `userId` · `email` 클레임을 든다(`shared/lib/jwt.ts`)
            return AuthenticatedUser(
                userId = requireNotNull(jwt.getClaimAsString("userId")) { "userId 클레임 없음" },
                email = jwt.getClaimAsString("email").orEmpty(),
            )
        }
    }
}
