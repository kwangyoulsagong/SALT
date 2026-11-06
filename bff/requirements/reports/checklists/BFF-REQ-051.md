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
