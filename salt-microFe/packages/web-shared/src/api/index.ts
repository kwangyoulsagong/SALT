/**
 * 네트워크 진입점.
 *
 * **모든 BFF 호출은 `apiFetch` 를 지난다.** 마지막 `axios` 직접 호출 둘(시세 조회 ·
 * 관심 종목 토글)을 `FE-REQ-035` 에서 옮겼고, `axios` import 는 lint 가 막는다.
 * 에러 정규화는 `apiError`(`FE-REQ-012` FR-41) 한 곳이다. 토큰은 httpOnly 쿠키라 호출하는 쪽이 붙이지 않는다(`FE-REQ-013` FR-80). 타임아웃은 호출하는 쪽이 한다.
 */
export * from "./apiFetch";
export * from "./apiError";
export * from "./session";
export * from "./refreshSession";
export * from "./useHasSession";
export * from "./websocket";
export * from "./streamSse";
export * from "./useSessionUser";
export * from "./countUsage";
