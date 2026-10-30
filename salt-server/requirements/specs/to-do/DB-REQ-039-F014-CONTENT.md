---
id: DB-REQ-039
feature: F014
area: db
kind: SCHEMA
title: "금융 팁 — content 스키마(글 메타 · 제도 파라미터 유효 구간 · 트리거 · 닫기 기록 · 퀴즈)"
priority: medium
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-014-money-tips.md
---

## Summary

글 원문은 레포 MDX 가 1안(검수 = PR 리뷰, FEATURE-014 Open Question). DB 에는 **메타 · 제도 파라미터 · 트리거 · 사용자 기록**만 둔다.

## FR

| FR | 내용 | FEATURE-014 |
|---|---|---|
| FR-1 | `tip` — `slug` · 제목 · 출처 URL · 작성일 · 검수일 · 기준 연도 · `valid_until` · `status`(`published` · `needs_check`) · 원문 해시. 필수 열 NOT NULL — 하나라도 없으면 INSERT 실패 | FR-1 |
| FR-2 | `tip_revision` — 변경 이력(이전 해시 · 변경 요약 · 시각). 공개 | FR-2 · 7 |
| FR-3 | `policy_param` — 키(예: `marriage_tax_credit`) · 값 NUMERIC/텍스트 · 단위 · `valid_from` · `valid_to` · 출처 · 기준일. 같은 키의 유효 구간이 겹치면 제약 위반(exclusion constraint) | FR-3 |
| FR-4 | `trigger_rule` — 트리거 종류(goal_created:wedding · month:11 · fixed_cost_increase 등) · 대상 `tip` · 활성 | FR-4 |
| FR-5 | `tip_dismissal` — `user_id` · `tip_id` · 시각. 한 번 닫으면 다시 안 띄움 | FR-4 |
| FR-6 | `quiz_answer` — `user_id` · 문제 · 맞힘 여부 · 시각(카드 모음) | FR-8 |
| FR-7 | outbox 행(`PolicyParamChanged`)은 `SRV-REQ-044` 공통 테이블 | FR-3 |

## Acceptance Criteria

- [ ] 메타 하나 빠진 `tip` INSERT 실패
- [ ] 같은 키 유효 구간 겹침 INSERT 실패

## 계약 영향

- 서버 `SRV-REQ-047`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
