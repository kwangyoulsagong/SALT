package com.salt.identity.api

import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * 인프로세스 요청 제한(고정 창) — 옛 Express `shared/presentation/rateLimit.ts` 와 같은 판단 · 같은 429 문구.
 * 단일 프로세스 · 사용자 ≤10명이라 분산 저장소가 필요 없다. 키는 요청 주소 — BFF 뒤라 사실상 서버 전체 상한(옛것과 같은 처지, `OPS-001` 때 X-Forwarded-For).
 * 창 경계에서 최대 2배가 몰릴 수 있다(고정 창) — 목적은 무인증 경로가 무한정 불리지 않게 하는 것.
 */
class FixedWindowLimit(private val window: Duration, private val max: Int, private val clock: Clock) {
    private data class Window(val count: Int, val resetAt: Instant)

    private val windows = ConcurrentHashMap<String, Window>()

    /** 넘으면 429 — 바디는 오류 처리 한 곳(`ErrorBodyAdvice`)이 `{ success: false, message: "Too Many Requests" }` 로(옛 `TooManyRequestsError()` 그대로) */
    fun acquire(key: String) {
        val now = clock.instant()
        val next = windows.compute(key) { _, current ->
            if (current == null || !current.resetAt.isAfter(now)) Window(1, now.plus(window)) else current.copy(count = current.count + 1)
        }!!
        // 지난 창은 그때 지운다 — 창이 짧아 맵이 무한정 커지지 않는다
        if (next.count == 1) windows.entries.removeIf { !it.value.resetAt.isAfter(now) && it.key != key }
        if (next.count > max) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS)
    }
}
