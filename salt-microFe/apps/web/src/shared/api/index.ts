/**
 * 네트워크 진입점.
 *
 * **아직 공통 HTTP 클라이언트는 없다.** 현재 조회는 슬라이스(`entities/market/api`)가
 * `axios` 를 직접 부르고, 목표·투자·로그인은 MSW 가 받는다. BFF 가 생기는 `FE-REQ-012`
 * 에서 토큰 부착·에러 정규화·타임아웃을 `apiFetch` 위에 붙이고 `axios` 쪽을 그리로 올린다.
 */
export * from "./apiFetch";
export * from "./mockGate";
export * from "./websocket";
