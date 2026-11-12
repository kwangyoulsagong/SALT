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
| FR-1 | `user` · `invite_code` · ~~`onboarding_state`~~ 이동(`DB-REQ-036`). ~~기존 3스텝 온보딩 상태는 `legacy_step` 으로 보존~~ **정정 2026-11-06(S3a)** 3스텝 상태는 저장된 적이 없다(요청마다 계산) · 은퇴 — 새 온보딩 상태는 FR-2 표에. 이동은 S3b. ✅ **이동 2026-11-12(S3b)** — identity Flyway V2(열 뜻 그대로 · 시각 timestamptz · `invite_codes` FK 커밋 때 검사) · 관리자 `salt-platform/db/identity-import.sql`(대조 · 되돌리기 SQL) · 옛 표 drop 은 Prisma 마이그레이션(가드: identity 에 다 있지 않으면 멈춤 — **적용 승인 대기**) | FR-1 |
| FR-2 | `user_domain_pref` — 고른 도메인(savings · household · invest) · 홈 카드 순서 · 숨김. ✅ **done 2026-11-06(S3a)** — identity Flyway V1 · 사용자 하나에 한 행 · 목록은 쉼표 키 + 모양 CHECK · 온보딩 끝(`onboarded_at`)도 이 행(FR-1 의 `onboarding_state` 대신 — 옛 3스텝 상태는 은퇴해 `legacy_step` 보존이 필요 없다) | FR-1 · 2 |
| FR-3 | `notification_pref` — 도메인별 켬/끔, **기본 꺼짐**(행이 없으면 꺼짐). F000 FR-50 알림 종류 게이트를 도메인 축으로 확장. **정정 2026-11-06(S2c)** 주인은 identity 가 아니라 **notification 스키마** — 이벤트를 받을 때마다 읽는 쪽이 notification 이라(`msa-services.md` §4). ✅ done(`notification.notification_pref`) | FR-4 |
| FR-4 | `data_export_request` — 요청 시각 · 형식 · 상태 · 만료(파일은 24시간 뒤 삭제). `account_deletion_log` — 삭제 시각 · 도메인별 삭제 행 수(개인 데이터 없음) | FR-3 |
| FR-5 | `signing_key` — JWKS 키 id · 공개키 · 활성 구간(키 교체 · 이중 검증 기간). ✅ **2026-11-12(S3b)** — 공개 부분만(개인키는 환경 변수뿐) · kid = RFC 7638 지문 · 기동 때 지금 키 등록 · `retired_at` 전까지 JWKS | 아키텍처 S3 |
| FR-6 | 민감 정보 분류 표 `data_classification`(스키마.테이블.열 → 등급 · LLM 전송 허용) — 공개 문서의 원천 | FR-5 |

## Acceptance Criteria

- [x] 기존 사용자 · 초대 코드 행 수 이동 전후 같음 — 2026-11-12 S3b(사용자 5 · 코드 6 · 시도 6, 두 번 돌려도 같음)
- [x] 알림 설정 행이 없는 사용자는 모든 도메인 꺼짐으로 읽힌다 — 2026-11-06 S2c

## 계약 영향

- 서버 `SRV-REQ-048`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-06 | 서버 S2c(notification, 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md`): to-do → in-progress. FR-3 done · 주인 정정(identity → notification 스키마). 수용 기준 2 충족. 나머지는 S3 |
| 2026-11-06 | 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`): FR-2 done(`identity.user_domain_pref`) · FR-1 정정(옛 3스텝 상태 보존 불필요 — 은퇴). 로컬 운영 DB 적용(`svc_identity` 로그인 · Flyway V1). 커밋 `fc0207cb` |
| 2026-11-12 | 서버 S3b(`MONEY-S3b-identity-accounts`): FR-1 이동 · FR-5 서명 키 done. 로컬 운영 DB Flyway V2 · 가져오기 적용. 옛 public 표 drop 마이그레이션은 승인 대기. 수용 기준 1 충족 |
