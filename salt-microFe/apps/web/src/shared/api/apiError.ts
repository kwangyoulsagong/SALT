/**
 * BFF 호출 실패의 한 가지 모양 — `{ status, code, retriable }` (`FE-REQ-012` FR-41).
 *
 * 정의 · 판정 · 테스트는 `@repo/core/http`(`apiError.ts`)에 있다 — 플랫폼 무관이고 RN 도 같은 판정을 쓴다.
 * 슬라이스는 이 세그먼트(`@/shared/api`)로만 가져온다.
 */
export {
  ApiError,
  hasApiStatus,
  isApiError,
  isClientApiError,
  isRetriable,
  readApiError,
  retryWhileRetriable,
} from "@repo/core/http";
