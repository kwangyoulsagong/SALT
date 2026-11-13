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
| FR-3 | 내 데이터 내보내기 — 각 서비스 `export` 내부 API 를 모아 CSV · JSON(zip). 본인만 · ~~24시간 만료~~ **정정 2026-11-12(S3c)** 저장 0 — 요청한 응답으로 바로 내려 보낸다(만료할 사본이 생기지 않는다). ✅ **done 2026-11-12(S3c)** — 서비스마다 `GET /api/<service>/me/data`(플랫폼 `MyDataController` · identity `MyAccountController` · Express `/api/investment/me/data`), 값은 전부 글자 · 시각 UTC · 비밀번호 해시 · 아웃박스 · 운영 로그 제외. 모아 zip 은 BFF(`BFF-REQ-046` FR-7) | FR-3 |
| FR-4 | 계정 삭제 — 재인증 뒤 ~~`UserDeletionRequested` →~~ 각 서비스 삭제 · 결과 행 수 보고. 판정 원장(불변)은 사용자 식별자 가명화 처리 방식을 ADR-003 범위 안에서 정한다(Open Question). ✅ **done 2026-11-12(S3c)** — **정정** 이벤트가 아니라 BFF 가 순서를 정한다(`msa-services.md` §5 · 행 수를 그 자리에서 모아 기록에 남기려면 응답이 필요하다): identity 가 비밀번호를 다시 확인해 5분 허가(`aud` salt-erase) → 서비스마다 `DELETE /api/<service>/me/data`(접근 + 허가가 같은 사람일 때만) → 계정 마지막 + `account_deletion_log`(사람 칸 0) 한 트랜잭션. 지운 계정의 갱신은 401. **Open Question 닫음** — 판정 원장(`judgment_ledger`)에는 사람 칸이 없어 가명화 대상 0. 사람의 발행 원장 둘(`projection_issued` · `landing_issued`)은 지운다(`salt.erase` 켠 DELETE 만 · UPDATE 는 그때도 막음). LLM 호출 기록은 사람 칸만 비움(전체 상한) | FR-3 |
| FR-5 | 알림 — 도메인별 설정 기본 꺼짐. notification 은 이벤트(~~`GoalReached` · `MonthClosed` · `JudgmentPublished`~~ **정정 2026-11-06(S2c)** `savings.GoalReached` · `household.FixedCostIncreased` · `coach.DecisionChanged` — MonthClosed 는 사용자가 한 일이라 빼고 · 코치는 판단 변화)를 구독만, 설정 꺼진 도메인 0건. ✅ **done 2026-11-06**(Kotlin `services/notification` · 설정 주인 notification · Express 은퇴) | FR-4 |
| FR-6 | 민감 정보 분류 공개 — ~~`data_classification` 을 읽어~~ "LLM 에 보내는 필드" 목록 API. **S3d 로**(2026-11-12 — S3c 는 내보내기 · 삭제만). ✅ **done 2026-11-13(S3d)** — **정정** 분류 표를 따로 두지 않고 원천은 표 주석 `"<record\|financial\|sensitive>: <설명>"` 하나(`DB-REQ-040` FR-6). 서비스마다 `GET /api/<service>/me/data-classification`(플랫폼 `MyDataController` · identity `MyAccountController` · Express `/api/investment/me/data-classification`). AI 입력은 Express 만(`coach/domain/policy/llmInputs.ts` — 프롬프트가 읽는 칸과 시험으로 묶음 · `ExplainCaller.userId: null` 타입) — LLM 을 부르는 곳이 투자 코치 배치 둘뿐 | FR-5 |
| FR-7 | 도메인 사용 계측 — 주간 활성 · 재개율 · 카드 클릭(금액 0, 사용자 해시). **S3d 로**(2026-11-12). ✅ **done 2026-11-13(S3d)** — identity `POST /api/identity/me/usage {domain, kind}`(도메인 = 셸 카드 넷 · 종류 visit · card_click, 모르면 400) · `usage_day` 하루 · 도메인 · 종류당 한 행 횟수(`DB-REQ-040` FR-7) · 사람 칸 = `sha256(user_id)` SQL 한 식 · 계정 삭제 · 내보내기 목록에. 집계는 HTTP 로 열지 않고 `ops/salt.sh usage`(`OPS-002` FR-8) | FR-6 |
| FR-8 | JWKS — identity 가 RS256 발급 · `/.well-known/jwks.json`. 이중 검증 기간(옛 HS + 새 RS) 2주, 끝나면 HS 제거. 초대 코드 시도 제한 · 감사 로그 그대로. ✅ **구현 2026-11-12(S3b)** — Kotlin 계정 · 토큰 · JWKS(접근 · 갱신 · 게스트 = 같은 키 · 다른 `aud`) · 판정 `DualTokenVerifier`(플랫폼) = `TokenVerifier`(Express 리소스 서버) · 옛 HS 끝 2026-11-26T15:00Z(설정 하나) · 시도 제한 셋 · 감사 앞 4자 그대로 · Express `auth` · `modules/user` 삭제. **남은 것: HS 코드 · 비밀 삭제 2026-11-27** | S3 |
| FR-9 | `UserRegistered` 발행 → savings · household · content 초기 상태. ✅ **발행 2026-11-12(S3b)** — 점유 · 생성과 같은 트랜잭션(계약 `contracts/events/identity.UserRegistered.json`, 개인 정보 0). **정정** 구독자 0 — 세 서비스는 첫 요청에 상태를 만들어 초기 상태가 필요 없다 | — |

