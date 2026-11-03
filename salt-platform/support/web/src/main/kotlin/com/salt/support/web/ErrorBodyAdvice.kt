package com.salt.support.web

import com.salt.kernel.DomainError
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.ErrorResponse
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException
import jakarta.servlet.http.HttpServletRequest

/**
 * 오류 → 응답 한 곳(Express `errorMiddleware` 자리). 서비스는 [DomainError] 를 던지기만 한다.
 *
 * 오류 바디는 **늘 JSON** — `Accept` 협상을 타지 않는다(Express 와 같다. XML 만 받는 요청에서 406 이 500 으로 바뀌던 것, S0 리뷰).
 *
 * 로그 규칙도 Express 와 같다 — 5xx 는 error(스택), 4xx 는 warn 한 줄(`code` · 사유). **본문 · 토큰 · 금액은 로그에 없다.**
 */
@RestControllerAdvice
class ErrorBodyAdvice {
    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(DomainError::class)
    fun domain(error: DomainError, request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        val status = ErrorBodies.status(error.kind)
        log.warn("Request rejected {} {} {} {}", status.value(), error.code, request.method, request.requestURI)
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(ErrorBodies.domain(error))
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun invalidBody(error: MethodArgumentNotValidException): ResponseEntity<Map<String, Any?>> =
        badRequest(error.bindingResult.fieldErrors.map { ErrorBodies.FieldIssue(it.field, it.defaultMessage ?: "invalid") })

    @ExceptionHandler(HandlerMethodValidationException::class)
    fun invalidParameter(error: HandlerMethodValidationException): ResponseEntity<Map<String, Any?>> =
        badRequest(
            error.parameterValidationResults.flatMap { result ->
                result.resolvableErrors.map { ErrorBodies.FieldIssue(result.methodParameter.parameterName ?: "", it.defaultMessage ?: "invalid") }
            },
        )

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun typeMismatch(error: MethodArgumentTypeMismatchException): ResponseEntity<Map<String, Any?>> =
        badRequest(listOf(ErrorBodies.FieldIssue(error.name, "invalid")))

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun unreadable(): ResponseEntity<Map<String, Any?>> = badRequest(listOf(ErrorBodies.FieldIssue("", "Invalid JSON")))

    @ExceptionHandler(MissingServletRequestParameterException::class)
    fun missingParameter(error: MissingServletRequestParameterException): ResponseEntity<Map<String, Any?>> =
        badRequest(listOf(ErrorBodies.FieldIssue(error.parameterName, "Required")))

    /**
     * 경로 없음 — Express 404 handler 와 같은 문구 `Route <원래 주소> not found`. **메서드가 틀린 것(405)도 404** —
     * Express 는 경로 + 메서드가 맞는 라우터가 없으면 404 로 떨어진다(그림자 비교가 `$status` 차이를 내지 않게).
     */
    @ExceptionHandler(NoResourceFoundException::class, HttpRequestMethodNotSupportedException::class)
    fun noRoute(request: HttpServletRequest): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON).body(ErrorBodies.noRoute(request))

    /**
     * 그 밖의 Spring MVC 4xx(415 미디어 타입 · `ResponseStatusException` 등) — 상태는 그대로, 500 으로 올리지 않는다.
     * 5xx 인 것만 아래 [unexpected] 와 같이 error 로그.
     */
    private fun framework(error: ErrorResponse, request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        val status = error.statusCode
        log.warn("Request rejected {} {} {} {}", status.value(), (error as Any).javaClass.simpleName, request.method, request.requestURI)
        val reason = HttpStatus.resolve(status.value())?.reasonPhrase ?: "Request rejected"
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(ErrorBodies.plain(reason))
    }

    @ExceptionHandler(Exception::class)
    fun unexpected(error: Exception, request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        // `ErrorResponse` 는 인터페이스라 처리기 대상이 못 된다 — 여기서 갈라 4xx 를 500 으로 올리지 않는다
        if (error is ErrorResponse && error.statusCode.is4xxClientError) return framework(error, request)
        log.error("Error {} {}", request.method, request.requestURI, error)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).contentType(MediaType.APPLICATION_JSON).body(ErrorBodies.plain(ErrorBodies.INTERNAL))
    }

    private fun badRequest(issues: List<ErrorBodies.FieldIssue>): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON).body(ErrorBodies.validation(issues))
}
