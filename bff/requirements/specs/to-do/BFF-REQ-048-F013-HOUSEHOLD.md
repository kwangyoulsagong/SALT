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

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
