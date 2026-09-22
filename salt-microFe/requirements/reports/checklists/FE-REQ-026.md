# FE-REQ-026 (F004 UI) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-026-F004-UI.md`
- 브랜치: `feat/f004-fe-coach-panel` (base `main` `157c624`) · 검증일: 2026-09-22
- 브랜치: `feat/f004-fe-detail-page` (base `main` `3648186`) · 검증일: 2026-09-22 — §5
- 상태: **부분 완료** — K절(우측 AI 코치 패널) · **L절(상세 분석 페이지 · 해설)**. 주문 전 체크 · 리포트(M) · 추천 카드(A~J 의 카드 본체) 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-fe-coach-panel.md` · `F004-fe-detail-page.md`

## 1. 게이트 (A · B)

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-1 카드가 스스로 게이트 | pass | `entities/coach/ui/JudgmentSummary.tsx` — `renderable: false` 면 `BlockedNotice`. 부모는 분기하지 않는다 |
| FR-2 사유별 문구 + "정상 동작" | pass | `COACH_MESSAGES.blocked` 4종 · `blockedNormal` |
| FR-3 표본 수 | pass | `trackSample` (null 이면 줄 없음). 실측 "표본 0건" |
| FR-5 우회 prop 0건 | pass | `grep -r "forceRender\|skipGate" apps/web/src` 0건 |
| FR-10·11 점수 + `scoreNote`, 없으면 점수 없음 | pass (코드) | `judgment.scoreNote &&` — 실데이터는 막힘뿐이라 화면 미확인 |
| FR-13 점수 `aria-label` | pass (코드) | 보이는 "점수 N / 100" 은 `aria-hidden`, 스크린리더용 "100점 중 N점" |
| FR-14 게이지 · 프로그레스바 0건 | pass | 숫자만 |
| FR-4 · FR-6 · FR-7 · FR-12 · FR-20~ | 미착수 | 추천 카드 본체 · 홈 · 리포트 |

## 2. K절 — 우측 AI 코치 패널

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-110 순서 · 기존 컴포넌트 그대로 · PC 2컬럼 유지 | pass | `widgets/coach-panel/ui/CoachPanel.tsx` — `MarketPreview` 에 `coachSlot` · `gaugeFooters`. 실측 1440px 2컬럼 |
| FR-111 SegmentedControl · URL `?mode=` · 없으면 서버 `mode` | pass | `features/switch-coach-mode` · `@repo/ui/segmentedControl` |
| FR-112 재요청 없음 · 히스토리 안 쌓음 | pass · **다르게 구현** | `history.replaceState`(REQ 개정). 실측 요청 0건 |
| FR-113 서버 `label` · 모드 · `validity` · 점수 · 3종 요약 · "매수/매도"·신뢰도 0건 | pass (코드) | `JudgmentSummary` — 막힘뿐이라 화면 미확인 |
| FR-114 판별 union · `BlockedNotice` | pass | 실측 |
| FR-115 `zone.kind` 3분기 · 가격 + 거리 | pass | `ZoneSummary`. `observation` · `unavailable` 실측, `held_rule` 코드만 |
| FR-116 `예측 아님` 상시 · 금지 문구 0 · 거리 % 0 | pass | 거리는 "현재가보다 N원 위/아래". `grep "매수존\|적정가\|목표가\|상승 여력"` messages 0건 |
| FR-117 막혀도 구간 표시 | pass | 실측(막힘 + 관찰 구간) |
| FR-118 게이지 아래 한 줄 · `lowSample` 회색 · 없으면 줄 없음 | pass (코드) | `GaugeTrackRecordLine`. 실측 응답 `[]` → 줄 없음 확인 |
| FR-119 ⑦ 상세 분석 버튼 | pass (슬라이스 6) | `CoachPanel` `footerSlot` — 실측 href `?mode=` 유지 · push · 뒤로가기 |
| FR-120 모바일 폭 접힘 · 375px 가로 스크롤 0 | pass · **다르게 구현** | 접힘 폭은 기존 767px. 375px `scrollWidth = clientWidth` |
| FR-121 `aria-live` 0 · `radiogroup` | pass | roving tabindex · 화살표 · Home/End(`nextIndex.test.ts` 5) |
| FR-160 관심 종목 표 신호 컬럼 0 | pass | 표 무변경 |
| FR-162 신뢰도 % 0 | pass | 타입에 `confidence` 없음 |

## 3. UX 상태

| 상태 | 판정 |
|---|---|
| 로그인 안 됨 | "로그인하면 이 종목의 판단을 볼 수 있습니다." — 요청 안 함 |
| Loading | 판단 · 구간 스켈레톤(최소 높이 128 · 196px), 모드 줄 32px 자리 유지 |
| 판단 조회 실패 | ②③ 자리 "지금 판단을 불러올 수 없습니다." — 차트 · 게이지 · 뉴스 그대로 |
| 모드 계약 깨짐(`null`) | 같은 문구, 구간 없음 |
| 구간 없음 | 사유 한 줄 (실측 `insufficient_price_history`) |

## 4. 미충족 · 미착수 요약

~~L절(FR-130~138)~~ 슬라이스 6(§5). 주문 전 체크(FR-150~156, 서버 선행) · M절(FR-140~144) · A~J 카드 본체 · 홈 게이트 — 다음 슬라이스.

## 5. L절 — 상세 분석 페이지 (슬라이스 6)

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-130 `/investments/[symbol]` · 패널과 같은 뷰모델 | pass · **다르게 구현** | `pages/investment-detail` → `widgets/symbol-analysis`. 조회는 **클라이언트**(토큰이 `localStorage`) · 패널과 같은 쿼리 키. 실측 1회 |
| FR-131 Hero · [관심 추가] · [알림 만들기] 0 | 부분 | 뒤로 · 종목 · 현재가 · 변동률 · 별. **[주문 전 체크] 없음** — 서버 선행(아래) |
| FR-132 오버레이 선 · 범례 `예측 아님` · 기간 6탭 | 부분 | 선은 `zoneToPriceLines`(서버 가격 그대로). **2026-09-22 `FE-REQ-034`**: 상세 차트가 자체 캔버스 차트(`TradingChart`)로 바뀌어 선 가격 배지 · 범위 밖 가장자리 표시가 생겼다. **5탭** — 서버 차트에 `week` 없음. 슬라이스 6 의 1일 탭은 서버 일봉 시각 키(`date`) 때문에 시각이 NaN 이었다 — 같은 REQ 에서 고침 |
| FR-133 선 색 토큰 · 손실 제한만 하락 색 | pass | `special.down` · `neutral.500`. 상승 색 사용 0 |
| FR-134 코치 카드 = 모드 스위치 + 판단 + 근거 · 위험 + 3종 · 같은 게이트 | pass | `JudgmentDetail` — 막힘은 `JudgmentSummary` 가 그린다. 실측(막힘) · 가로채기(열림) |
| FR-135 해설 = 버튼만 · 이유 · 근거 · 주의점 · 뉴스 5줄 · 면책 · 같은 카드 안 3종 · 예상 수익 0 · 막히면 버튼 없음 | pass | `features/explain-symbol` `ExplainCard`. 가로채기 성공 · 429 · 500 · 막힘 실측. 2026-09-22 서버가 `renderable:false` 를 줄 수 있게 돼 합 타입으로 받고 안내 한 줄을 그린다(화면 실측 안 함 — 로컬에서 버튼이 안 뜬다) |
| FR-136 해설이 별도 기간을 그리지 않음 | pass | 응답 `timeframe`("약 25분 이내") 미표시 |
| FR-137 수익 플랜 3단계 · 비중 · 상태 · 현재가와의 차이 / 미보유 문구 | 부분 | `ProfitPlan` — 실데이터 `held_rule`. **"거래 기록 추가" 진입 없음**(F006) |
| FR-138 모드 전환이 선 · 구간 표 · 코치 카드를 함께 · 해설 초기화 | pass | 같은 `modeView` 에서 셋 다 · 해설은 `key={mode}` (진행 중 요청 `ERR_ABORTED`) |
| FR-102 익절 3단계 `<table>` | pass | `<table>` + `<caption>` + `th scope` |
| FR-150~156 주문 전 체크 | **미착수 — 막힘 풀림**(2026-09-22) | 서버가 `stopLossRate` 를 받고 `maxLossOfTotalRate` 를 준다(`SRV-REQ-025` §6). 화면 작업만 남았다 |
