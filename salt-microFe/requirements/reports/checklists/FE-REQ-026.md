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

## 화면 마감 (2026-09-23, `feat/fe-token-refresh`)

세션을 고쳐 화면이 실제로 뜨자 디자인이 드러났다. 사용자가 참고 화면을 주고 **"배열은 맞는데
디자인이 구리다"** 고 했고, 스크린샷을 받아 세 번 반복해 맞췄다.

| 확인 | 결과 |
|---|---|
| 헤더(FR-131) | 이름 t5 위 · **가격 t1 아래** — 전에는 `Heading level=2` 옆에 가격이 붙어 같은 크기로 경쟁했다 |
| 요약 지표 | 24시간 범위(막대 위 현재가 점) · 거래대금 · 심리 온도 · 시세 기준. **전에는 0개** |
| 헤더 카드 | 배경 위에 떠 있던 헤더를 카드로 묶어 아래 패널과 같은 언어로 |
| 패널 카드 | 제목 줄 추가 · 테두리 → 흰 면 + 그림자. 그림자는 화면에서 새로 정의(토큰 `elevation.sm` 은 흰 배경 전제라 회색 배경 위에서 안 보였다) |
| 표 | 값 오른쪽 정렬 · `tabular` · t6 bold, 보조 문구 t8 tertiary, 행 구분선 `neutral[100]`(마지막 행 없음) |
| 성적 3칸 | 숫자 t5 bold · 라벨 t8 — 두 단계 차이 |
| 사례 목록 | 날짜 ↔ 결과 · 수익률 양끝 정렬 + 행 구분선 |
| [해설 보기] | 외곽선 알약 → **채운 버튼 · 전체 폭**. 카드의 유일한 행동이다 |
| 사용자 확인 | **"너무 좋다"** (2026-09-23) |

### 판단

- **섹션 탭을 따르지 않았다.** 참고 화면은 패널이 열 개 가까워 탭으로 나눈다. 우리는 넷이고,
  탭을 두면 판단과 근거 3종이 다른 탭으로 갈라진다(공통 수용 기준 1)
- 면책을 카드 안에서 **하단 고정 띠**로 올렸다 — 스크롤 위치와 무관하게 보여야 하는 계약이다

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 참고 화면과의 치수 비교 | Chrome 확장 미연결 — 스크린샷으로만 맞췄다 | 확장 연결 시 |
| 상세 맨 위 프로필 블록 | 종목 상세에 사용자 프로필이 올라와 있는 것이 어색하다. 제품 결정이라 임의로 지우지 않았다 | 사용자 확인 |

## 6. M절 — 코치 리포트 `/coach/report` (슬라이스 15, 2026-09-23, `feat/fe-f004-coach-report`)

루트: `requirements/reports/checklists/F004-fe-coach-report.md`

| FR | 판정 | 위치 · 근거 |
|---|---|---|
| FR-1~3 | **pass** | `entities/coach/ui/RecommendationCard.tsx` — 막힘은 카드 자신이 `BlockedNotice`(사유 · 표본 · "정상 동작") |
| FR-4 | **pass(코드)** | 근거 · 과거 성적 · 틀렸던 때를 접지 않고 차례로. `renderable:true` 렌더는 실데이터 없음 |
| FR-5 | **pass** | `forceRender` · `skipGate` grep 0 |
| FR-7 · FR-103 | **pass(코드)** | `topFactors` 만 `<details>` |
| FR-10~14 | **pass(코드)** | 숫자만 · `scoreNote` 같은 줄 · `aria-label` 대체 텍스트 · 게이지 0 |
| FR-12 · FR-100 | **pass(코드)** | 배지 색 + "매수 검토" 등 글자 + 모양(▲▼■◆, `aria-hidden`) |
| FR-20 · 21 | **pass(코드)** | 적중률 · 평균 · 최대 낙폭 + `최근 N회` · `표본 부족` 회색 |
| FR-22 · 23 | **미착수** | 성적표 BFF 없음 |
| FR-30~33 | **pass(코드)** | 실패사례 날짜 · 사건 · 결과 전부 · 접지 않음 |
| FR-40~45 | **pass(코드)** | `ExitPlanList` — 손실 제한 · 1차 익절 검토(가격 + 현재가와의 차이 금액) · 추세 유지 조건 문장 · `<table>` · `예측 아님` · 보유 0건 문구 |
| FR-60 · 61 | **pass(코드)** | `describeBehaviorFact` — `factCode` 3종 → 수치 문장, 모르는 코드 줄 없음 |
| FR-63 | **다르게** | 계약에 거래 수가 없어 가를 수 없다 — 빈 목록은 "기록된 반복 패턴이 없습니다" |
| FR-70~72 | **미착수** | 피드백 BFF · 화면 |
| FR-73 | **다르게** | `staleHours > 24` 임계 없음 — 경과 시간은 늘 표시(0 제외), 버튼은 늘 있고 쿨다운이 막는다. 임계는 서버가 줄 것(PM) |
| FR-74 · 76 | **pass(코드)** | `features/regenerate-coach` — 비활성 + "N분 N초 뒤", 429 도 같은 모양 · 오류 없음 |
| FR-75 | **pass(코드)** | `Button loading` · 색을 빼지 않음 |
| FR-80~82 | **미착수** | 성향 설정 |
| FR-90 | **pass** | 하단 고정 면책 · BFF 가 면책 없으면 `unavailable` |
| FR-91 | **pass(코드)** | `kr_stock:no_realtime_data` → 문장, 모르는 코드 줄 없음 |
| FR-92 · 93 | **pass(코드)** | `source: rule` → `규칙 기반 설명` · `llm` → `Badge tone="ai"` + 생성 시각(헤더) |
| FR-140 | **부분** | `/coach/report` 생성 · 진입은 **홈**(코치 탭 F006 전) |
| FR-141 · 142 | **미착수** | 추천 근거 상세 |
| FR-143 | **pass(코드)** | 추천이 막히면 상단 "표본이 쌓이는 중" · 오류 경계로 보내지 않음 |
| FR-144 | **pass(코드)** | `signalTypes` 매핑 4종 · 없으면 이름 생략 |
| 후보 목록 | **그리지 않음** | 3종 세트 없는 추천 — 공통 수용 기준 1. `@repo/core/coach` 사본에서 필드 제외 |
| 375px | **미검증** | 브라우저 실측 불가(Chrome 확장 미연결) |

