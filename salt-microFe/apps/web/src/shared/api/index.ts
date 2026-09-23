/**
 * 네트워크 진입점.
 *
 * **모든 BFF 호출은 `apiFetch` 를 지난다.** 마지막 `axios` 직접 호출 둘(시세 조회 ·
 * 관심 종목 토글)을 `FE-REQ-035` 에서 옮겼고, `axios` import 는 lint 가 막는다.
 * 토큰 부착·에러 정규화·타임아웃은 아직 호출하는 쪽이 한다 — 공통화는 호출 모양이
 * 셋 이상 겹칠 때 `apiFetch` 위에 올린다.
 */
export * from "./apiFetch";
export * from "./authToken";
export * from "./refreshSession";
export * from "./useHasAccessToken";
export * from "./websocket";
