# FE-REQ-026 (F004 UI) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-026-F004-UI.md`
- 브랜치: `feat/f004-fe-coach-panel` (base `main` `157c624`) · 검증일: 2026-09-22
- 상태: **부분 완료** — K절(우측 AI 코치 패널)만. 상세 분석(L) · 주문 전 체크 · 리포트(M) · 추천 카드(A~J 의 카드 본체) 미착수
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F004-fe-coach-panel.md`

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
| FR-119 ⑦ 상세 분석 버튼 | **미충족** | `/investments/[symbol]` 없음 — L절 |
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

L절(FR-130~138) · 주문 전 체크(FR-150~156) · M절(FR-140~144) · A~J 카드 본체 · 홈 게이트 — 다음 슬라이스.
