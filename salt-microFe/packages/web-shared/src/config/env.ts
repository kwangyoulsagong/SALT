/**
 * 이 zone 이 부르는 upstream origin.
 *
 * **여기 있는 것은 origin 뿐이다.** 엔드포인트 경로는 그것을 부르는 슬라이스가 갖는다
 * (`entities/market/api/endpoints.ts`). FR-16 — 서버 조회 로직은 쿼리 정의와 같은 자리에 둔다.
 */

/** 인증·목표 API */
export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000";

/**
 * **브라우저가** BFF 를 부르는 앞부분 — 기본은 빈 문자열(같은 origin `/api/*`)이다(`FE-REQ-013` FR-80 2단계, 2026-11-05).
 *
 * 토큰이 httpOnly 쿠키라 브라우저가 BFF 에 싣는 길은 쿠키뿐이고, 쿠키는 같은 origin 이어야 자연히 실린다. 로컬은 셸 rewrites 가
 * `/api/*` 를 BFF 로 넘기고(`@repo/config-next`), 운영은 한 origin 경로 라우팅이 BFF 에 직접 보낸다(`ADR-008`).
 * **서버에서는 쓰지 않는다** — 상대 경로라 서버 `fetch` 가 던진다. 서버 컴포넌트 · Route Handler 는 `BFF_SERVER_URL`.
 */
export const INVESTMENTS_BASE_URL = process.env.NEXT_PUBLIC_INVESTMENTS_BASE_URL || "";

/**
 * **서버가** BFF 를 부르는 절대 origin — 서버 컴포넌트 첫 숫자 · 공개 시세 메타데이터 · 세션 갱신 Route Handler.
 * `NEXT_PUBLIC_` 이 아니다(브라우저 번들에 들어갈 이유가 없다). 셸 rewrites 의 목적지도 이 값이다.
 */
export const BFF_SERVER_URL = process.env.BFF_INTERNAL_URL || "http://localhost:4001";

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
