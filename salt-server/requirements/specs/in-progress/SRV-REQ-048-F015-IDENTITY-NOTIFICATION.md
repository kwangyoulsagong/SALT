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
| FR-1 | 온보딩 — 도메인 선택(savings · household · invest) → 고른 도메인 첫 입력 하나 → 끝. 투자를 안 고르면 투자 질문 0. ~~기존 3스텝 경로는 BFF 스위치 뒤까지 유지~~ **정정 2026-11-06(S3a)** 옛 3스텝은 은퇴 — 소비처(BFF 하나)가 같은 PR 에서 옮겨 Express `onboarding` · `/api/onboarding/status` 를 지웠다(`msa-services.md` §7 은퇴). ✅ **done 2026-11-06**(Kotlin `services/identity` `ShellPrefs` · `/api/identity/shell` · `/domains` · `/onboarding/finish`) | FR-1 |
| FR-2 | 홈 카드 순서 · 숨김 저장 · 조회. ✅ **done 2026-11-06**(`/api/identity/shell/layout` — 카드 넷 순열 · 하나는 보임 · 저장 전이면 서버 기본값: 안 고른 도메인 숨김) | FR-2 |
| FR-3 | 내 데이터 내보내기 — 각 서비스 `export` 내부 API 를 모아 CSV · JSON(zip). 본인만 · 24시간 만료 | FR-3 |
| FR-4 | 계정 삭제 — 재인증 뒤 `UserDeletionRequested` → 각 서비스 삭제 · 결과 행 수 보고. 판정 원장(불변)은 사용자 식별자 가명화 처리 방식을 ADR-003 범위 안에서 정한다(Open Question) | FR-3 |
| FR-5 | 알림 — 도메인별 설정 기본 꺼짐. notification 은 이벤트(~~`GoalReached` · `MonthClosed` · `JudgmentPublished`~~ **정정 2026-11-06(S2c)** `savings.GoalReached` · `household.FixedCostIncreased` · `coach.DecisionChanged` — MonthClosed 는 사용자가 한 일이라 빼고 · 코치는 판단 변화)를 구독만, 설정 꺼진 도메인 0건. ✅ **done 2026-11-06**(Kotlin `services/notification` · 설정 주인 notification · Express 은퇴) | FR-4 |
| FR-6 | 민감 정보 분류 공개 — `data_classification` 을 읽어 "LLM 에 보내는 필드" 목록 API | FR-5 |
| FR-7 | 도메인 사용 계측 — 주간 활성 · 재개율 · 카드 클릭(금액 0, 사용자 해시) | FR-6 |
| FR-8 | JWKS — identity 가 RS256 발급 · `/.well-known/jwks.json`. 이중 검증 기간(옛 HS + 새 RS) 2주, 끝나면 HS 제거. 초대 코드 시도 제한 · 감사 로그 그대로 | S3 |
| FR-9 | `UserRegistered` 발행 → savings · household · content 초기 상태 | — |

## Acceptance Criteria

- [x] 투자 미선택 사용자 온보딩에 투자 질문 0(E2E) — 2026-11-06 S3a(`ShellPrefsSpec` · 종단 테스트 · 실화면 네 길)
- [ ] 내보내기 zip 에 모든 도메인 기록 존재(임시 사용자 실스택)
- [ ] 이중 검증 기간 옛 · 새 토큰 모두 통과, 종료 후 옛 토큰 401
- [x] 알림 설정 없는 사용자 발송 0 — 2026-11-06 S2c(종단 테스트 · 실스택)

## 계약 영향

- DB `DB-REQ-040` · BFF `BFF-REQ-046` · 프론트 `FE-REQ-055` · RN `RN-REQ-035`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-06 | 서버 S2c(notification, 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md`): to-do → in-progress. FR-5 done — Kotlin notification(설정 기본 꺼짐 · 구독 셋 · 2시간 억제 · 만료 정리) · coach 발행 창구(`coach.outbox`) · Express notification 은퇴 · 옛 표 drop. 수용 기준 4 충족. 나머지 FR 은 identity(S3) |
| 2026-11-06 | 서버 S2c 확인 2회차 — 국내 종목 코드 관문 · `enabled` 타입 · 쓰기 실패 격리(루트 `requirements/reports/checklists/MONEY-S2c-notification.md`) |
| 2026-11-06 | 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`): FR-1 · FR-2 done — identity 서비스가 셸 설정 표 하나로 플랫폼에서 태어남(사용자 · 토큰은 S3b). 옛 3스텝 · 저축 `/goals/exists` 프로브 은퇴. 수용 기준 1 충족. 커밋 `fc0207cb` · `7f2ba1ed`. 남은 FR-3 · 4 · 6 · 7(S3c) · 8 · 9(S3b) |
| 2026-11-11 | `feat/f017-s2-checks-plain-line`: `coach/domain/ports.ts` 에 포트 `BaseRateReader` · `TradeCheckLedger`. 기존 포트 무변경. 주인 REQ 는 `SRV-REQ-053` · BFF `BFF-REQ-052` · FE `FE-REQ-064` |
| 2026-11-11 | **F017 v2 단계 3**(`feat/f017-s3-explain-always`) — coach `ports.ts` — `ExplanationSnapshotStore` · `ExplanationSnapshotRecord` · `ExplainCaller.userId` 가 `null` 가능(배치) · `batch` 표지 · `LlmUsageStore.usageSince` 사용자 `null` |
| 2026-11-11 | F017 v2 단계 4 등급(`feat/f017-s4-grade`) — 이 REQ 머리 주석 파일 `salt-server/src/coach/domain/ports.ts` 에 걸린 몫: 포트 `JudgmentTierReader` 추가. 주인 `SRV-REQ-053` FR-7. 루트 슬라이스 `F017-v2-stage4-tier-slice.md` |
| 2026-11-11 | F017 v2 단계 5 — `coach/domain/ports.ts` 에 `ShortHorizonReader` 포트(머리 주석 주인) |
| 2026-11-12 | F016 단계 D(짝 — 이 REQ 가 머리 주인인 파일): coach `domain/ports.ts`(머리 주인) — 포트 셋(`MoveCardReader` · `MoveSummaryStore` · `MoveSummaryWriter`) · 사용량 `purpose` 에 `move_summary` 추가. 알림 · identity 몫 변경 0 |
