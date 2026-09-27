---
id: SRV-REQ-038
feature: F009
area: server
kind: API
title: "F009 코치 — 사이즈 계산 · 거래 계획 · 리스크 예산 · 판정 · 미러 (+ 슬라이스 6 복기)"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md
---

## Summary

FEATURE-009 슬라이스 1 — "이 크기가 내 예산에서 몇 %인가"를 서버 Decimal 로 계산하고, 계획을 저장하고, 예산 게이지 3개를 준다.
**화면은 없다**(슬라이스 3 `BFF-REQ-038` · `FE-REQ-039`). 판정 배치 · 미러 · 복기는 슬라이스 4 · 6 에서 이 REQ 에 FR 을 더한다.

## 결정

1. **`preflight` 와 나란히 새 정책(`sizing.ts`)을 뒀다.** `preflight` 는 금액 입력 · `number` 산술의 특성화 이관 코드이고 테스트가 반올림까지 고정했다. 합치면 그 고정을 깨야 한다
2. **월 손익은 평단 없이 시가 평가로** — 지금 평가 − 월초 평가(지금 수량에서 이번 달 거래를 되감음 × 월초 종가) − 순유입. 월초 보유 종목의 월초 종가가 하나라도 없으면 합을 만들지 않는다(`insufficient_data` + `missingCloses`)
3. **게이지와 사이즈 계산이 같은 스냅샷(`loadRiskSnapshot`)을 읽는다** — 두 화면이 다른 월 잔여를 말하지 않는다
4. **거래에 연결된 계획은 손절가 · 계획 수량 · 오를 확률을 잠근다**(409). 결정 뒤 기준을 옮기면 준수 판정이 자기 채점이 된다. 잠금은 쓰기 문장의 조건(`transaction_id IS NULL`)이라 검사 · 쓰기 사이 경합이 뚫지 못한다
5. **실현 변동성은 `forecast.v_realized_vol` 에서** (슬라이스 2) — 막힌 행 · 3일 넘은 행은 `null` → `insufficient_data`. 0 이 아니다. 슬라이스 1 에선 원천이 없어 늘 `null` 이었다
6. **응답 비율 이름은 `*Rate`(소수, 0.28 = 28%)** — 기획서 초안의 `*Pct` 대신 기존 계약(`maxLossOfTotalRate`)과 같은 규칙
7. **(슬라이스 4) 되감기 한 번을 판정 · 결과 · 미러가 같이 본다**(`policy/tradeLedger`). 원가는 `portfolio` 와 같은 FIFO 에 **매수 수수료를 넣는다** — 결과 순손익이 "수수료 포함"이라서. 그래서 결과 순손익은 `portfolio.realizedProfit` 보다 매수 수수료만큼 작다. 매수 기록 없는 매도는 원가 0 으로 치지 않고 결과를 만들지 않는다(`unmatchedSells`)
8. **(슬라이스 4) 준수 판정 기준은 업비트 일봉 종가(KST 09:00 = UTC 00:00 경계)**, 손절가 아래로 닫힌 뒤 **24시간 유예** 안에 이 매수분을 팔지 않았으면 `stop_not_honored`. 라벨 칸이 하나라 우선순위 `stop_not_honored` > `stop_slipped` > `size_exceeded` > `honored`. 사용자 결정 2026-09-27("KST 09:00")
9. **(슬라이스 4) 자동 태그는 조각 수량 과반일 때만** — 조각 하나가 추격이었다고 청산 전체 손익을 추격 비용으로 돌리지 않는다. 추격은 5분봉(30일 보관)이 있어야 판정하고, 모르면 직전 회차 판정을 잇는다
10. **(슬라이스 4) 미러는 요청 때 센다** — 저장할 표가 없고(`DB-REQ-031` 은 결과 · 계획만) 재료 쿼리가 다섯이라 싸다(로컬 14ms). 결과 · 라벨 · 태그만 배치(6시간마다 `:35`, 멱등)가 저장한다. 기획서의 "미러 집계 일 1회 → 읽기 뷰"에서 바꿨다
11. **(슬라이스 4) "그냥 들고 있었으면"은 둘이다** — 포트폴리오 단위는 첫 거래일 구성 보유 vs 실제 TWR(순입금은 같은 날 같은 비중 매수 가정, 사용자 결정 2026-09-27 — TWR 은 입출금에 불변이라 식이 단순해진다), 결과 단위(`benchmarkReturn`)는 청산 30일 뒤 종가. 결과 단위를 "지금 종가"로 하면 매일 값이 바뀐다

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `POST /api/coach/size-check` `{symbol, side, quantity, price, stopPrice?, winRate?, payoffRatio?}` — 최대 손실(원) · 단위 손실 · 1회 예산 대비 · 월 잔여 대비 · 참고 수량 상한(`limitedBy`) · 변동성 타깃 비중 · 현재/거래 후 비중 · 5연속 손절 · 켈리(풀 · ½ · ¼, `hasEdge`) · `unavailable` 사유 · `assumptions` · `orderExecution: false` (FEATURE-009 FR-4~8) | 완료(슬라이스 1) |
| FR-2 | 최대 손실 = 수량 × ((진입 − 손절) + (진입 + 손절) × 0.05%). 갭 가정 없음을 응답에 밝힌다. 손절 ≥ 진입이면 `stop_not_below_entry` | 완료 |
| FR-3 | 참고 수량 상한 = min(1회 예산 ÷ 단위 손실, 한 종목 상한 수량). 가용 현금은 모른다(현금 기록 없음) — 식에서 뺐다 | 완료 |
| FR-4 | 못 구한 값은 `null` + `unavailable.<필드>` 사유(`stop_price_missing` · `stop_not_below_entry` · `budget_not_set` · `no_portfolio_value` · `monthly_budget_exhausted` · `insufficient_data` · `not_applicable_sell`). 0 · 기본값 채움 0건 | 완료 |
| FR-5 | `GET · PUT /api/coach/risk-budget` — 예산 설정(원 · 비율, `null` 은 지움) · 게이지: 이번 달 낙폭(KST 월) · 종목 집중도 · 최근 365일 회전율 · 올해 수수료. 넘어도 막지 않는다(`exceeded`) (FEATURE-009 FR-1~3 · 17 · 23 · 24) | 완료 |
| FR-6 | `POST · GET /api/coach/plans` · `PATCH /api/coach/plans/:id` — 종목 · 방향 외 전부 선택. 거래 연결은 본인 · 같은 종목 · 같은 방향 · 한 번. 연결 뒤 채점 기준 잠금(409). 삭제 없음 (FEATURE-009 FR-9~10) | 완료 |
| FR-7 | `PATCH /api/ai-coach/profile` 에 `hidePurchasePrice`. 프로필 응답에서 예산 3필드는 뺀다(`/coach/risk-budget` 이 준다) (FEATURE-009 FR-27 저장) | 완료 |
| FR-8 | 금액 · 비율은 도메인에서 `Money` · `Decimal`, 원 반올림은 응답 변환(`presentation/dto/riskView`) 한 곳 | 완료 |
| FR-9 | 준수 판정 배치 · `DecisionOutcome` 생성 · 자동 태그 · `mirror.ts` · `GET /coach/mirror` (FEATURE-009 FR-11~22) | 완료(슬라이스 4) — 아래 FR-9a~9f. FR-21(알림 끄기)은 FR-13 · FR-20 · 22(Could)는 to-do |
| FR-9a | 준수 판정(`policy/adherence`) — 연결된 매수 계획마다 4라벨 또는 판정 불가(`null`). 원본은 배치만 쓰고, 사용자 수정은 `PATCH /api/coach/plans/:id` `userAdherenceLabel`(잠금 대상 아님) (FEATURE-009 FR-11) | 완료 |
| FR-9b | 결정 결과(`policy/decisionOutcome`) — 매도 1건 = 1행: FIFO 원가(매수 수수료 포함) · 순손익 · 수수료 · 순수익률 · 보유일(수량 가중) · R(계획 손절가 있을 때) · 청산 30일 뒤 보유 수익률 · 계획 라벨 (FR-14) | 완료 |
| FR-9c | 자동 태그 4종(`chasing` · `averaging_down` · `revenge` · `off_plan`) + 사용자 확정 `PUT /api/coach/outcomes/:id/tags`(덮어쓰기, 빈 배열 = 실수 없음, 자동 후보 보존) · `GET /api/coach/outcomes` (FR-18) | 완료 |
| FR-9d | 배치 `EvaluateTradeDecisions` — 사용자별 · 멱등 · 지운 매도 결과 정리 · 거래 5,000건 초과면 쓰지 않음(`truncated`) · 사용자 한 명 실패가 다른 사용자를 막지 않음. `investment-insight.worker` 6시간마다 `:35` + 부팅 1회 | 완료 |
| FR-9e | `GET /api/coach/mirror` — 준수율 · 준수/위반 평균 수익률(FR-12) · PGR/PLR · 익절/손절 보유일(FR-15) · 실제 TWR vs 보유 · 수수료 몫(FR-16) · 회전율 + 기준선 서버 상수(FR-17) · 태그 비용 · 엣지 없음(FR-18 · 19). 각 `{value, sampleSize, status}`, 표본 < 20 이어도 값을 준다 | 완료 |
| FR-9f | `market` 공개 API `highestCloseBetween(symbol, from, to)` — 추격 판정 재료(5분봉 구간 최고 종가) | 완료 |
| FR-12 | 입력 중 행동 미리보기 — `POST /coach/size-check` 응답 `behavior`(요청 `hasPlan?`). 매수: 이 거래가 저장되면 붙을 자동 태그 후보(가상의 매수 한 건을 장부 끝에 붙여 배치와 같은 `replayLedger` · `isChasing` 규칙) + 그중 엣지 없음(`tagCosts.noEdge`)만 `edgeWarnings`. 매도: 아직 남은 매수에 연결된 최신 계획 손절가 vs 현재가(`sellFraming`) — 매입가 · 손익률 없음. 저장하지 않는다(추격 판정 입력 시점 저장 안 함 — 2026-09-27 사용자 결정). 미리보기만 실패하면 `behavior: null` · 사이즈 결과는 그대로 (FEATURE-009 FR-19 · 시나리오 5) | 완료(슬라이스 5) |
| FR-13 | 행동 3규칙(과매매 · 패닉 · 추격)을 **저장하지 않는 측정**으로 — `AnalyzeTradingBehavior` 가 판정만 돌려주고, 워커 단계 · `behavior_analysis` 쓰기(`saveBehavior` · `findActiveBehavior`)를 지웠다. 행동 코치 · 코치 상세(`behaviorFacts`) · 추천 점수 행동 감점이 요청 때 같은 판정을 본다. 남은 행은 TTL 6시간으로 피드 · 대시보드에서 사라진다 (FEATURE-009 FR-21) | 완료(슬라이스 5) |
| FR-10 | 월간 복기 · Brier · 체크리스트 · 코치 대화 3문항 · 시나리오 (FEATURE-009 FR-13 · 25 · 28~31) | 완료(슬라이스 6) — 아래 FR-10a~10e. "내 미러 보여줘" 대화 질의는 대화 화면이 없어 범위 밖 |
| FR-10a | 시나리오(`policy/scenario`) — `GET /api/coach/risk-budget` 응답 `scenarios`: 코인 보유 −10 · −30 · −50% 손실(원) · 남는 평가금 · 종목별 몫 + 과거 구간 `2022-11-ftx`(업비트 일봉 11-05 → 11-21 종가 수익률을 지금 보유에 얹음, 서버 상수). 그 구간 일봉이 없는 종목이 있으면 그 구간만 `insufficient_data` + `missingSymbols`, 구간 일봉 조회가 실패해도 게이지는 나간다. 확률 필드 없음 (FEATURE-009 FR-25) | 완료 |
| FR-10b | "오를 확률" Brier(`policy/brier`) — 계획의 `reviewAt`(없거나 적은 시각 이전이면 30일) 뒤 첫 닫힌 종가 vs **적기 전 마지막 닫힌 종가**, 같으면 오르지 않음. 평균 · 기준선 0.25 · 실력(1 − 평균 ÷ 기준선) · 빗나간 수 · 만기 전 · 채점 불가 · 최근 빗나간 3건. 저장하지 않는다 — `GET /coach/mirror` `brier`(전 기간)와 월간 복기(만기가 그달)가 센다. live 계획만. 포트 `TradePlanStore.listForecasted` (FEATURE-009 FR-13) | 완료 |
| FR-10c | 진입 전 체크리스트(`policy/entryChecklist`) — size-check `behavior.checklist`(매수만): 손익 합이 음수인 태그를 비용 순 3개까지 질문(서버 템플릿, 사용자 정의 태그는 이름을 넣은 공통 질문) + 프리모템 문장. `POST /coach/plans` `checklist{shown, checked}`(checked ⊆ shown, 만든 뒤 수정 없음) → `trade_plans.checklist` 기록만 (FEATURE-009 FR-30) | 완료 |
| FR-10d | IPS 3문항 — `PUT /coach/risk-budget` 에 `maxSingleAssetWeight`(0.05~1, `null` = 기본 0.6) · 응답 `settings.maxSingleAssetWeight`. 월 · 1회 예산의 % 단위는 슬라이스 1 그대로 (FEATURE-009 FR-2 · FR-31 의 3문항 몫) | 완료 |
| FR-10e | 월간 복기(`policy/monthlyReview` · `BuildMonthlyReview` · `GetMonthlyReview`) — `GET /api/coach/review/monthly?month=YYYY-MM`(없으면 KST 지난달). 그달 거래 수 · 준수율(그달 체결 거래에 연결된 계획) · 처분효과(그달 매도) · 보유 대비(구간 TWR — 구간 전날 보유가 출발점) · 회전율(대금 ÷ 2 ÷ 월말 평가금) · 태그 비용 · 비용 최대 태그 · IPS 이탈 일수(지금 설정 기준, 비율 예산은 월초 평가금 대비) · Brier · "이번 달 한 가지"(템플릿, 금액 없음). **끝난 달만 · 한 번 만들고 고치지 않는다**(`monthly_reviews`, 이미 있으면 읽기만). 워커 매일 06:40 + 부팅 1회가 지난달 것을 채우고, 없으면 첫 조회가 만든다 (FEATURE-009 FR-28) | 완료 |
| FR-11 | 실현 변동성 읽기 — `ForecastReader.realizedVolatility` 를 `forecast.v_realized_vol` 로(`KRW-` 접두 · `annualized` null 또는 `as_of` 3일 초과면 `null`) | 완료(슬라이스 2) |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-24 | 신설 · 슬라이스 1 FR-1~8 구현. 근거 `reports/checklists/SRV-REQ-038.md` |
| 2026-09-24 | 슬라이스 2 FR-11 — 실현 변동성 읽기(`FC-REQ-006`). 메서드 하나 · 응답 계약 변경 없음 |
| 2026-09-24 | 슬라이스 3 — **서버 변경 없음.** BFF(`BFF-REQ-038`)가 FR-1 · 5 · 6 · 7 과 `POST /portfolio/transactions` 를 그대로 소비. 거래 + 계획은 BFF 가 순서대로 두 번 부른다 — 한 트랜잭션으로 옮길지는 슬라이스 4 전에 결정 |
| 2026-09-27 | 슬라이스 6 FR-10(10a~10e) — 시나리오 · Brier · 진입 전 체크리스트 · 한 종목 상한 입력 · 월간 복기. 새 경로 1(`GET /review/monthly`) · risk-budget 응답 `scenarios` · `settings.maxSingleAssetWeight` · PUT `maxSingleAssetWeight` · mirror 응답 `brier` · size-check `behavior.checklist` · plans `checklist`. 마이그레이션 2(`DB-REQ-031` FR-11 · 12, 추가만). `benchmarkMirror` 를 일별 평가금 흐름(`portfolioSeries`)으로 옮겨 복기와 같은 규칙을 쓴다(값 불변 — 슬라이스 4 테스트 그대로). 근거 `reports/checklists/SRV-REQ-038.md` §슬라이스 6 |
| 2026-09-27 | 슬라이스 5 FR-12 · FR-13 — size-check `behavior`(태그 후보 · 엣지 없음 · 매도 프레이밍, 요청 `hasPlan`) · 행동 알림을 요청 시 측정으로(워커 단계 · `behavior_analysis` 쓰기 삭제). 마이그레이션 없음. 근거 `reports/checklists/SRV-REQ-038.md` §슬라이스 5 |
| 2026-09-27 | 슬라이스 4 FR-9(9a~9f) — 판정 배치 · 결정 결과 · 자동 태그 · 미러 · 태그 확정. 새 경로 3(`GET /mirror` · `GET /outcomes` · `PUT /outcomes/:id/tags`) + `PATCH /plans/:id` 에 `userAdherenceLabel`. 마이그레이션 없음(슬라이스 1 스키마). 근거 `reports/checklists/SRV-REQ-038.md` §슬라이스 4 |
