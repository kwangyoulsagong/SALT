# BFF-REQ-051 — 체크리스트

루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 단계 A(2026-11-06) — FR-2 · 5

| 요구 | 구현 | 확인 |
|---|---|---|
| FR-2 시장 조치 | `toKrMarketActionsVM` — 요약 · 상세 응답 칸(별도 경로 대신 — 스펙 정정) | 테스트: 그대로 옮김 · 모르는 kind 버림 · 모양 틀림 던짐 · 옛 서버 빈 배열 |
| FR-5 칩 · VI · 마지막 체결 | `toKrQuoteVM` | 테스트: 넓힌 칩 · VI · 시각 그대로 · 옛 서버 null · VI 종류 모름 던짐 |
| 숫자 계산 0 | 옮기기만 | 코드 확인 |
| 비소유자 그대로 | 서버 판정 무변경 | 기존 테스트 |

- `npm test` 417/0 · `npm run build` · 실서버 BFF 4001 소유자 토큰 요약 200

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-1 · 3 · 4 · 7 | 단계 B~D | 전 영역 계획 |

## 단계 B(2026-11-06) — FR-3 · FR-4

루트 슬라이스 `requirements/specs/done/F016-B-kr-news-flows-slice.md` · 체크리스트 `requirements/reports/checklists/F016-B-kr-news-flows.md`

| 요구 | 확인 |
|---|---|
| `/:code/news` · `/:code/flows/intraday` | 컨트롤러 테스트(라우터 순서 — `/:code` 로 안 샘 · 코드 형식 400) · 실서버 소유자 토큰 200 |
| 숫자 계산 0 | 뷰모델 테스트(서버 값 그대로) |
| 원천 실패 → `unavailable` | 기존 `read` 갈래 · 화면 실패 회차 |
| 모르는 `kind` 버림 · 계약 깨짐 | 뷰모델 테스트 |

- `npm test` 421/0 · `npm run build`

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 외국인 · 기관 장중 칸 | 서버 원천 없음 | 실전 키 전환 시 |
| FR-1 · 7 | 단계 C | 전 영역 계획 |

## 단계 C(2026-11-09)

| 항목 | 결과 |
|---|---|
| 뷰모델 — 서버 값 그대로 · 모르는 kind/이유 버림 · 모르는 method · 숫자 아닌 몫 계약 깨짐 | 통과 `why-moved.test.ts` |
| 산술 0 grep(주석 · 문자열 뺀 뒤) | 통과 |
| 국내 404 그대로 · 계약 깨짐 unavailable · 코인 800ms · 404 그대로 · 5xx 한 번 다시 | 통과 |
| 실호출 | 국내 · 코인 200 · 토큰 없음 401 · 경로 조작 400/404 |
| 전체 | `npm test` 426 · `npm run build` |
