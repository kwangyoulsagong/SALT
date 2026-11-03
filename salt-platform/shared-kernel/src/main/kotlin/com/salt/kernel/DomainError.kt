package com.salt.kernel

/**
 * 오류의 의미 분류. **도메인은 HTTP status 를 알지 않는다** — 404 · 409 로 옮기는 것은 `support/web` 의 한 곳이다.
 *
 * 값 일곱과 그 HTTP 매핑은 Express `shared/domain/DomainError.ts` 와 **같다**(BFF 무변경이 합격 기준, `SRV-REQ-043` FR-6).
 * 값을 늘리면 Express 쪽에도 같은 값이 있어야 한다 — 이전 기간엔 두 서버가 같은 오류를 같은 코드로 내야 그림자 비교가 맞는다.
 */
enum class ErrorKind {
    NOT_FOUND,
    CONFLICT,
    INVALID,
    BLOCKED,
    FORBIDDEN,
    UNAUTHENTICATED,
    UNAVAILABLE,
}

/**
 * 도메인 예외 기반 타입 — 서비스 예외가 이것을 상속하고 [code] 를 들고 온다. 전역 오류 처리가 서비스를 모른 채 응답을 만든다.
 *
 * `sealed` 가 아니라 `abstract` 다 — sealed 의 하위 타입은 같은 모듈 · 패키지에만 둘 수 있어, 서비스 모듈의 예외가 상속할 수 없다
 * (`kotlin-platform.md` §3 의 "sealed class" 는 S0 에서 이렇게 정정).
 *
 * @param details 화면이 문구 옆에 그릴 숫자 · 식별자. 응답 본문 최상위에 그대로 실린다. **원인 메시지 · 내부 값을 넣지 않는다**
 */
abstract class DomainError(
    val code: String,
    val kind: ErrorKind,
    message: String,
    val details: Map<String, Any?> = emptyMap(),
) : RuntimeException(message)
