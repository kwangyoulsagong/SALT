# F004 슬라이스 14 — BFF 코치 리포트 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-bff-coach-report-slice.md` · 2026-09-23
브랜치: `feat/bff-f004-coach-report` (base `feat/server-f004-coach-cooldown` `0b22309` — 서버 두 슬라이스 위)
영역 체크리스트: `bff/requirements/reports/checklists/BFF-REQ-023.md` · `BFF-REQ-025.md`

## 요약 — BFF 경유 실측 (로컬 테스트 계정 실제 로그인)

| 확인 | 결과 |
|---|---|
| `GET /api/app/coach/report` | 200 · 8ms · 면책 · 국내 주식 제외 · `degradedFields: []` (추천 없음 계정) |
| `POST /api/ai-coach/generate` | **202 · 8.5ms** → 재요청 **429** · `Retry-After: 300` · 본문 `retryAfterSeconds: 300` |
| `GET /api/app/coach/generation-status` | 200 · 생성 뒤 `manual` · `succeeded` · `retryAfterSeconds: 298` |
| 무토큰 | 401 |
| 게이트 | `npm run build` · `npm test` **99 pass**(+13) |

서버 슬라이스 12 · 13 의 "인증 HTTP 미검증" 3건이 이 실측으로 닫혔다(각 체크리스트에 표시).

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천 · 익절 · 행동 기록이 채워진 리포트 실측 | 로그인 가능한 로컬 계정에 보유 · 거래가 없다. 서버 실제 응답 모양으로 단위 테스트는 했다 | 테스트 계정 보유 기록 후 |
| 게이트 차단 카운터(FR-7) | 관측 인프라 미정 | 관측성 계측 |
| FE 소비 | 소비처 0건 | `FE-REQ-026` M절 |
