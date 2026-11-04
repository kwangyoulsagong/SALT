---
id: BFF-REQ-048
feature: F013
area: bff
kind: API
title: "가계부 — /api/app/household/* 뷰모델(입력 · 파싱 · 월 화면 · 예산 · 챌린지)"
priority: high
created: 2026-10-30
source: salt-server/requirements/specs/to-do/SRV-REQ-046-F013-HOUSEHOLD.md
---

## FR

| FR | 내용 |
|---|---|
| FR-1 | `POST /api/app/household/expenses` — 저장 + 목표 시계 한 줄(`goalClock` · `pending` 허용) + 봉투 잔액 |
| FR-2 | `POST /api/app/household/parse` — 후보 목록. **요청 본문(문자 원문)을 BFF 로그 · 에러 리포트에 남기지 않는다**(로거에서 경로 단위 본문 제외) |
| FR-3 | `GET /api/app/household/month/:ym` — 봉투 · 착지 구간 · 지난달 적중 · 리뷰 · 스티커 |
| FR-4 | 템플릿 · 예산 · 챌린지 · 이야기 카드 경로 중계 |
| FR-5 | 저장 실패 시 입력값을 응답에 되돌려 화면이 보존(오프라인 큐는 RN) |

## Acceptance Criteria

- [x] parse 요청 본문이 BFF 로그 0(로그 캡처 테스트)
- [x] 목표 시계 지연 시 저장 응답 지연 0(`pending`)

## 구현 현황 — 가계부 S1a (2026-11-04, `requirements/specs/done/MONEY-S1-household-entry-slice.md`)

| FR | 상태 | 비고 |
|---|---|---|
| FR-1 | done — 저장 + 목표 시계(저축 `GET /savings/goal-clock?amount=savedTotal`, 300ms 예산 → `pending`) + 봉투. 여러 건 `POST /expenses/batch` · 다시 묻기 `GET /goal-clock?amount=` | 금액은 서버 `savedTotal` 그대로 — BFF 는 더하지 않는다 |
| FR-2 | done — 원문을 로그 · 오류에 남기는 길 0. **깨진 JSON 본문**은 파서 메시지(본문 조각)를 버리고 400 `INVALID_JSON`(error middleware — 모든 경로) | 로그 캡처 테스트 2 |
| FR-3 | done(봉투 · 착지 · 지난달 적중 · 지출 목록) — 리뷰 · 스티커 칸은 S1b | `GET /month/:ym` |
| FR-4 | 예산 · 제안 · 지우기 done — 템플릿 · 챌린지 · 이야기 카드는 S1b(**정정 2026-11-04** 템플릿 S1b · 챌린지 S1d 닫힘, 이야기 카드는 S1e) | |
| FR-5 | done — 저장 실패는 서버 4xx 를 그대로(입력 보존은 화면 상태) | |

홈 카드: 가계부 카드가 `CARD_SOURCES` 에 붙었다(`BFF-REQ-046`) — 이번 달 지출 + (예산 남은 금액 | 월말 예상 구간 | 비움).

## 구현 현황 — 가계부 S1b (2026-11-04, `requirements/specs/done/MONEY-S1b-household-month-slice.md`)

| FR | 상태 | 비고 |
|---|---|---|
| FR-3 | 리뷰(마감) · 예정 · 할부 칸 done — `recurring` · `installments` · `close` · `closable` · `reviewQuestions`. 스티커는 S1c(닫힘 2026-11-04 — 아래 S1c 표) | 서버 값 그대로 |
| FR-4 | 템플릿 · 예정 확인 · 건너뛰기 · 마감 중계 done(경로 7). 챌린지 · 이야기 카드는 ~~S1c~~ S1d(정정 2026-11-04) — **정정 2026-11-04** 챌린지는 S1d 닫힘, 이야기 카드는 ~~S1d~~ S1e | 확인 응답에도 목표 시계(저장과 같은 300ms · `pending`) |

## 구현 현황 — 가계부 S1c (2026-11-04, `requirements/specs/done/MONEY-S1c-household-mirror-slice.md`)

| FR | 상태 | 비고 |
|---|---|---|
| FR-3 | 스티커(달력 `calendar` — 칸 상태 · `markable` · `weekday`) · 감정(`feelings` — 묻기 · 거울 · 키) · 근무(`workHours` · 지출 `workMinutes`) 칸 — 서버 값 그대로 | 저장 응답 `savedWorkMinutes` · 제안 `emotions` |
| FR-4 | 중계 — `PUT/DELETE /expenses/:id/feeling` · `POST /expenses/:id/feeling/next` · `GET/PUT /settings/work-hours` · `PUT/DELETE /no-spend/:date`. 감정 · 급여 본문 로그 0(로그 캡처 테스트) | 챌린지는 S1d(닫힘 — 아래 표), 이야기 카드는 ~~S1d~~ S1e(정정 2026-11-04) |

## 구현 현황 — 가계부 S1d (2026-11-04, `requirements/specs/done/MONEY-S1d-household-challenge-slice.md`)

| FR | 상태 | 비고 |
|---|---|---|
| FR-3 | 달력 한 날 칸(`calendar.days[].challenge` · `challengeDays`) — 서버 값 그대로 | |
| FR-4 | 챌린지 중계 — `GET/POST /challenges`(목록에 저축 진행 중 목표 `goals` — 저축 실패면 null, 목록은 그대로) · `POST /challenges/:id/end` · `PUT/DELETE /challenges/:id/days/:date` · `POST /challenges/:id/savings` · `DELETE /challenge-savings/:id` | 경로 23 → 31 |
| FR-4 보태기 | `POST /challenge-savings/:id/contribute` — **두 서비스 쓰기의 순서**: 가계부에서 금액 · 날짜 읽기(본문 금액 무시) → 저축 `challenge-deposits`(출처 하나에 한 번) → 가계부 "보탰다". 저축 거절이면 가계부를 부르지 않는다 · 빈 목표 400(서비스 호출 0) | 슬라이스 판단 4 · `bff-architecture.md` §5 |
| FR-4 이야기 카드 | S1e | |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-04 | 가계부 S1a — in-progress(`b162ac6f`). FR-1 · 2 · 5 done · 3 · 4 일부. 수용 기준 2/2 |
| 2026-11-04 | 리뷰 반영 — BFF 변경 0. 남긴 것: `within` 시간 상한이 홈 서비스와 두 벌 · axios 타임아웃과 이중(회고) |
| 2026-11-04 | 가계부 S1a — 이 REQ 계약을 화면 쪽에서 읽는 파일(`householdApi.ts` · `types.ts`)이 엔티티 이름 변경으로 옮겨졌다(`b147221e`, 계약 변경 0) |
| 2026-11-04 | 가계부 S1b — 템플릿 · 예정 확인 · 마감 경로 · 월 화면 새 칸(`c3b799fd`). 테스트 +2(서비스 7) |
| 2026-11-04 | 가계부 S1c — 감정 · 노동시간 · 안 쓴 날 경로 · 월 화면 새 칸(`53d91b5c`). 테스트 +1(전체 363) · 조회 예산 주석 "월 화면 16회" |
| 2026-11-04 | 가계부 S1d — 챌린지 경로 8 · 보태기 순서 · 달력 한 날 칸(`22b71577`). 테스트 +2(전체 365) |
