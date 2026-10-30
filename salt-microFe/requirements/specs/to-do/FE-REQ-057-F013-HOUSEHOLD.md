---
id: FE-REQ-057
feature: F013
area: frontend
kind: UI
title: "F4 — 가계부 zone(apps/web-household + domain-household): 3초 입력 · 붙여넣기 · 봉투 · 착지 · 목표 시계"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-013-household-budget.md
---

## Summary

신규 zone. 웹은 붙여넣기 · 월 화면 · 예산 편집이 강하고, 빠른 입력의 주 무대는 RN(`RN-REQ-034`)이다.

## FR

| FR | 내용 | FEATURE-013 |
|---|---|---|
| FR-1 | `/household` — 이번 달 · 봉투 · 착지 구간 · 최근 지출 | FR-6 · 7 |
| FR-2 | `/household/new` — 금액 먼저(숫자 입력 포커스) · 최근 항목 칩 · 분류 제안 확인. 3탭 이내 | FR-1 · 2 |
| FR-3 | 붙여넣기 — 여러 문자 → 후보 목록(체크 · 수정) → 한 번에 저장. 원문은 컴포넌트 상태에서만, 저장 뒤 비움 · 로컬 저장 0 | FR-3 |
| FR-4 | 반복 템플릿 확인 카드 · 대략 합계 입력("대략" 라벨) | FR-4 · 5 |
| FR-5 | 저장 후 목표 시계 한 줄("결혼 목표 3일 늦어짐", `pending` 이면 "계산 중") | FR-8 |
| FR-6 | 예산 방식 고르기 · 봉투 편집. 초과는 회색 음수 — 빨강 · 경고 아이콘 · 팝업 0 | FR-6 |
| FR-7 | `/household/month/[ym]` — 착지 구간 + 지난달 적중 · 월 마감 리뷰 3문항 · 할부 띠 · 공제 계기판("추정" · 기준 연도) | FR-7 · 9 · 10 · 11 |
| FR-8 | 감정 태그 · 만족도 거울 · 사람 장부 · 노동시간 환산(끄고 켬) | FR-13~15 |
| FR-9 | 재미 — 챌린지(내가 고름 · 언제든 종료 · 실패 표시 0) · 달력 스티커(연속 일수 0) · 이야기 카드(공유 시 금액 가림 기본) | FR-16 · 19~21 |
| FR-10 | 저장 실패 시 입력값 보존 | UX |

## Acceptance Criteria

- [ ] 한 건 입력 3탭 이내(실측 기록)
- [ ] 예산 초과 화면에 경고 색 · 팝업 0
- [ ] 붙여넣기 원문이 localStorage · 로그 · 에러 리포트 0
- [ ] 연속 일수 표시 0 · 챌린지 실패 표시 0

## 계약 영향

- BFF `BFF-REQ-048`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
