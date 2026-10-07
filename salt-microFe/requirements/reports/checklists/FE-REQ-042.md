# FE-REQ-042 체크리스트 — 이번 주 목표 비중 (F010 슬라이스 5)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 | `packages/core/src/coach/targetWeight.ts` · `entities/coach/api/{endpoints,queryKeys,coachApi,useTargetWeights}.ts` | `check-types` 통과 |
| FR-2~5 | `entities/coach/ui/TargetWeightList.tsx` · `TargetWeight.css.ts` · `model/targetWeightMessages.ts` | Playwright — 실데이터 서버 응답을 BFF 뷰모델에 통과시킨 고정 데이터 2벌: ① 투자금 없음(BTC 20.7% · ETH 17.8% 둘 다 초과, 전체 기준 문장 + 투자금 적기 링크) ② 투자금 25,000,000 · 목표 σ 20%(둘 다 부족, 기록 목표 20% · 연 +14.7% · −45.4%) |
| FR-6 | `features/set-risk-budget/{lib/budgetInput,model/messages,ui/RiskBudgetForm}` · `useSetRiskBudget` · `useRecordTrade` 무효화 | `check-types` · lint. 칸 저장 흐름은 화면으로 누르지 않았다(아래) |
| FR-7 | `widgets/judgment-overview/ui/{TargetWeightPanel,JudgmentOverview}.tsx` · `JudgmentOverview.css.ts` | 1280 두 칸 폭 · 360 한 열 |
| 문구 | `targetWeightMessages.ts` | 명령형("사세요 · 파세요 · 줄이세요 · 하세요") · 확신("반드시 · 확실") · 목표가 grep 0건 |
| 접근성 | 카드 범위 axe(wcag2a · aa) | 1280 · 360 모두 **0건**. 처음 2종 — 옅은 면 위 종목 이름 4.26:1 → 흰 면 + 테두리, 공용 패널 설명 3.03:1 → 이 카드만 neutral 700 설명 |
| 360 폭 | Playwright | 가로 넘침 0 |
| 번들 | `pnpm build` | 첫 로드 `/investments` 132 kB → 132 kB(카드는 위젯 지연 청크) · `/investments/[symbol]` 115 kB 그대로 |

## 검증

| 명령 | 결과 |
|---|---|
| `pnpm check-types` | 5 / 5 |
| `pnpm lint` | 5 / 5 |
| `pnpm test` | core 26 · ui 43 통과 |
| `pnpm build` | web · web-tax 통과 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 계정 화면 · 폼 저장 왕복 | 로컬 로그인 토큰 없음 — 고정 데이터로만 | `QA-001` 로그인 QA(사용자) |
| 참고 화면 실측 | 새 화면이 아니라 기존 카드 틀(`panel` · F009 조밀형 줄)을 따랐다 | 디자인 개편 때 |
| 코치 리포트 위험 게이지 합산 재배치(`FE-REQ-040` FR-10) | 목표 비중 카드가 먼저였다 | 다음 화면 슬라이스 |
| 홈 "이번 주 목표 비중" 한 줄 | 진입점 원칙(투자 · 코치 기능은 `/investments`) — 홈에 무엇을 둘지 사용자 결정 필요 | 사용자 결정 |
| Storybook | `@repo/ui` 변경 없음 | — |
| 공용 `panelDescription` 대비 3.03 | 기존 스타일 · 전 화면 영향 | 대비 정리 REQ |

## FR-9~13 — target-weight@2 · 요약 띠 재배치 (2026-09-29)

| FR | 위치 | 결과 |
|---|---|---|
| FR-9 | `packages/core/src/coach/targetWeight.ts` | `@repo/core` check-types 통과 |
| FR-10~12 | `entities/coach/ui/TargetWeightList.tsx` · `model/targetWeightMessages.ts` | Playwright route 고정 데이터(SOL `no_record` · ETH `no_room` · BTC `gapCapped` · 라이브 3/30): 문구 전부 렌더 확인 |
| FR-13 | `entities/coach/ui/TargetWeightSummary.tsx` · `widgets/coach-console/ui/TargetWeightPanel.tsx` · `widgets/judgment-overview` | 실제 계정(Chrome): 요약 칸 → `/coach/report#target-weight` 이동 · 리포트 첫 패널 · "라이브 채점은 2026년 10월 5일부터" |

- 1440: 요약 띠 108px · 시세 표 647px(뷰포트 772 안, 전 1890px) · 360: 띠 300px · 띠 · 리포트 카드 가로 넘침 0 · **axe(wcag2a · 2aa) 0**(띠 · 리포트 카드, 두 폭)
- `pnpm check-types` · `pnpm lint` · `pnpm test`(ui 43 · core 26) · `test:layer-check`(차단 8 · 통과 5) · `web` build(worktree) — `/investments` 132 kB → 132 kB · `/coach/report` 110 kB
- 3종 고지: 요약 한 줄에도 근거 · 과거 성적 · 실패 사례가 같이 있다 · 조각 안 줄바꿈 금지(640px 이하 해제) · 값 · 고지 자르지 않음

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 360 폭 페이지 가로 넘침 14px | 시장 요약 카드(`MarketSummaryCard` compact · sparkline)가 원인 — 로그아웃(띠 없음)에서도 같다. 이 변경 전부터 | 시장 요약 띠 반응형 정리(별도) |
| 실제 계정의 알트 보유 화면 | 이 계정은 보유가 없다 — 고정 데이터로만 확인 | `QA-001` 로그인 QA(사용자, 보유 입력 뒤) |
| 라이브 30주 뒤 화면 | 첫 리밸런스 2026-10-05 | 2027-05 전후 |
| 홈 "이번 주 목표 비중" 한 줄 | 홈은 사용자 결정 | 홈 재디자인 |
| web-tax 빌드 · storybook | 이 변경이 web-tax · `@repo/ui` 를 건드리지 않는다 | 해당 변경 시 |

## FR-14 재료 정지 막힘 문구 (F010 슬라이스 7, 2026-10-07)

| FR | 위치 | 결과 |
|---|---|---|
| FR-14 | `packages/core/src/coach/targetWeight.ts` `TargetWeightBlockedReason` · `entities/coach/model/targetWeightMessages.ts` | 타입 · 빌드 통과. 화면 실측 안 함 |

- `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test` 2/2 · `test:layer-check` 통과 · `turbo build` web · web-tax 2/2

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 목표 비중 `stale_inputs` 막힘 화면 실측 | 로컬 재료가 신선해 상태가 재현되지 않았고 Playwright route 고정 데이터로 찍지 않았다 | PR 머지 전 Playwright route(3100) 또는 다음 화면 QA |
