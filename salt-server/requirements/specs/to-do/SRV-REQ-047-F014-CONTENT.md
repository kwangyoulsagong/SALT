---
id: SRV-REQ-047
feature: F014
area: server
kind: API
title: "content 서비스(Kotlin, S2) — 글 메타 · 유효기한 · 제도 파라미터 · 때맞춘 팁 · 법적 선 검사기"
priority: medium
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-014-money-tips.md
---

## Summary

공적 제도 설명만 한다(상품 · 금리 비교 · 가입 링크 · 대가 · 명령형 0). **법무 확인 전 공개 금지**(FEATURE-014 Open Question).

## FR

| FR | 내용 | FEATURE-014 |
|---|---|---|
| FR-1 | 발행 검사 — 출처 · 작성일 · 검수일 · 기준 연도 · 유효기한 하나라도 없으면 거부 | FR-1 |
| FR-2 | 유효기한 점검 워커(일 1회) — 지나면 `needs_check` · noindex 신호 · 트리거 제외 · 변경 이력 | FR-2 |
| FR-3 | 제도 파라미터 표의 주인 — 조회 API(키 · 기준일 → 값) · 변경 시 `PolicyParamChanged` | FR-3 |
| FR-4 | 때맞춘 팁 — 구독: `GoalCreated`(결혼 · 주거) · `FixedCostIncreased` · `GoalReached` · 월 트리거(5월 · 11~12월 · 월초). `GET for-me?context=` 는 0~1건, 닫은 것 제외 | FR-4 |
| FR-5 | 법적 선 검사기 — 상품명 · 금리 비교 · 가입 링크 · 명령형 · 종목 · 매매 시점 패턴 → 발행 실패. coach 금지 표현 검증기 공용 모듈로 | FR-5 |
| FR-6 | 내 숫자로 다시 읽기 — 로그인 시 예시 숫자를 사용자 값으로(서버 계산, 해당될 수 있는 제도 + 요건 체크까지) | FR-6 |
| FR-7 | 제도 변경 diff — `tip_revision` 조회 | FR-7 |
| FR-8 | 퀴즈 — 답 기록 · 맞힌 카드 목록 | FR-8 |
| FR-9 | 홈 요약 카드(이번 달 해당될 수 있는 제도 1건 또는 `empty`) | FEATURE-015 FR-2 |

## Acceptance Criteria

- [ ] 메타 빠진 글 발행 실패 · 금지 문장 삽입 변이 테스트 실패
- [ ] 유효기한 경계(당일 · 다음 날) 테스트
- [ ] 법무 검토 기록 전 공개 플래그 꺼짐

## 계약 영향

- DB `DB-REQ-039` · BFF `BFF-REQ-049` · 프론트 `FE-REQ-058` · savings · household(파라미터 구독)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
