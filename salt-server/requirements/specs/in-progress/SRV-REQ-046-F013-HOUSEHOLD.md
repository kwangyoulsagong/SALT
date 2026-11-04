---
id: SRV-REQ-046
feature: F013
area: server
kind: API
title: "household 서비스(Kotlin, S1) — 빠른 입력 · 문자 파싱 · 반복 · 봉투 · 착지 구간 · 목표 시계 · 재미"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-013-household-budget.md
---

## Summary

신규 서비스. 입력은 수동(연동 0). 예산은 막지 않는다 — 초과는 숫자로만. 금액 · 착지 · 지연 일수는 전부 서버.

## FR

| FR | 내용 | FEATURE-013 |
|---|---|---|
| FR-1 | 지출 저장 — 금액 · 분류 · 결제수단 · 태그. 저장 응답에 목표 시계(savings 지연 일수 조회, 50ms 타임아웃 → 넘으면 `goalClock:"pending"`) | FR-1 · 8 |
| FR-2 | 최근 항목 · 가맹점 제안 — 사용자 최근 30일 빈도 | FR-1 |
| FR-3 | 한 줄 파싱 `POST /parse` — 금액은 정규식으로 확정, 분류는 규칙 → (선택) LLM 제안. LLM 에 금액 · 가맹점 외 개인정보 0, 실패해도 저장 막지 않음 | FR-2 |
| FR-4 | 결제 문자 다건 파싱 — 금액 · 가맹점 · 일시 · 할부 개월. 카드번호 · 이름 패턴은 파싱 전에 마스킹, **원문은 요청 메모리에서만 · 로그 0 · 저장 0**. 저장 전 후보 목록만 반환 | FR-3 |
| FR-5 | 반복 템플릿 — 일 1회 워커(ShedLock)가 예정 행 생성, 확인 전에는 착지 계산에 "예정"으로만 | FR-4 |
| FR-6 | 대략 합계 — `precision:approx`. 월 통계에서 정확/대략 분리 | FR-5 |
| FR-7 | 봉투 — 남은 금액 · 하루 가용액. 초과는 음수 값만(경고 · 차단 응답 0) | FR-6 |
| FR-8 | 월말 착지 구간 — 지금까지 + 예정 반복 + 변동 일평균 분포 × 남은 날. `landing_issued` 기록 · 지난달 같은 날짜 적중 여부 | FR-7 |
| FR-9 | 월 마감 리뷰 3문항 저장 · `MonthClosed` 발행 | FR-9 |
| FR-10 | 할부 · 리볼빙 띠 — 원거래 + 남은 월 청구 계산 | FR-10 |
| FR-11 | 공제 계기판 — 총급여(사용자 입력) 25% 문턱 · 결제수단별 추정. 공제율 · 한도는 content 파라미터 · 기준 연도, `estimate:true` | FR-11 |
| FR-12 | 고정비 · 이상치 — 약 30일 주기 반복 감지 · 분류 중앙값 배수. 고정비 증가 시 content 트리거용 이벤트 | FR-12 |
| FR-13 | 감정 태그 · 다음 날 만족도 거울(분포만, 평가 문구 0) | FR-13 |
| FR-14 | 사람 장부 · 경조사 봉투 | FR-14 |
| FR-15 | 노동시간 환산(시급 사용자 입력) | FR-15 |
| FR-16 | 무지출일 달력 · 스티커(연속 일수 계산 안 함) | FR-16 · 20 |
| FR-17 | 영수증 인식 — 보류(Could, 한국어 정확도 실측 뒤 별도 REQ) | FR-17 |
| FR-18 | 홈 요약 카드 — 이번 달 지출 · 착지 · 예산 남은 금액 | FR-18 |
| FR-19 | 챌린지 — 사용자 선택 · 언제든 종료 · 아낀 돈 기록 → 목표에 보태기(savings 적립 `source=saved_by_challenge`) | FR-19 |
| FR-20 | 이야기 카드 — 월말 · 연말 집계(가장 많이 쓴 분류 · 스티커 수 등). 공유 이미지는 금액 가림이 기본 | FR-21 |
| FR-21 | 발행 — `ExpenseRecorded` · `MonthClosed` · `FixedCostIncreased` · `LandingIssued`(착지 구간 발행 — 채점 `FC-REQ-024`) | — |

## API (Swagger)

`POST /api/household/expenses` · `GET /api/household/expenses?month=` · `POST /api/household/parse` · `GET/POST /api/household/templates` ·
`GET /api/household/month/:ym` · `POST /api/household/month/:ym/close` · `GET/PUT /api/household/budget` · `GET /api/household/home-card` · `GET/POST /api/household/challenges`

## Acceptance Criteria

- [x] 결제 문자 원문이 DB · 로그 · 추적에 0(로그 캡처 테스트)
- [x] 예산 초과 응답에 경고 · 차단 필드 0
- [x] 카드사 문자 표본 파싱 테스트(마스킹 포함)
- [x] 착지 구간 백테스트(지난 3개월 표본) 결과 기록 — 2026-11-04 생활 꼴 셋 흉내(고정 난수) 3개월 79.7%(220/276) · 36개월 82.1%(꾸준형 74.7 · 주말형 79.0 · 월세형 92.4) · `LandingBacktestSpec`(실사용 표본은 채점 `FC-REQ-024` 이 이어 본다)

