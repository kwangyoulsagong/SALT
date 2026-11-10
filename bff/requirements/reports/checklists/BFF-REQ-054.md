# BFF-REQ-054 체크리스트 — 검색 모달 2단계 화면 계약

커밋 `1110aa9b`. 2026-11-10.

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 경로 셋 | `rest/routes/search.routes.ts` · `controllers/search.controller.ts` `AppSearchExtrasController` · `services/app-search.service.ts` `AppSearchExtrasService` | 실호출 200 |
| FR-2 뷰모델 | `services/search-extras.viewmodel.ts` | 테스트 3 |
| FR-3 예산 · 캐시 0 | `SEARCH_EXTRAS_TIMEOUT_MS` 400 · `retryOnceOnGet` · `abortOnClose` | 로그 `q=*` 가림 확인 |
| FR-4 입력 경계 | `relatedTarget` · `limit` · `q` 길이 | `?sector=0013&assetType=crypto` 400 · 토큰 없음 401 |

| 검증 | 결과 |
|---|---|
| Build | `npm run build` 통과 |
| Test | 434 통과 |
| 실호출 | `REST_PORT=4011` — rising 3 · groups "전기" · related ETH(함께 태그) · 400 · 401 · launchd `bff-rest` 재기동 |
| 프론트 실화면 | `FE-REQ-066` 체크리스트(소유자 · 비소유자 · 390) |

## 미검증 · 범위 밖

없음.

## 2026-11-10 — F018 걸침

  - `bff/src/rest/routes/search.routes.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)
  - `bff/src/services/app-search.service.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)
