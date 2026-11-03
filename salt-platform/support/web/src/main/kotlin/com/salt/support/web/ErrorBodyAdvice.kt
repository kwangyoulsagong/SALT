package com.salt.support.web

import com.salt.kernel.DomainError
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException
import jakarta.servlet.http.HttpServletRequest

/**
 * 오류 → 응답 한 곳(Express `errorMiddleware` 자리). 서비스는 [DomainError] 를 던지기만 한다.
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
        return ResponseEntity.status(status).body(ErrorBodies.domain(error))
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

    /** 경로 없음 — Express 404 handler 와 같은 문구 `Route <원래 주소> not found`. */
    @ExceptionHandler(NoResourceFoundException::class)
    fun noRoute(request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        val original = request.requestURI + (request.queryString?.let { "?$it" } ?: "")
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ErrorBodies.plain("Route $original not found"))
    }

    @ExceptionHandler(Exception::class)
    fun unexpected(error: Exception, request: HttpServletRequest): ResponseEntity<Map<String, Any?>> {
        log.error("Error {} {}", request.method, request.requestURI, error)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ErrorBodies.plain(ErrorBodies.INTERNAL))
    }

    private fun badRequest(issues: List<ErrorBodies.FieldIssue>): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorBodies.validation(issues))
}
