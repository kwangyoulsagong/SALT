---
id: BFF-REQ-046
feature: F015
area: bff
kind: API
title: "셸 — 홈 요약 카드 조립(HomeSummaryCard[] · allSettled) · 도메인 선택 온보딩 · 내보내기 · 알림 설정"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

## Summary

`/api/app/home` 은 지금 coach · portfolio 블록을 직접 조립한다. 셸이 도메인을 모르게(`ADR-005` §2) **도메인마다 카드 한 장**으로 바꾼다. **계약 변경** — 프론트 `FE-REQ-055` 와 같은 PR.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/home` → `{ cards: HomeSummaryCard[], order, hidden }`. 서비스 4곳(`savings` · `household` · `invest`(coach+portfolio 요약) · `tips`) 병렬 `allSettled`, 실패 카드는 `state:"degraded"` |
| FR-2 | `HomeSummaryCard` 타입은 `@repo/core` 와 같은 정의(BFF 가 import 하거나 `contracts/` 에서 생성). `primary.value` 는 서버 포맷 문자열 — BFF 도 숫자 계산 0 |
| FR-3 | 카드 타임아웃 800ms — 넘으면 그 카드만 `degraded` |
| FR-4 | 투자 카드 — 보유 평가 한 줄 + "이번 주 투자 적립"(F003, 있으면) + 코치 한 줄. 투자를 고르지 않은 사용자는 카드 숨김이 기본 |
| FR-5 | `PUT /api/app/home/layout` — 순서 · 숨김 |
| FR-6 | `POST /api/app/onboarding` — 도메인 선택 · 첫 입력. 기존 3스텝 계약은 FE 전환 PR 까지 유지 후 삭제 |
| FR-7 | `POST /api/app/me/export` · `GET /api/app/me/export/:id` · `DELETE /api/app/me`(재인증) |
| FR-8 | `GET/PUT /api/app/me/notifications` — 도메인별 |
| FR-9 | 기존 홈 블록 경로(`/api/app/home/*`)는 FE 전환 뒤 삭제 — 그 전까지 병존 |

## Acceptance Criteria

- [ ] 서비스 하나 강제 실패 시 홈 200 + 그 카드만 `degraded`
- [ ] BFF 코드에 카드 숫자 계산 0(리뷰 · grep)
- [ ] 프론트 타입과 같은 정의(타입 테스트)

## 계약 영향

- **BREAKING(홈)** — `FE-REQ-055` 와 같은 PR. 서버 `SRV-REQ-045`~`048` 의 `home-card`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
