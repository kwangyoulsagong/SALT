# F004 슬라이스 5 — 서버 4xx 전달 · explain 인증 · GET 재시도 (BFF) — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-bff-upstream-errors-slice.md` · 2026-09-22
브랜치: `feat/f004-bff-slice4` (base `main` `ebe3921`)

## 1. 요구사항 ↔ 구현

| REQ · FR | 판정 | 위치 |
|---|---|---|
| `BFF-REQ-025` FR-6 4xx status · `code` 보존 | pass | `error.util.ts` `toUpstreamClientError` · `error.middleware.ts` |
| FR-6 `Retry-After` 전달 | pass (코드 · 단위) | 미들웨어 + `proxy.routes.ts`. **서버가 아직 보내지 않아 실데이터 없음** |
| `BFF-REQ-023` FR-60 `generate` 429 전달 | 부분 | BFF 쪽은 통과(프록시가 status · 본문 · 헤더를 옮긴다). 서버에 쿨다운이 없다 |
| `BFF-REQ-023` FR-70 · FR-71 · FR-100 · `BFF-REQ-025` FR-10 | pass | `ai-coach.routes.ts` — `authMiddleware` 뒤 · `proxyAuthRequest` |
| `BFF-REQ-025` FR-1 20s | pass | `EXPLAIN_TIMEOUT_MS` · 테스트 |
| FR-2 · FR-5 explain 재시도 0 | pass | 테스트 |
| FR-7 · `BFF-REQ-026` FR-1 동시 2 | pass | `createConcurrencyGate(2)` · 테스트 · 실측 |
| FR-12 토큰 무해석 | pass | 헤더 그대로 |
| FR-35 explain 요청 · 응답 무로깅 | pass | 로그는 method · url · status · 에러 메시지만 |
| FR-44 `renderable:false` 200 | pass | 테스트 — 응답 그대로 |
| 호출 맵 GET 재시도 1회 (`preview` · `symbolCoach` · `symbolNews`) | pass | `retry.util.ts` `retryOnceOnGet` · 테스트 7개 |
| explain 클라이언트 종료 → upstream 취소 | pass (코드) | 컨트롤러 `AbortController`. 실측 안 함 |

## 2. 실측 (서버 4000 · BFF 4001 · 계정 `watchlist-check@local.test`)

| 요청 | main | 이 브랜치 |
|---|---|---|
| `GET /api/app/ai-coach/detail` 잘못된 토큰 | **500** `Request failed with status code 401` | **401** `Invalid token` |
| `PATCH /api/app/ai-coach/profile` 잘못된 값 | **500** `… status code 400` | **400** `Validation error` |
| `POST /explain` 토큰 없음 | 서버로 중계 | **401** `No token provided` (BFF) |
| `POST /explain` 토큰 + 빈 본문 | — | **400** (서버 검증, 원 status) |
| `POST /explain` 유효 본문 3건 동시 | — | 1건 **429 `explain_busy`** 20ms(서버 미호출) · 2건 200 ≈2.8s |
| `GET /detail?symbol=BTC` | — | 200 · 45ms |

## 3. 게이트

| 항목 | 결과 |
|---|---|
| `npm test` (bff) | 71/71 (+20: error middleware 6 · retry 9 · concurrency 2 · explain 3) |
| `npm run build` (bff) | pass |
| 프론트 영향 | 코드 변경 없음. 전역 401 처리 없음 확인(`salt-microFe` grep) |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `Retry-After` 실데이터 | 서버가 보내는 코드 0건 | 서버 쿨다운(`SRV-REQ-025`) |
| `/coach/report` · `scoreboard` · `generation-status` | 서버 엔드포인트 없음 | F004 서버 후속 → 다음 BFF 슬라이스 |
| `generate` 1s · 202 | 서버가 동기 LLM 호출 — 지금 1s 면 기능이 죽는다 | 서버 202 전환 시 |
| GET 재시도 실측 | 로컬에서 서버 5xx · timeout 을 만들지 않았다. 단위 테스트만 | 장애 주입 도구가 생길 때 |
| BFF → 서버 upstream 취소 (detail · explain) | 서버 로그로 확인하지 않았다 | FE 상세 분석 페이지에서 해설 버튼이 생길 때 |
| 서버 5xx → 502/504 | 판단 보류(슬라이스 판단 1) | BFF 에러 정책 정리 시 |
| PM 프로토타입 explain 401 | 의도된 결과(FR-11) — 프로토타입이 토큰을 보내지 않는다 | 프로토타입을 계속 쓸지 PM 결정 |
