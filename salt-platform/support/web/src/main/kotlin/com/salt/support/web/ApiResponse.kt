package com.salt.support.web

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity

/**
 * 성공 응답 envelope `{ success, message, data }` — Express `ResponseUtil` 과 같은 모양 · 같은 기본 문구
 * (`api-contract.md` "응답"). BFF 는 `response.data.data` 로 읽는다.
 */
data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T,
) {
    companion object {
        fun <T> ok(data: T, message: String = "success"): ResponseEntity<ApiResponse<T>> =
            ResponseEntity.ok(ApiResponse(true, message, data))

        fun <T> created(data: T, message: String = "Created successfully"): ResponseEntity<ApiResponse<T>> =
            ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse(true, message, data))
    }
}
