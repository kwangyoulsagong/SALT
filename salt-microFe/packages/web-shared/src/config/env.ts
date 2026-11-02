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

/**
 * 이 사이트의 공개 주소 — canonical · sitemap · Open Graph 의 절대 URL 기준.
 * 배포 도메인이 정해지면 `NEXT_PUBLIC_SITE_URL` 로 준다.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * 이 코드를 서비스하는 zone 앱 이름(`registry.json` 의 `app`) — 각 zone 의 `next.config.js` 가 `env` 로 넣는다(`FE-REQ-053`).
 * 같은 패키지 코드가 셸과 투자 zone 양쪽에 들어가므로 "여기서 이 경로가 다른 zone 인가"는 실행 중인 앱이 정한다.
 * 없으면 셸.
 */
export const ZONE_APP = process.env.NEXT_PUBLIC_ZONE_APP || "web";
