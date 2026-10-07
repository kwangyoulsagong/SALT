# FE-REQ-045 체크리스트 — 성적 4요소 한 줄 · 라벨 정정 (2026-10-07)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `PerformanceClaimLine.tsx` · `claimMessages.ts` · `CoachBlock.css.ts` `claimLine` · `claimItem` | 실스택 360 · 1280 렌더 · 가로 넘침 0 · 새 줄 axe 대비 위반 0 |
| FR-2 | `packages/core/src/coach/performanceClaim.ts` 외 6 | `pnpm check-types` 5/5 |
| FR-3 | 9자리 | Playwright 실스택(서버 → BFF → 웹 3100, 로컬 JWT): 목표 비중 `2018-01-09 ~ 2026-09-28 · 455주 · BTC 그냥 보유 · 빗나간 수 기록 없음` · 성적표 `18회 · 기준 없음 · 빗나간 7회` · 변동 범위 1 · 2주 · 사건 `판정 58회 중 빗나간 4회` · 쏠림 `판정 11회 중 1회`. 판단 상세 · 게이지는 막힌 응답에 route 로 renderable 주입 |
| FR-4 | `messages.ts` · `JudgmentSummary` · `JudgmentDetail` · `RecommendationCard` | 패널 "틀렸던 때 9건"(claim 값) · 상세 "최근 틀렸던 때" 확인 |
| FR-5 | `GaugeTrackRecordLine` | 1회 실행에서 "오른 비율 56% (모든 날 52%)" 텍스트 확인 |
| FR-6 | `ScoreboardList` | 콘솔 키 경고 사라짐 |

## validate

- `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test` · `web` · `web-tax` 프로덕션 빌드 통과
- vanilla-extract 자식 선택자(`& > li + li`)는 tsc 가 못 잡고 dev 컴파일에서 드러났다 → 항목 쪽 스타일로

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 추천 카드 claim 실데이터 화면 | 로컬에 저장 추천이 없다 | 첫 추천 생성 뒤 화면 QA |
| 게이지 줄 잘라낸 화면 | 패널 로드 순서 때문에 두 번째 실행에서 줄이 안 잡혔다(텍스트는 1회 확인) | 머지 전 Playwright 재실행 |
| 판단 블록 실데이터 | 로컬 판단 표본 < 20 — route 주입 화면만 | 라이브 표본 20 이상 |
| 기존 대비 위반(사건 카드 면책 3.03 · 상승/하락 색 등) | 이번 변경 밖 — 브랜드 색 결정 대기 | 대비 정리 REQ |
| 웹폰트 404 | 기존 주소 문제, 이번 변경 밖 | 별도 |
| 요약 칸 `judgment-overview` · 미러 · 복기 · 보유 | 사용자 결정 · 설계상 제외 | 범위 밖 |
