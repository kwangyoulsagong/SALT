# F000 슬라이스 — BFF 부채 정리 — 체크리스트

슬라이스: `requirements/specs/in-progress/F000-bff-cleanup-slice.md` · 2026-09-22
브랜치: `chore/bff-cleanup` (base `main` `5373189`)
영역 체크리스트(본문 · 실측 전체): `bff/requirements/reports/checklists/BFF-REQ-036.md` · `BFF-REQ-007.md` §9 · `BFF-REQ-008.md` §5

## 요약

| 확인 | 결과 |
|---|---|
| 4xx 보존 | 컨트롤러의 `error.response` 직접 처리 0 · `status(500)` 직접 응답 0(동면 feed 제외) |
| 만료 토큰 | `/api/app/alerts` · `/home` **500 → 401**, `/portfolio` 401 |
| proxy 4xx | Zod 400 `errors[]` · 422 `code` 보존 |
| 동면 | 6경로 410 `ENDPOINT_DORMANT`(스펙 5 + `/api/users/dashboard`) · 유지 경로 그대로 |
| 게이트 | `tsc` · `npm run build` · `npm test` 80 pass |

## 미검증 · 범위 밖

영역 체크리스트 `BFF-REQ-036.md` §4 와 같다 — 동면 1주 로그(2026-09-29), 401 이 된 경로의 프론트 동작, 5xx 502/504,
`upbit-ws.service` import 시 연결, WS throttle.