## 계약 영향

- DB `DB-REQ-038` · BFF `BFF-REQ-048` · 프론트 `FE-REQ-057` · RN `RN-REQ-034` · savings `SRV-REQ-045` FR-17

## 구현 현황 — 가계부 S1a (2026-11-04, `requirements/specs/in-progress/MONEY-S1-household-entry-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 | **done** — 저장(한 건 · 여러 건 한 트랜잭션) · 응답에 그 분류의 봉투 · 이번 달 합 · `savedTotal`. **목표 시계는 서버가 아니라 BFF 가 붙인다**(슬라이스 판단 1 — 서비스 간 동기 호출 0). 50ms 대신 BFF 300ms 예산 → `pending` | `RecordExpenses` · `POST /expenses` · `/expenses/batch` |
| FR-2 | done — 최근 30일 가맹점 횟수 순 8개 + 마지막 분류 · 금액(창 함수 한 문장) | `GET /suggestions` |
| FR-3 | done(규칙만) — 금액 정규식(만 · 천 · 쉼표 · 영문 뒤 숫자 제외) · 분류 = 최근 같은 가맹점 → 낱말 표. **LLM 0**(판단 5) | `POST /parse` mode=line |
| FR-4 | done — 카드번호 · 이름 · 누적 금액을 파싱 전에 지움 · 원문은 인자로만(저장 · 로그 · 예외 메시지 0, 테스트로 확인) · 취소 문자 버림 · 할부 개월 · 연도 넘김 | `InputParser.messages` · mode=messages |
| FR-6 | done — `precision approx` 는 `inputKind approx` 에서만(DB CHECK 와 같은 뜻) · 월 합에서 정확/대략 분리 | `Expense.create` · `monthSummary` |
| FR-7 | done(`50_30_20` · `envelope`) — 남은 금액 음수 그대로 · 하루 가용(내림, 0 이하면 0). 경고 · 차단 필드 0. `account_split` 은 S1b | `BudgetMath` · `GET/PUT /budget` |
| FR-8 | done — **오늘 시작 기준**: 어제까지 합 + ~~첫 저장일~어제 날별 합의 연속 창 합 10 · 90% 분위 × 오늘 포함 남은 날~~ **정정 2026-11-04 `ea59a64f`** 남은 날 ≤ 7 이면 연속 창 합 분위, 더 길면 요일 평균 합 ± 1.2816 × sd(7일 합) × √(R/7)(무작위 0 · 백테스트 3개월 79.7%(220/276) · 36개월 82.1%(꾸준형 74.7 · 주말형 79.0 · 월세형 92.4)) · 14일 미만이면 `history_short` · ~~말일 `month_over`~~ **정정 2026-11-04** 말일에도 구간(`month_over` 는 계약 값만) · 지난달 같은 날짜 발행 vs 실제 합 적중 | `LandingEngine` · `GET /month/:ym` |
| FR-18 | done — 이번 달 지출 · 건수 · 예산 남은 금액 · 착지 | `GET /home-card` |
| FR-21 | 일부 — `ExpenseRecorded` · `LandingIssued`. `MonthClosed` · `FixedCostIncreased` 는 S1b | `OutboxHouseholdEvents` |
| FR-5 · 9~17 · 19 · 20 | S1b · 뒤 | 슬라이스 범위 밖 |

API 실제 목록: `POST /expenses` · `POST /expenses/batch` · `DELETE /expenses/:id` · `POST /parse` · `GET /suggestions` · `GET/PUT /budget` · `GET /month/:ym` · `GET /home-card`. 스펙의 `GET /expenses?month=` 는 월 화면 응답 `expenses` 로 들어갔다(목록 300건 · 합계는 전부). 템플릿 · 마감 · 챌린지 경로는 S1b.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-04 | 가계부 S1a — in-progress. Kotlin `services/household` 첫 판(`63146ddf`) · FR-1~4 · 6~8 · 18 · 21 일부. 목표 시계는 BFF 조립(`b162ac6f`) + 저축 조회(`a16356f6`). 수용 기준 3/4(백테스트는 3개월 표본 뒤) |
| 2026-11-04 | 리뷰(high) 1회 반영 `2177074c` — 착지 "오늘 시작 기준"(어제까지 + 오늘 포함 남은 날 — 그날 첫 저장 발행이 그날 나머지를 놓치던 것 · 말일 한 점) · 표본 시작 = 첫 저장일 · `1만2000` · `1,200만` · 소수 원 거절. 재리뷰 없음(규칙: 리뷰는 슬라이스당 1회) |
| 2026-11-04 | `ea59a64f` — 백테스트에서 구간이 이름표보다 좁았다(36개월 67.9%) → 긴 남은 기간 정규 근사로 82.1%. 수용 기준 4/4 · 쿼리 수 종단 테스트(월 8 · 저장 9/8 · 홈 5) |
