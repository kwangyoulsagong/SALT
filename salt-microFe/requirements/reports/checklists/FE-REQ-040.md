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
| 실제 계정 데이터 화면 | 로그인 토큰 없음 — Playwright route 고정 데이터 | `QA-001` 로그인 QA(사용자) |
| 미러 손실 비대칭 줄 · 리포트 익절 플랜 근거 줄 화면 | 리포트 화면 고정 데이터를 만들지 않았다(코드 · 타입만) | `QA-001` 로그인 QA |
| 기존 대비 미달 — `surface.panelDescription`(3.03) · `CoachDetail` statTerm · th · caption · gapCaption · `EventsCard` 문구 · 세그먼트 탭 | 이 슬라이스 이전 스타일, 리포트 · 상세 전체가 바뀐다 | `@repo/ui` · 표면 대비 정리 REQ(F009 남은 것) |
| [오늘의 판정] · ΔSHAP · 확률 · 기대 R · 국면별 적중(FR-9) | 비중 산식 · 보정 확률이 없다 | 슬라이스 4 → 5 |
| 리포트 위험 게이지 합산 재배치(FR-10) | 요약은 `/investments` 가 먼저 가짐 | 슬라이스 5 |
| 모바일 앱 | `apps/mobile` 미착수 | RN-REQ-001 |

## FR-11~13 — 요약 띠 (2026-09-29)

- [위험에 노출된 돈] 카드 삭제 · [판정 성적표] 리포트 `#scoreboard` 로 이동 · 요약 띠 세 칸(리포트 앵커 `#target-weight` · `#risk-budget` · `#scoreboard`, 실제 계정에서 앵커 위치 188 · 1106 · 2075px)
- 성적표 칸은 채점 건수 · 신호 종류만 — 적중률 단독 표시 없음(`modeling-evaluation.md` §4)
- 검증은 `FE-REQ-042` 체크리스트 FR-13 과 같다(axe 0 · 띠 108px · 시세 표 647px)
- 미검증: FR-10 게이지 합산(여전히 범위 밖) · 실제 계정 손실 예산 설정 상태의 위험 칸(이 계정은 기준 없음)

## FR-14 — 거래소 투자유의 · 주의 (2026-09-30, `feat/f010-slice6-independent-data`)

| 항목 | 위치 | 결과 |
|---|---|---|
| 막힘 안내 `exchange_warning` | `entities/coach/ui/BlockedNotice.tsx` · `model/messages.ts` | 상세 · 패널 A 상태 1440 · 360 문구 표시 · 둘째 줄 6.45:1 |
| 주의 한 줄 | `entities/coach/ui/ExchangeCautionNote.tsx` · `CoachPanel` · `SymbolAnalysis`(판단 위) | B 상태 문구 표시 · 7.11:1 · 360 에서 한 줄 |
| 표시 없음 회귀 | 같은 곳 | C 상태 새 문구 0 · 모양 그대로 |

검증(Playwright route 고정 데이터 · `next build` + `next start -p 3100` · worktree):
- 상세 · 패널 × A · B · C × 1440 · 360 = 12조합 **axe serious · critical 0**(color-contrast 0) · pageerror 0 · 카드 넘침 0
- 첫 실측에서 새 두 줄이 기존 회색 재사용으로 2.75 · 3.32:1 → `a7f7923` 에서 고침. 같은 실측에서 나온 **기존 위반도 고쳤다**(사용자 요청):
  `c21d49a` 보조 회색 토큰(tertiary · 앱 `text.primary` → #6B7684, 세그먼트 비선택 neutral 700) · `ca8b658` 판정 영역 메타 · 게이지 · 라벨 줄바꿈 ·
  `4ad0b6d` 360 투자 화면 문서 374 → 360(필터 행 `fullWidth` — 원인 체인 실측, 브라우저에서 같은 CSS 로 360 확인)
- `pnpm check-types` · `pnpm lint` 5/5 · `pnpm test` core 26 · ui 43 · `web-tax` 빌드 · `@repo/ui` `build-storybook` 성공

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| heading-order(moderate) — 상세 카드 `h2 → h4` | serious 아님 · 제목 단계를 바꾸면 크기도 바뀐다 | 표면 대비 정리 REQ |
| `4ad0b6d` 뒤 360 실측 재확인 | 원인 실측 때 같은 CSS(`width: 100%`)를 브라우저에서 넣어 360 확인 — 커밋된 코드로는 다시 안 돌렸다 | `QA-001` 로그인 QA |
| 실제 계정 · 실제 유의 종목 화면 | 로컬 인증 토큰 발급 불가 | `QA-001` 로그인 QA(사용자) |

### 2026-09-30 정정 — 일괄 색 치환 되돌림(`3888821`)

위 `c21d49a`(tertiary · 앱 보조 회색 · 세그먼트) · `ca8b658`(막힘 메타 · 게이지) · `206e219`(neutral 500 14곳 · 뒤로가기)의 **색 변경은 되돌렸다** —
참고 화면 실측 · 재설계에서 일부러 정한 값이었다(사용자 지적). 그래서 그 요소들의 axe color-contrast 는 **다시 남는다**(설계 결정).
남긴 것: 새로 만든 두 줄(`exchangeLine` 6.45 · 7.11:1) · main 랜드마크 · keep-all · 360 넘침 · 탭 aria-controls · 제목 태그.

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 기존 회색 · 상승/하락 색의 대비 미달(3.03~4.41:1) | 참고 화면에 맞춘 의도된 색 — 바꾸지 않는다(사용자 결정 2026-09-30) | 디자인 방향이 바뀔 때만 |
