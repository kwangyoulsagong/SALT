---
id: RN-REQ-033
feature: F012
area: rn
kind: UI
title: "저축 탭(네이티브) — 목표 · 적립 · 모이는 장면 · 홈 화면 위젯"
priority: medium
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-012-savings-goals.md
---

## FR

| FR | 내용 | FEATURE-012 |
|---|---|---|
| FR-1 | 목표 목록 · 상세 · 만들기 · 적립(나눠 넣기) — 웹과 같은 BFF 계약(`BFF-REQ-047`). 계산 0 | FR-1~4 |
| FR-2 | 도달 구간 · 적중 이력 · 저울 | FR-4~6 |
| FR-3 | 모이는 장면 네이티브 모션(Reanimated) · 시스템 동작 줄이기 설정 존중 · 적립 햅틱 | FR-15 |
| FR-4 | **홈 화면 위젯** — 목표 하나의 장면 단계 · 실물 환산 한 줄. iOS WidgetKit · Android 앱 위젯(네이티브 모듈 → 버전 게이트 `RN-REQ-002` FR-42). 금액 표시는 사용자 선택(기본 가림) | 재미 "홈 화면 위젯" |
| FR-5 | 도장판 · 엽서 보관함(사진 선택은 사용자 동작으로만) | FR-17 · 18 |

## Acceptance Criteria

- [ ] 위젯 금액 기본 가림
- [ ] 동작 줄이기에서 모션 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
