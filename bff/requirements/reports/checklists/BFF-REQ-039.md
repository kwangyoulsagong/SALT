# BFF-REQ-039 슬라이스 2 값 화면 계약 · 판정 성적표 중계 — 체크리스트 (2026-09-29)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 베타 합 | `services/trade-risk.viewmodel.ts` `toRiskBudgetViewModel` | `app-trade-risk.test.ts` — 옮김 · 서버 미제공 → `insufficient_data` · 합 없음 `ok` · `exceeded` 거부 |
| FR-2 국면 | 같은 파일 `toMarketRegime` | 같은 테스트 — 전체 모양 · `null` · `asOf` 깨짐 · 모르는 이벤트 · 200일선 없음 → `trendOpen: null` |
| FR-3 손실 비대칭 | `services/behavior-mirror.viewmodel.ts` `toLossAsymmetryView` | `app-behavior-mirror.test.ts` 3건 |
| FR-4 `basis` | `symbol-coach.viewmodel.ts` `toZone` · `coach-report.viewmodel.ts` `toExitPlan` · `app-profit-plan.service.ts` | 뷰모델 테스트 2건(열린 · 막힌 모드, 리포트). `/profit-plan` 은 코드 확인(테스트 없음 — 화면 소비처 없음) |
| FR-5 성적표 | `rest/controllers/judgment-scoreboard.controller.ts` · `services/app-judgment-scoreboard.service.ts` · `judgment-scoreboard.viewmodel.ts` · `routes/coach.routes.ts` | `judgment-scoreboard.test.ts` 6건(경로 · 5xx · 계약 깨짐 · 401) |

| 확인 | 결과 |
|---|---|
| 테스트 | `npm test` **188 / 0**(+13) |
| 타입 · 빌드 | `tsc --noEmit` · `npm run build` 통과 |
| 계약 | 응답 필드 추가(`gauges.btcBeta` · `market` · `lossAsymmetry` · `basis`) · 새 경로 `/api/app/coach/scoreboard`. 소비처 `salt-microFe/packages/core/src/coach/*` 같이 바꿈 |
| 공통 수용 기준 | 계산 0 · 문구 0 · 주문 경로 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 서버 응답으로 HTTP 왕복 | 로컬 인증 토큰 발급 불가 — 뷰모델 테스트 · 화면은 Playwright 고정 데이터 | 로그인 QA(사용자) |
| 성적표 실제 그룹 값 | `mode-decision@2` 표본이 20 전(판단 블록 막힘) | v2 채점 표본 축적 |
