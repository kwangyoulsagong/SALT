/**
 * 코치 upstream 경로. origin 은 `shared/config` 에 있고 경로는 이 슬라이스가 갖는다.
 *
 * **`mode` 를 싣지 않는다** (`FE-REQ-028` FR-85). 응답에 두 모드가 다 있고, 첫 모드는
 * 서버가 정한다(B16). 모드를 보내면 쿼리 키에도 넣어야 해서 모드 전환이 요청이 된다.
 */
export const COACH_ENDPOINTS = {
  symbolDetail: (symbol: string) =>
    `/api/app/ai-coach/detail?symbol=${encodeURIComponent(symbol)}`,
  /** 코치 리포트 (`BFF-REQ-023`). 종목 판단과 다른 화면 · 다른 경로다 */
  report: "/api/app/coach/report",
  /** 재생성 버튼 상태 · 202 뒤 폴링 (`BFF-REQ-023` FR-61~63) */
  generationStatus: "/api/app/coach/generation-status",
  /** 가격 변동 범위 — 소유자 전용, 아니면 404 (`BFF-REQ-037`) */
  forecast: (symbol: string) => `/api/app/coach/forecast?symbol=${encodeURIComponent(symbol)}`,
  /** 주요 사건(거시 일정) · 과거 반응 — 소유자 전용, 아니면 404 (`BFF-REQ-037` FR-8) */
  events: (symbol: string) => `/api/app/coach/events?symbol=${encodeURIComponent(symbol)}`,
} as const;
