---
id: FE-REQ-055
feature: F015
area: frontend
kind: UI
title: "셸 — 홈 요약 카드 · 도메인 선택 온보딩 · 내 데이터 · 알림 설정"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

## Summary

셸은 도메인 코드를 모른다. 홈은 `HomeSummaryCard[]` 를 그리는 화면이고, 온보딩은 "무엇을 관리하고 싶나"를 고르는 3단계다.

## FR

| FR | 내용 | FEATURE-015 |
|---|---|---|
| FR-1 | `packages/core` `HomeSummaryCard` 타입(설계 문서 그대로) · 카드 컴포넌트 하나. 값은 서버 문자열 그대로 — FE 계산 0 | FR-2 |
| FR-2 | 홈 — 카드 순서 · 숨김 편집. 기본 순서 저축 → 가계부 → 투자 → 팁. 카드별 Suspense 경계, 실패 카드만 `degraded` | FR-2 |
| FR-3 | `FE-REQ-048`(홈 데스크톱) 배치를 카드 계약 위로 다시 읽는다 — 요약 타일 값은 카드 `primary/secondary` 에서 | FR-2 |
| FR-4 | 온보딩 — 도메인 선택(모으기 · 쓰는 돈 · 투자) → 고른 도메인 첫 입력 하나 → 끝. 첫 입력 폼은 해당 zone 화면으로 이동(`CrossZoneLink` + 돌아오기). 투자 미선택이면 투자 질문 0 | FR-1 |
| FR-5 | 내 데이터 — 내보내기 요청 · 상태 · 받기, 계정 삭제(재인증 · 삭제 범위 표시) | FR-3 |
| FR-6 | 알림 설정 — 도메인별 켬/끔, 기본 꺼짐 | FR-4 |
| FR-7 | 개인정보 — LLM 에 보내는 필드 목록 화면(서버 API) | FR-5 |
| FR-8 | 문구 — "연결 · 연동" 0, 칭찬 · 재촉 0 | 정책 |

## Acceptance Criteria

- [ ] 셸 코드에 `domain-*` import 0(lint)
- [ ] 홈 카드 하나 강제 실패 시 나머지 표시
- [ ] 온보딩 경로 3종 E2E(저축만 · 가계부만 · 투자 포함)
- [ ] 금지 문구 grep 0

## 계약 영향

- **BFF 홈 계약 변경** `BFF-REQ-046` — `FE-REQ-053` 커밋 2 와 같은 PR

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
