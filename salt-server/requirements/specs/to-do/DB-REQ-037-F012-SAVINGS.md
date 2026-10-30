---
id: DB-REQ-037
feature: F012
area: db
kind: SCHEMA
title: "저축 목표 — savings 스키마(목표 · 적립 · 구간 발행 · 장면 · 실물 단위 · 도장 · 엽서 · 공동 목표)"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-012-savings-goals.md
---

## Summary

지금 목표는 `Goal`(이름 · 금액 · 날짜 · `GoalCategory` travel/first_car/startup/wedding/creative/other)과 `SavingTransaction` 뿐이다.
`savings` 스키마로 옮기고(`DB-REQ-036`), 계산 · 채점 · 재미에 필요한 테이블을 더한다. DDL 주인은 Flyway(서버 S1).

## FR

| FR | 내용 | FEATURE-012 |
|---|---|---|
| FR-1 | `goal` 이동 + 열 추가 — `template`(wedding · housing · first_car · travel · emergency · childbirth · other) · `monthly_plan NUMERIC` · `include_interest bool` · `scene_kind` · `archived_at`. 기존 `GoalCategory` 값은 매핑 표로 이전(startup · creative → other + 원래 값 `legacy_category` 보존) | FR-1 · 2 |
| FR-2 | `deposit`(= 기존 `SavingTransaction`) — `goal_id` · `amount NUMERIC` · `deposited_on date` · `split_group_id`(여러 목표 나눠 넣기 한 묶음) · `source`(`manual` · `saved_by_challenge`). 실제 적립과 챌린지 "아낀 돈"은 `source` 로 구분 | FR-3 · F013 FR-19 |
| FR-3 | `projection_issued` — `goal_id` · `issued_at` · `p_low_date` · `p_high_date` · `plan_date` · `method`(`empirical_quantile` · `plan_only`) · `reason`(기록 부족 등). 불변(INSERT 만) — 채점 근거 | FR-4 · 5 |
| FR-4 | `projection_score_cache` — forecast 가 돌려준 커버리지 집계(기간 · 구간 수 · 적중 수) 사본 | FR-5 |
| FR-5 | `item_unit` — 실물 환산 단위(`template` 또는 `user_id`) · 이름 · 단가 NUMERIC · 출처 · 기준일. 사용자 단위는 본인만 | FR-16 |
| FR-6 | `stamp` — `goal_id` · `deposit_id`(null = 목표 생성 첫 도장) · `created_at` | FR-17 |
| FR-7 | `postcard` — 달성 목표 보관(`goal_id` · 사진 키 · 걸린 일수 · 적립 횟수). 사진은 파일 저장소 키만 | FR-18 |
| FR-8 | `shared_goal_member` — 공동 목표 두 사람 · 합의 비율 · 초대 상태. `reaction`(deposit_id · user_id · emoji) | FR-13 · 19 |
| FR-9 | `policy_param_copy` — content 의 `PolicyParamChanged` 사본(키 · 값 · 유효 구간) | FR-12 |
| FR-10 | 인덱스 — `deposit(goal_id, deposited_on)` · `projection_issued(goal_id, issued_at desc)` · 사용자별 목표 목록 `goal(user_id, archived_at)` | 성능 |
| FR-11 | 마이그레이션 — 테이블 이동 + 열 추가 + 매핑. 되돌리기는 열 삭제 · 역이동, 금액 열은 손대지 않는다 | — |

## Acceptance Criteria

- [ ] 기존 목표 · 적립 행 수가 이동 전후 같다
- [ ] `projection_issued` UPDATE · DELETE 가 트리거로 실패
- [ ] `legacy_category` 로 원래 값 복원 가능

## 계약 영향

- 서버 `SRV-REQ-045` · 예측 `FC-REQ-024`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
