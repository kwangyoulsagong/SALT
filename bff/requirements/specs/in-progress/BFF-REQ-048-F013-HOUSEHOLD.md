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

- [ ] parse 요청 본문이 BFF 로그 0(로그 캡처 테스트)
- [ ] 목표 시계 지연 시 저장 응답 지연 0(`pending`)

## 구현 현황 — 가계부 S1a (2026-11-04, `requirements/specs/in-progress/MONEY-S1-household-entry-slice.md`)

| FR | 상태 | 비고 |
|---|---|---|
| FR-1 | done — 저장 + 목표 시계(저축 `GET /savings/goal-clock?amount=savedTotal`, 300ms 예산 → `pending`) + 봉투. 여러 건 `POST /expenses/batch` · 다시 묻기 `GET /goal-clock?amount=` | 금액은 서버 `savedTotal` 그대로 — BFF 는 더하지 않는다 |
| FR-2 | done — 원문을 로그 · 오류에 남기는 길 0. **깨진 JSON 본문**은 파서 메시지(본문 조각)를 버리고 400 `INVALID_JSON`(error middleware — 모든 경로) | 로그 캡처 테스트 2 |
| FR-3 | done(봉투 · 착지 · 지난달 적중 · 지출 목록) — 리뷰 · 스티커 칸은 S1b | `GET /month/:ym` |
| FR-4 | 예산 · 제안 · 지우기 done — 템플릿 · 챌린지 · 이야기 카드는 S1b | |
| FR-5 | done — 저장 실패는 서버 4xx 를 그대로(입력 보존은 화면 상태) | |

홈 카드: 가계부 카드가 `CARD_SOURCES` 에 붙었다(`BFF-REQ-046`) — 이번 달 지출 + (예산 남은 금액 | 월말 예상 구간 | 비움).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-04 | 가계부 S1a — in-progress(`b162ac6f`). FR-1 · 2 · 5 done · 3 · 4 일부. 수용 기준 2/2 |
| 2026-11-04 | 리뷰 반영 — BFF 변경 0. 남긴 것: `within` 시간 상한이 홈 서비스와 두 벌 · axios 타임아웃과 이중(회고) |
