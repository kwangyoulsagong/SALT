---
id: DB-REQ-040
feature: F015
area: db
kind: SCHEMA
title: "셸 — identity 스키마(도메인 선택 · 홈 카드 순서 · 알림 설정 · 내보내기 · 삭제 기록 · 서명 키)"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

## Summary

`User` · 초대 코드 · 온보딩 상태를 `identity` 스키마로 옮기고(서버 S3), 돈 관리 앱 셸에 필요한 설정을 더한다.

## FR

| FR | 내용 | FEATURE-015 |
|---|---|---|
| FR-1 | `user` · `invite_code` · `onboarding_state` 이동(`DB-REQ-036`). 기존 3스텝 온보딩 상태는 `legacy_step` 으로 보존 | FR-1 |
| FR-2 | `user_domain_pref` — 고른 도메인(savings · household · invest) · 홈 카드 순서 · 숨김 | FR-1 · 2 |
| FR-3 | `notification_pref` — 도메인별 켬/끔, **기본 꺼짐**(행이 없으면 꺼짐). F000 FR-50 알림 종류 게이트를 도메인 축으로 확장 | FR-4 |
| FR-4 | `data_export_request` — 요청 시각 · 형식 · 상태 · 만료(파일은 24시간 뒤 삭제). `account_deletion_log` — 삭제 시각 · 도메인별 삭제 행 수(개인 데이터 없음) | FR-3 |
| FR-5 | `signing_key` — JWKS 키 id · 공개키 · 활성 구간(키 교체 · 이중 검증 기간) | 아키텍처 S3 |
| FR-6 | 민감 정보 분류 표 `data_classification`(스키마.테이블.열 → 등급 · LLM 전송 허용) — 공개 문서의 원천 | FR-5 |

## Acceptance Criteria

- [ ] 기존 사용자 · 초대 코드 행 수 이동 전후 같음
- [ ] 알림 설정 행이 없는 사용자는 모든 도메인 꺼짐으로 읽힌다

## 계약 영향

- 서버 `SRV-REQ-048`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
