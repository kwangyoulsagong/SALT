# BFF-REQ-042 체크리스트 — 성적 4요소 claim 중계 (2026-10-07)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `performance-claim.viewmodel.ts` | `__tests__/performance-claim.viewmodel.test.ts` 4 — 온전 · 이유 옮김(모르는 이유 → `not_recorded`) · 깨진 칸 · 없음/표본 깨짐 → `null` |
| FR-2 | `symbol-coach` · `coach-report` · `judgment-scoreboard` · `forecast` · `events`(→ `positioning`) · `target-weight` 뷰모델 | `npm test` 통과 · 실스택 BFF(4001) 응답에서 성적표 · 변동 범위 · 사건 · 목표 비중 claim 확인 |
| FR-3 | `symbol-coach.viewmodel.ts` | 게이지 기존 테스트 기대값을 정규화 결과로(`baselinePositiveRate: null` · `claim: null`) |
| FR-4 | `target-weight.viewmodel.ts` | 테스트 2 — 자리가 같으면 옮김 · 라이브 → 백테스트로 내리면 `null` |

## validate

- `npm test` 208 / 0 · `npm run build`(tsc) 통과. lint 스크립트 없음

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 판단 · 추천 claim 실데이터 | 로컬 판단 표본 < 20 · 추천 없음 — 뷰모델 테스트 · route 주입 화면만 | 라이브 표본 20 이상 · 첫 추천 생성 뒤 |
| 모바일 집계 1콜 | RN 화면이 성적 자리를 아직 그리지 않는다 | `FEATURE-007` 코치 화면 때 |
