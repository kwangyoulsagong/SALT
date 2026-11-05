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

- [x] 메타 하나 빠진 `tip` INSERT 실패 — 종단 테스트 SQLSTATE 23502(`ContentEndToEndTest`)
- [x] 같은 키 유효 구간 겹침 INSERT 실패 — 종단 테스트 SQLSTATE 23P01(트리거)

## 계약 영향

- 서버 `SRV-REQ-047`

## 구현 현황 — 금융 팁 S2a(2026-11-05, 루트 `requirements/specs/done/MONEY-S2a-tips-content-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 `tip` | **done** — 필수 열 NOT NULL · 날짜 순서 CHECK · slug 형식 · 해시 64자. 본문 열 없음(원문은 레포 파일) | `V1__baseline.sql` |
| FR-2 `tip_revision` | **done** — 쌓기만 · 최근 먼저 조회 | 같은 파일 |
| FR-3 `policy_param` | **done(정정)** — ~~exclusion constraint~~ 같은 뜻의 **트리거**(`btree_gist` 확장을 서비스 계정이 못 만든다) · 키 advisory lock · 트리거가 걸린 스키마로 표를 찾는다(관리자 psql 에서도 같은 검사). 열 이름 `param_key` · `num_value` · `text_value` | 같은 파일 |
| FR-4 `trigger_rule` | **done** — 원문에서 빠진 규칙은 `active=false` | 같은 파일 |
| FR-5 `tip_dismissal` | **done** — (사용자, 글) 키 · 두 번 닫아도 한 행 | 같은 파일 |
| FR-6 `quiz_answer` | 범위 밖 — 퀴즈는 S2b | S2b |
| FR-7 outbox | **done** — 공통 세 표(outbox · processed_event · shedlock) | 같은 파일 |
| **FR-8(신설)** `user_signal` | **done** — 다른 서비스 이벤트에서 온 트리거 사실만(이벤트 ID 키 · 금액 · 목표 이름 0) | 같은 파일 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-05 | 금융 팁 S2a — to-do → in-progress. FR-1~5 · 7 done, FR-3 은 트리거로 정정(확장 권한), **FR-8 `user_signal` 신설**, FR-6 퀴즈는 S2b. 커밋 `38e2d16d` · 로컬 운영 DB `svc_content` 로그인 · Flyway V1 적용 |
