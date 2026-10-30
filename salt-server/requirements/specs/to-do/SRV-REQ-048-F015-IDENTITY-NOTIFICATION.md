---
id: SRV-REQ-048
feature: F015
area: server
kind: API
title: "identity(S3) · notification(S2) — 도메인 선택 온보딩 · 내 데이터 내보내기 · 삭제 · 도메인별 알림 · JWKS"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

## Summary

셸이 쓰는 서버 몫. 토큰 발급자가 바뀌는 단계라 이중 검증 기간을 둔다. 알림은 이벤트 구독자로 바꾼다(587줄 — 첫 기존 컨텍스트 이전).

## FR

| FR | 내용 | FEATURE-015 |
|---|---|---|
| FR-1 | 온보딩 — 도메인 선택(savings · household · invest) → 고른 도메인 첫 입력 하나 → 끝. 투자를 안 고르면 투자 질문 0. 기존 3스텝 경로는 BFF 스위치 뒤까지 유지 | FR-1 |
| FR-2 | 홈 카드 순서 · 숨김 저장 · 조회 | FR-2 |
| FR-3 | 내 데이터 내보내기 — 각 서비스 `export` 내부 API 를 모아 CSV · JSON(zip). 본인만 · 24시간 만료 | FR-3 |
| FR-4 | 계정 삭제 — 재인증 뒤 `UserDeletionRequested` → 각 서비스 삭제 · 결과 행 수 보고. 판정 원장(불변)은 사용자 식별자 가명화 처리 방식을 ADR-003 범위 안에서 정한다(Open Question) | FR-3 |
| FR-5 | 알림 — 도메인별 설정 기본 꺼짐. notification 은 이벤트(`GoalReached` · `MonthClosed` · `JudgmentPublished`)를 구독만, 설정 꺼진 도메인 0건 | FR-4 |
| FR-6 | 민감 정보 분류 공개 — `data_classification` 을 읽어 "LLM 에 보내는 필드" 목록 API | FR-5 |
| FR-7 | 도메인 사용 계측 — 주간 활성 · 재개율 · 카드 클릭(금액 0, 사용자 해시) | FR-6 |
| FR-8 | JWKS — identity 가 RS256 발급 · `/.well-known/jwks.json`. 이중 검증 기간(옛 HS + 새 RS) 2주, 끝나면 HS 제거. 초대 코드 시도 제한 · 감사 로그 그대로 | S3 |
| FR-9 | `UserRegistered` 발행 → savings · household · content 초기 상태 | — |

## Acceptance Criteria

- [ ] 투자 미선택 사용자 온보딩에 투자 질문 0(E2E)
- [ ] 내보내기 zip 에 모든 도메인 기록 존재(임시 사용자 실스택)
- [ ] 이중 검증 기간 옛 · 새 토큰 모두 통과, 종료 후 옛 토큰 401
- [ ] 알림 설정 없는 사용자 발송 0

## 계약 영향

- DB `DB-REQ-040` · BFF `BFF-REQ-046` · 프론트 `FE-REQ-055` · RN `RN-REQ-035`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
