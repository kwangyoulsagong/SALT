/**
 * 코치 upstream 경로. origin 은 `shared/config` 에 있고 경로는 이 슬라이스가 갖는다.
 *
 * **`mode` 를 싣지 않는다** (`FE-REQ-028` FR-85). 응답에 두 모드가 다 있고, 첫 모드는
 * 서버가 정한다(B16). 모드를 보내면 쿼리 키에도 넣어야 해서 모드 전환이 요청이 된다.
 */
export const COACH_ENDPOINTS = {
  symbolDetail: (symbol: string) =>
    `/api/app/ai-coach/detail?symbol=${encodeURIComponent(symbol)}`,
} as const;
