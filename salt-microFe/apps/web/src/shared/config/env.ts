/**
 * 이 zone 이 부르는 upstream origin.
 *
 * **여기 있는 것은 origin 뿐이다.** 엔드포인트 경로는 그것을 부르는 슬라이스가 갖는다
 * (`entities/market/api/endpoints.ts`). FR-16 — 서버 조회 로직은 쿼리 정의와 같은 자리에 둔다.
 */

/** 인증·목표 API */
export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000";

/** 투자 API — 별도 upstream 이다 */
export const INVESTMENTS_BASE_URL =
  process.env.NEXT_PUBLIC_INVESTMENTS_BASE_URL || "http://localhost:4001";

/** 실시간 시세 WebSocket */
export const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:4002";
