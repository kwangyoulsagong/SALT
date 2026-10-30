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

- [ ] 결제 문자 원문이 DB · 로그 · 추적에 0(로그 캡처 테스트)
- [ ] 예산 초과 응답에 경고 · 차단 필드 0
- [ ] 카드사 문자 표본 파싱 테스트(마스킹 포함)
- [ ] 착지 구간 백테스트(지난 3개월 표본) 결과 기록

## 계약 영향

- DB `DB-REQ-038` · BFF `BFF-REQ-048` · 프론트 `FE-REQ-057` · RN `RN-REQ-034` · savings `SRV-REQ-045` FR-17

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