## Acceptance Criteria

- [x] 투자 미선택 사용자 온보딩에 투자 질문 0(E2E) — 2026-11-06 S3a(`ShellPrefsSpec` · 종단 테스트 · 실화면 네 길)
- [x] 내보내기 zip 에 모든 도메인 기록 존재(임시 사용자 실스택) — 2026-11-12 S3c(BFF 경유 zip 52 표 · 8 서비스 · 남의 id 0 · 비밀번호 0)
- [x] 계정 삭제 뒤 그 사람 행 0 · 남의 행 그대로 · 갱신 401 — 2026-11-12 S3c(모든 `user_id` 칸 훑기 0 · 종단 테스트 · 변이 8/8)
- [x] 이중 검증 기간 옛 · 새 토큰 모두 통과, 종료 후 옛 토큰 401 — 2026-11-12 S3b(경계 표 두 벌 · 실스택 옛 HS 통과). 실제 종료 실측은 2026-11-27
- [x] 알림 설정 없는 사용자 발송 0 — 2026-11-06 S2c(종단 테스트 · 실스택)
- [x] 내보내는 사람 표마다 등급 · 설명(빠지면 시험이 깸) · AI 입력 공개 = 프롬프트가 읽는 칸 — 2026-11-13 S3d(종단 8/8 · `llmInputs.test.ts` · 변이 9/9)
- [x] 계측 행에 금액 · 시각 · 사람 id 0 · 계정 삭제 때 함께 지워짐 — 2026-11-13 S3d(실스택 임시 사용자 — 지운 뒤 0)

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
| 2026-11-12 | **서버 S3b**(`MONEY-S3b-identity-accounts`, 루트 `requirements/specs/in-progress/MONEY-S3b-identity-accounts-slice.md`) — FR-8 · 9 구현 · 로컬 운영 적용(Flyway V2 · 가져오기 대조 5 · 6 · 6 · BFF 라우팅 둘). 수용 기준 3 충족. 남은 것: Prisma 마이그레이션 적용(승인 대기) · HS 삭제(11-27) · FR-3 · 4 · 6 · 7(S3c) |
| 2026-11-12 | 서버 S3b 마이그레이션 적용(사용자 승인) · 새 가입자 Express 쓰기 확인. FR-8 남은 것: HS 삭제(2026-11-27) |
| 2026-11-12 | 서버 S3b 확인 2회차(루트 체크리스트) — 새 결함 0 |
| 2026-11-12 | **서버 S3c**(루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md`) — FR-3 · 4 done(정정 둘: 저장 0 · 이벤트 대신 BFF 순서 + 지우기 허가), Open Question 닫음(판정 원장 사람 칸 0). FR-6 · 7 은 S3d. 수용 기준 2 충족 · 새 기준 하나 |
| 2026-11-13 | **서버 S3d**(루트 `requirements/specs/done/MONEY-S3d-identity-classify-usage-slice.md`) — FR-6 · 7 done(정정: 분류 표 대신 표 주석). 수용 기준 둘 |
| 2026-11-13 | F017 v4 순서 1b 짝(`feat/f017-v4-s1-scenario-always` — 이 REQ 가 머리 주인인 파일): `composition.ts` 등락 의존(`move`)에 원인 근거 리더(`PrismaMoveEvidenceReader`) 조립 한 줄. 주인 REQ `SRV-REQ-053` FR-11 · 17 · `BFF-REQ-052` FR-6(앞당김) · `FE-REQ-063` FR-9 |
