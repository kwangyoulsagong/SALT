# FE-REQ-040 판정 화면 재배치 · 슬라이스 2 값 표시 — 체크리스트 (2026-09-29)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 가격선 근거 | `entities/coach/ui/{ProfitPlan,ZoneSummary,ExitPlanList}.tsx` · `COACH_MESSAGES.zone.basis` | Playwright 1440 — 수익 플랜 · 내 규칙 가격 아래 σ 문장. 익절 플랜(리포트)은 코드 확인 |
| FR-2 베타 합 | `entities/coach/ui/RiskGaugeList.tsx` | Playwright — "베타 합 1.3 · BTC 로 환산하면 13,200,000원어치 · NEWCOIN 은 베타를 몰라 빼고 셌어요(보유의 93%)" |
| FR-3 국면 | `entities/coach/ui/MarketRegimeNote.tsx` · 리포트 `RiskBudgetPanel` · `RiskExposurePanel` | Playwright — 200일선 아래 · −18.0% · FOMC 10월 29일(KST) · 게이트 없음 문장 |
| FR-4 손실 비대칭 | `entities/coach/ui/MirrorLines.tsx` | 코드 확인(미러 화면 실측 안 함 — 아래 표) |
| FR-5 위험 카드 | `widgets/judgment-overview/ui/RiskExposurePanel.tsx` | Playwright 1440 · 360 |
| FR-6 성적표 | `entities/coach/ui/ScoreboardList.tsx` · `api/useJudgmentScoreboard.ts` · `ScoreboardPanel.tsx` | Playwright — 표본 부족 그룹은 감춘 이유, 빗나간 3건 최근 순 · 로고 |
| FR-7 위젯 · 자리 | `widgets/judgment-overview` · `market-board` `lead` · `pages/investments/ui/InvestmentsBoard.tsx` | 레지스트리 3곳(`layer-rules.cjs` · `layered-architecture.md` · `fsd-widgets.md`) |
| FR-8 상세 순서 | `widgets/symbol-analysis/ui/SymbolAnalysis.tsx` | Playwright 1440 · 360 — 판정 첫 카드, 접힘 → 펼침(주요 사건), 404 소유자 카드면 접는 자리 없음(코드) |

| 확인 | 결과 |
|---|---|
| 타입 · 린트 | `pnpm check-types` 5/5 · `pnpm lint` 5/5 |
| 테스트 | `pnpm test` core 26 · ui 43 통과(앱 테스트 러너 없음 — 새 단위 테스트 없음) · `pnpm test:layer-check` 차단 8 · 통과 5 |
| 빌드 | worktree `web` · `web-tax` 통과 |
| 번들 | 첫 로드 `/investments` 132 kB → 132 kB(+0.09, 카드는 지연 청크) · `/investments/[symbol]` 115 → 115 kB |
| 레이어 훅 | 옮긴 3파일 사후 실행 막힘 0. 나머지 Bash 작성 파일은 `@repo/fsd/layers` lint 로 확인 |
| 접근성 | axe wcag2a · 2aa — 새 요소 위반 **0**(처음 3건: 링크 3.03 · 펼쳐 보기 4.41 · 고지 3.03 → neutral 700). 남은 것은 기존 공용 스타일(아래 표) |
| 반응형 | 1440 · 360 가로 스크롤 없음 · 페이지 오류 0 |
| 공통 수용 기준 | 주문 경로 0 · 프론트 금액 계산 0 · 명령형 · 확신 0 · 확률 표시 0 · 게이트 없음 명시 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 계정 데이터 화면 | 로그인 토큰 없음 — Playwright route 고정 데이터 | 로그인 QA(사용자) |
| 미러 손실 비대칭 줄 · 리포트 익절 플랜 근거 줄 화면 | 리포트 화면 고정 데이터를 만들지 않았다(코드 · 타입만) | 로그인 QA |
| 기존 대비 미달 — `surface.panelDescription`(3.03) · `CoachDetail` statTerm · th · caption · gapCaption · `EventsCard` 문구 · 세그먼트 탭 | 이 슬라이스 이전 스타일, 리포트 · 상세 전체가 바뀐다 | `@repo/ui` · 표면 대비 정리 REQ(F009 남은 것) |
| [오늘의 판정] · ΔSHAP · 확률 · 기대 R · 국면별 적중(FR-9) | 비중 산식 · 보정 확률이 없다 | 슬라이스 4 → 5 |
| 리포트 위험 게이지 합산 재배치(FR-10) | 요약은 `/investments` 가 먼저 가짐 | 슬라이스 5 |
| 모바일 앱 | `apps/mobile` 미착수 | RN-REQ-001 |
