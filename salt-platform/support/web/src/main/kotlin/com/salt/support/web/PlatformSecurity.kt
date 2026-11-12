package com.salt.support.web

import org.springframework.beans.factory.ObjectProvider
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
import org.springframework.security.oauth2.jwt.BadJwtException
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.bind.support.WebDataBinderFactory
import org.springframework.web.context.request.NativeWebRequest
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.method.support.ModelAndViewContainer
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping
import tools.jackson.databind.json.JsonMapper
import java.time.Clock

/**
 * 리소스 서버(JWT 검증) — Express `authMiddleware` 의 Kotlin 판.
 *
 * - 공개 경로 밖은 전부 인증 필요(Express 는 경로마다 붙였다 — 여기서는 기본이 닫힘)
 * - **이중 검증(서버 S3b 2026-11-12)** — identity 가 발급하는 RS256(`aud` = salt-api) + 옛 Express HS256 을 `salt.auth.legacy-hs-until` 까지.
 *   판정은 [DualTokenVerifier] 한 곳(identity 의 갱신 토큰 읽기도 같은 것을 쓴다). 키는 [TrustedKeys] — identity 조립이 꽂는다
 * - 시계 오차 허용 0 — `jsonwebtoken` 기본과 같다. Nimbus 기본 60초를 쓰면 Express 가 거부한 만료 토큰을 1분 더 받는다
 * - 401 바디 문구 셋은 Express 와 같다: `No token provided` · `Invalid token` · `Token expired`
 * - **없는 경로는 토큰이 없어도 404** — Express 는 인증을 경로마다 붙여서 없는 경로가 401 이 아니라 404 다.
 *   보안 필터는 라우팅보다 먼저 돌므로, 인증 실패를 쓰기 전에 그 요청을 받을 컨트롤러가 있는지 본다
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AuthProperties::class)
class PlatformSecurity(private val properties: AuthProperties) : WebMvcConfigurer {
    @Bean
    fun jwtDecoder(trusted: TrustedKeys, clock: Clock): JwtDecoder {
        val verifier = DualTokenVerifier(trusted, SaltTokens.AUDIENCE_API, properties.jwtSecret, properties.legacyHsUntil, clock)
        return JwtDecoder { token ->
            when (val check = verifier.check(token)) {
                // 문구에 expired 가 있어야 진입점이 `Token expired` 로 답한다(아래 ExpressStyleEntryPoint)
                TokenCheck.Expired -> throw BadJwtException("Jwt expired")
                TokenCheck.Invalid -> throw BadJwtException("Invalid token")
                is TokenCheck.Valid -> Jwt.withTokenValue(token)
                    .header("alg", if (check.legacy) "HS256" else "RS256")
                    .claims { claims ->
                        claims["userId"] = check.claims.getStringClaim("userId")
                        claims["email"] = check.claims.getStringClaim("email")
                        claims["exp"] = check.claims.expirationTime.toInstant()
                        check.claims.issueTime?.let { claims["iat"] = it.toInstant() }
                    }
                    .build()
            }
        }
    }

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        jsonMapper: JsonMapper,
        handlerMappings: ObjectProvider<RequestMappingHandlerMapping>,
    ): SecurityFilterChain {
        val entryPoint = ExpressStyleEntryPoint(jsonMapper, handlerMappings)
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it.requestMatchers(*properties.publicPaths.toTypedArray()).permitAll()
                it.anyRequest().authenticated()
            }
            .oauth2ResourceServer { it.jwt { }.bearerTokenResolver(bearerOutsidePublicPaths()).authenticationEntryPoint(entryPoint) }
            .exceptionHandling { it.authenticationEntryPoint(entryPoint) }
        return http.build()
    }

    /**
     * 공개 경로에서는 `Authorization` 을 읽지 않는다 — Express 는 인증을 경로마다 붙여 공개 경로가 헤더를 보지 않았다.
     * Spring 기본은 공개 경로라도 실린 토큰을 검증해 401 을 준다. BFF 프록시는 토큰 없는 로그인에도 `Bearer undefined` 를 싣는다
     * (서버 S3b 2026-11-12 실스택에서 로그인 401 로 드러남) — BFF 무변경이 합격 기준이라 여기서 Express 와 같게 한다
     */
    private fun bearerOutsidePublicPaths(): BearerTokenResolver {
        val defaults = DefaultBearerTokenResolver()
        val matchers = properties.publicPaths.map { PathPatternRequestMatcher.withDefaults().matcher(it) }
        return BearerTokenResolver { request -> if (matchers.any { it.matches(request) }) null else defaults.resolve(request) }
    }

    override fun addArgumentResolvers(resolvers: MutableList<HandlerMethodArgumentResolver>) {
        resolvers.add(AuthenticatedUserResolver)
    }

    private class ExpressStyleEntryPoint(
        private val jsonMapper: JsonMapper,
        private val handlerMappings: ObjectProvider<RequestMappingHandlerMapping>,
    ) : AuthenticationEntryPoint {
        override fun commence(
            request: jakarta.servlet.http.HttpServletRequest,
            response: jakarta.servlet.http.HttpServletResponse,
            authException: AuthenticationException,
        ) {
            response.contentType = MediaType.APPLICATION_JSON_VALUE
            response.characterEncoding = Charsets.UTF_8.name()
            if (!routeExists(request)) {
                response.status = HttpStatus.NOT_FOUND.value()
                jsonMapper.writeValue(response.outputStream, ErrorBodies.noRoute(request))
                return
            }
            val message = when {
                authException !is InvalidBearerTokenException -> "No token provided"
                authException.message.orEmpty().contains("expired", ignoreCase = true) -> "Token expired"
                else -> "Invalid token"
            }
            response.status = HttpStatus.UNAUTHORIZED.value()
            jsonMapper.writeValue(response.outputStream, ErrorBodies.plain(message))
        }

        /** 경로 + 메서드가 맞는 컨트롤러가 있는가. 메서드만 틀린 것(던짐)도 없는 것 — Express 와 같이 404 */
        private fun routeExists(request: jakarta.servlet.http.HttpServletRequest): Boolean =
            handlerMappings.orderedStream().anyMatch { mapping -> runCatching { mapping.getHandler(request) != null }.getOrDefault(false) }
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
