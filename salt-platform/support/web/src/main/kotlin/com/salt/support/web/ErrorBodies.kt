package com.salt.support.web

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import org.springframework.http.HttpStatus

/**
 * 오류 바디 — Express `errorMiddleware.toErrorResponse` 와 **같은 키 · 같은 순서 · 같은 문구**.
 * 바뀌면 BFF 가 조용히 깨진다(BFF 는 `code` · `message` · `details` 최상위 키를 읽는다). 골든: app `ErrorBodyGoldenTest`.
 */
object ErrorBodies {
    /** `ErrorKind` → HTTP. Express `ERROR_KIND_STATUS` 와 한 줄씩 같다. */
    fun status(kind: ErrorKind): HttpStatus = when (kind) {
        ErrorKind.NOT_FOUND -> HttpStatus.NOT_FOUND
        ErrorKind.CONFLICT -> HttpStatus.CONFLICT
        ErrorKind.INVALID -> HttpStatus.BAD_REQUEST
        ErrorKind.BLOCKED -> HttpStatus.UNPROCESSABLE_CONTENT
        ErrorKind.FORBIDDEN -> HttpStatus.FORBIDDEN
        ErrorKind.UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED
        ErrorKind.UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE
    }

    /** 상세를 먼저 펼친다 — 상세가 `success` · `code` · `message` 를 덮지 못한다(Express 와 같은 순서). */
    fun domain(error: DomainError): Map<String, Any?> =
        LinkedHashMap<String, Any?>(error.details).apply {
            put("success", false)
            put("code", error.code)
            put("message", error.message)
        }

    /** 이관 전 Express 오류(`AppError`)와 같은 모양 — 코드 없이 문구만. 인증 실패 · 경로 없음이 이 모양이다. */
    fun plain(message: String): Map<String, Any?> = linkedMapOf("success" to false, "message" to message)

    /** Express 404 handler: `Route ${req.originalUrl} not found` — 원래 주소 = 경로 + 쿼리. */
    fun noRoute(request: jakarta.servlet.http.HttpServletRequest): Map<String, Any?> =
        plain("Route ${request.requestURI}${request.queryString?.let { "?$it" } ?: ""} not found")

    data class FieldIssue(val field: String, val message: String)

    fun validation(issues: List<FieldIssue>): Map<String, Any?> =
        linkedMapOf("success" to false, "message" to "Validation error", "errors" to issues)

    /** 500 — 운영에서는 원인 문구를 내보내지 않는다(Express `NODE_ENV=production` 과 같은 판단). */
    const val INTERNAL = "Internal server error"
}