**로그인 상태 렌더 전부 미검증**이다 — 위 "pass(코드)" 는 타입 · 빌드 · 코드 대조까지다.


## 7. 슬라이스 15 후속 — 디자인 · 진입 · 행 링크 · SEO (2026-09-23)

| FR | 판정 | 근거 |
|---|---|---|
| FR-140 진입 | **개정** | 홈 → **투자 화면 제목 줄** `내 코치 리포트 ›`(사용자 결정) |
| FR-119 ⑦ [상세 분석 보기] | **개정 · 삭제** | 행 hover = 미리보기, 클릭 · Enter = 상세, 종목 이름은 진짜 링크(`useDetailLink`). 실측: 패널 버튼 0 · 클릭 → `/investments/BTC?mode=long_term` · 표 링크 100 |
| FR-131 머리 | **pass** | 서버 컴포넌트 — HTML 에 `<h1>` 종목 · 가격 · 지표. "심리 온도" 칸은 뺐다(코치 판단 = 토큰 필요) |
| 디자인 | **pass(실측)** | 참고 화면 12페이지 계산 스타일 실측 → `shared/ui/surface.css`. 리포트 1440 · 375 가로 넘침 0 |
| 리포트 로고 | **pass** | 보유 · 주의할 점 종목 자리에 로고(시세 목록 `logoUrl`, 없으면 이니셜) |
| 이동 · 뒤로 가기 간헐 실패 · 복귀 레이아웃 | **미검증** | 로그아웃 6회 왕복: 실패 0 · 표 폭 1px 흔들림. 핫 리로드 의심 — **QA 단계**(사용자 결정) |

## 8. F009 슬라이스 0 — C04 라벨 (FR-163, 2026-09-24)

| FR | 판정 | 근거 |
|---|---|---|
| FR-163 "가장 나빴던 수익률" | **pass** | `@repo/core` `symbolCoach` · `coachReport` 타입, `JudgmentDetail` · `RecommendationCard`, `messages.ts` 라벨. 웹 소스에 "최대 낙폭" 0건 |
| 게이트 | **pass** | `pnpm check-types` · `pnpm lint` · `pnpm test` · `pnpm build`(web · web-tax) 전부 성공 · `layer-check` 3파일 exit 0. `@repo/ui` 무변경이라 Storybook 빌드 생략 |
| 화면 실측 | **미검증** | 판단이 열린 카드는 로그인 + 표본 20 이 필요하다. 아래 표 |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 응답 실측(서버 · BFF 경유) | 로컬 서버 · BFF 는 떠 있지만 이번 세션에서 로그인 토큰을 만들 수 없었다. 도메인 · 뷰모델 단위 테스트로만 확인 | 사용자가 로그인한 화면에서 코치 카드 확인 시 |
| 실제 MDD(시간순 자산 곡선) | 이번엔 이름만 바로잡았다. 판단 표본은 서로 겹치는 기간이라 한 곡선으로 이을 수 없다 | F009 슬라이스 1 `DecisionOutcome` — 사용자 거래로 곡선이 생길 때 |
