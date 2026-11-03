package com.salt.support.messaging

import io.micrometer.tracing.Tracer
import io.micrometer.tracing.propagation.Propagator

/**
 * W3C `traceparent` 를 문자열로 들고 다닌다 — 아웃박스 행에 남겨 두었다가 릴레이가 그 추적 아래에서 발행한다.
 * 그래야 "HTTP 요청 → 아웃박스 → 브로커 → 구독"이 **한 추적 ID** 로 이어진다(`SRV-REQ-043` FR-13). 릴레이는 스케줄 스레드라
 * 현재 추적이 없다 — 저장해 두지 않으면 구독 쪽 추적이 요청과 끊긴다.
 *
 * 추적 ID 는 새로 만들지 않는다 — BFF 가 보낸 것을 이어받는다(`kotlin-platform.md` §6).
 */
class TraceParent(private val tracer: Tracer, private val propagator: Propagator) {
    fun current(): String? {
        val context = tracer.currentTraceContext().context() ?: return null
        val carrier = HashMap<String, String>()
        propagator.inject(context, carrier) { map, key, value -> map?.put(key, value) }
        return carrier[HEADER]
    }

    /** [traceParent] 를 부모로 한 span 안에서 [block] 을 돌린다. 값이 없으면 새 span. */
    fun <T> underParent(traceParent: String?, name: String, block: () -> T): T {
        val builder = if (traceParent == null) {
            tracer.spanBuilder()
        } else {
            propagator.extract(mapOf(HEADER to traceParent)) { map, key -> map[key] }
        }
        val span = builder.name(name).start()
        try {
            return tracer.withSpan(span).use { block() }
        } finally {
            span.end()
        }
    }

    companion object {
        const val HEADER = "traceparent"
    }
}
