# BFF-REQ-055 체크리스트 — 게스트 쿠키 · 시장 경로 · 게스트 실시간 상한

커밋 `3a450fb7`. 2026-11-10.

## FR ↔ 구현

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 쿠키 순서 | `utils/session-cookie.util.ts` `sessionTokenFromCookie`(사람 `salt_at` → 게스트 `salt_gt`) — REST `cookieSession.middleware` · WS `websocket/server.ts` 같은 함수 | 경계 표(게스트만 · 둘 다 → 사람 · 게스트 + 다른 사이트 → 없음 · 헤더 우선) · 실화면 쿠키 `salt_gt` 로 시장 경로 200 |
| FR-2 시장 경로 | **경로 변경 없음(정정)** — BFF `authMiddleware` 는 헤더가 **있나**만 보므로 게스트 토큰이 실리면 지난다. 사람 경로 거절은 서버. 더한 것은 발급 통과 `POST /api/auth/guest` 하나 | 게스트 토큰으로 시장 16 경로 200 · 사람 경로 401(서버 답 그대로) |
| FR-3 사람 칸 | `asset-search.viewmodel.ts` `isTracked` · `isHeld` `boolean \| null`(지어내지 않음) · 시장 화면 조합(`/api/app/market` · `/:symbol`)은 사람 경로를 부르지 않아 변경 없음 | 뷰모델 테스트 게스트 행 |
| FR-4 실시간 상한 | `kr-stream.manager.ts` `MAX_RELAYS{user, guest}`(`KR_RELAYS_USER` · `KR_RELAYS_GUEST`, 20 · 20) · 연결 종류는 쿠키 출처로 | 테스트 — 게스트가 상한에 차도 사람은 연다 · 실측(node ws) 게스트 쿠키 + 허용 origin = `subscribed` 뒤 `price_update` 수신(8초에 메시지 17) / 쿠키 없음 · 다른 origin = `KR_STOCK_AUTH_REQUIRED` |
| FR-5 주석 정정 | `kr-stock.routes.ts` · `kr-stream.manager.ts` · `kr-stock.handler.ts` · 서비스 · 컨트롤러 "소유자 전용" 문구 · 규칙 `performance-bff.md` · `websocket-worker.md` | `grep 소유자` — 전망 · 쏠림 신호(그대로 소유자)만 남음 |

## 검증

| Check | 결과 |
|---|---|
| Build | `npm run build` 0 |
| Test | 441 통과 |
| 실스택 | bff-rest · bff-ws 재기동 뒤 위 실호출 |
| 프론트 계약 | 검색 `isTracked` · `isHeld` null 가능 — FE 는 ★ 를 세션으로 판정(값을 읽지 않음, `FE-REQ-070`) |

## 미검증

없음
