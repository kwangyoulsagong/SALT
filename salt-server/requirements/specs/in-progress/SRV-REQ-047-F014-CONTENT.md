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

- [x] 메타 빠진 글 발행 실패 · 금지 문장 삽입 변이 테스트 실패 — `ContentSpec`(여덟 칸 각각 · 변이 12) · 레포 원문 `CatalogSpec`
- [x] 유효기한 경계(당일 · 다음 날) 테스트 — `ContentSpec` 12-30 · 12-31 유효 · 01-01 확인 필요, 때맞춘 팁도 다음 날 0
- [x] 법무 검토 기록 전 공개 플래그 꺼짐 — 기본값 false(`ContentSettingsSpec`) · 꺼짐 동작(목록 0 · 글 404 · 팁 null) · 로컬 운영 launchd 기본 꺼짐

## 계약 영향

- DB `DB-REQ-039` · BFF `BFF-REQ-049` · 프론트 `FE-REQ-058` · savings · household(파라미터 구독)

## 구현 현황 — 금융 팁 S2a(2026-11-05, 루트 `requirements/specs/done/MONEY-S2a-tips-content-slice.md`)

Kotlin `services/content`(네 층) · 조립 `app/.../content/ContentComposition.kt` · 원문 `infrastructure/src/main/resources/content/`(글 5 · 파라미터 6줄).

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 발행 검사 | **done** — 메타 여덟 칸(제목 · 요약 · 출처 URL · 출처 이름 · 작성일 · 검수일 · 기준 연도 · 유효기한) · 날짜 순서 · 공식 출처(https `.go.kr` + 공공기관 몇 곳) · 본문 문단 · 트리거 · 맥락. **빌드(`CatalogSpec`)와 기동(`SyncCatalog`) 둘 다** — 하나라도 틀리면 기동 실패 | `PublishCheck` · `SyncCatalog` |
| FR-2 유효기한 점검 | **done** — 워커 매시 15분(KST · 멱등 · ShedLock) · 당일 유효 다음 날 확인 필요 · 변경 이력 · 응답 `noindex` · 때맞춘 팁 제외. 화면 상태는 늘 지금 날짜로 다시 계산 | `RunValidityCheck` · `ContentWorker` |
| FR-3 제도 파라미터 | **done** — 조회 `GET /api/content/policy-params/{key}?on=`(인증 없음) · 원문 동기화 때 줄마다 `content.PolicyParamChanged`(새 계약). 구독자는 법무 확인 뒤(저축 FR-12 · 가계부 FR-11) | `GetPolicyParam` · `OutboxContentEvents` |
| FR-4 때맞춘 팁 | **done(부분)** — 구독 `savings.GoalCreated`(결혼 · 주거) · `savings.GoalReached` → 사용자 신호. 달 트리거 5 · 11 · 12월. `GET /api/content/me/tip?context=` 0~1건(이벤트 먼저 · 최근 신호 · 원문 순서) · 닫기 `POST /api/content/me/tips/{slug}/dismiss`. **`FixedCostIncreased` 구독 · 월초 · 물가 · 만 34세 등은 붙일 공적 제도 글이 생길 때** — **정정 2026-11-05(S2d)** `FixedCostIncreased`(주거) 구독 done, 아래 S2d 표 | `TimelyTipPicker` · `SavingsEventsListener` |
| FR-5 법적 선 검사기 | **done** — 상품명(업권 꼬리 · 이름 + 은행/카드) · 금리 비교 · 가입 링크(본문 URL 0) · 명령형 · 완곡 권유 · 종목(6자리) · 매매 시점 · 확신. 변이 표 12 + 오탐 경계 9. **코치 검증기와 한 모듈은 S6**(언어가 다르다 — `SRV-REQ-049` FR-4) | `LegalLine` |
| FR-6 내 숫자로 다시 읽기 | 범위 밖 — ~~S2b~~ **S2d**(저축 · 가계부 값을 읽어 서비스를 넘는다 — 2026-11-05 S2b 에서 나눔) | S2d **정정 2026-11-05(S2d)** 내 숫자 · 고정비 증가(주거) 닫힘(`MONEY-S2d-tips-my-numbers`) — 나머지 트리거는 원천 · 글이 생길 때 |
| FR-7 변경 diff | **done** — 글 응답에 이력(최근 먼저) + ~~줄 단위 diff 뷰는 S2b~~ **줄 diff(S2b, 아래 표)** | `GetTip` · `LineDiff` |
| FR-8 퀴즈 | ~~범위 밖~~ **done(S2b, 아래 표)** | `TipQuiz` · `AnswerQuiz` |
| FR-9 홈 요약 카드 | 범위 밖 — 홈 카드 묶음(`BFF-REQ-046`) | ~~S2b 또는~~ S3 |
| 공개 플래그 | **done** — `CONTENT_PUBLIC`(기본 꺼짐). 꺼지면 목록 0 · 글 404 · 때맞춘 팁 0, 파라미터는 그대로 | `ContentSettings` |

## 구현 현황 — 금융 팁 S2b(2026-11-05, 루트 `requirements/specs/done/MONEY-S2b-tips-quiz-diff-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-7 줄 diff | **done** — 변경 이력마다 그 판의 줄(`tip_revision.body_lines` — 제목 · 요약 · 기준 연도 · 유효기한 · 본문 문장). 앞 판과 LCS 로 바뀐 줄만(`removed` · `added`). 첫 판 · S2b 전 이력은 `changes: null`(모른다 ≠ 안 바뀜), 상태만 바뀐 판은 `[]`. 출처 · 날짜 메타 · 퀴즈는 줄에 넣지 않는다(검수일만 바뀐 판이 줄을 내지 않게) | `LineDiff` · `Tip.revisionLines` · `GetTip` |
| FR-8 퀴즈 | **done** — 원문 머리 블록 네 칸(다 있거나 다 없거나 · 보기 2~4 · 정답 1부터 · 길이 상한 · 법적 선 검사까지). 공개 글 응답엔 질문 · 보기만(정답 0). 채점: `POST /api/content/tips/{slug}/quiz`(공개 · 기록 0) · `POST /api/content/me/quiz/{slug}`(기록 — 처음 맞힌 때 한 번 `collected`) · 모음 `GET /api/content/me/quiz-cards`(최근 먼저 · 원문에서 빠진 글 숨김 · `available` 분모). 원문 글 다섯 전부에 퀴즈(본문에 이미 있는 사실로만) | `TipQuiz` · `PublishCheck` · `GradeQuiz` · `AnswerQuiz` · `ListQuizCards` · `JooqQuizAnswers` |
| 첫 판 이력 | **정정** — 처음 기록하는 글은 늘 "첫 판"(S2a 는 `change:` 가 있으면 그 문장 — 앞 판이 없는 새 DB 에서 거짓) | `SyncCatalog` |
| 예약 slug | **신설** — `cards` 는 글 slug 로 못 쓴다(팁 zone `/tips/cards` 가 가린다) | `PublishCheck.RESERVED_SLUGS` |
| FR-4 나머지 트리거 · FR-6 · FR-9 | 범위 밖 — 붙일 공적 제도 글(트리거) · 서비스 간 값(FR-6) · 홈 카드 묶음(FR-9) | S2d · S3 — **정정 2026-11-05(S2d)** FR-6 done · FR-4 고정비 증가(주거) done, 아래 표 |

## 구현 현황 — 금융 팁 S2d(2026-11-05, 루트 `requirements/specs/done/MONEY-S2d-tips-my-numbers-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-6 내 숫자로 다시 읽기 | **done** — 원문 머리 `my_numbers:`(주택청약 · 결혼 · 예금보호 · 월세 넷, 모르는 값이면 발행 실패). `POST /api/content/me/tips/{slug}/my-numbers` 에 **BFF 가 사실을 넘긴다**(저축 목표 · 가계부 급여 — 서비스끼리 부르지 않는다, `msa-services.md` §5). 숫자는 오늘(KST) 유효한 제도 파라미터만 · 상수 0. 요건 `met` · `not_met` · `unknown` — 원천을 못 읽었거나(`goals: null` · `wage: unread`) 앱이 모르는 요건(무주택 · 세대주 · 금융회사 · 주택 규모 · 받은 적)은 늘 `unknown`. 경계는 "그 값까지 포함". 사실은 저장 · 로그 0 · 공개 전 404 · 글 응답 `myNumbers` | `MyNumbers` · `ReadMyNumbers` · `ContentController` |
| FR-4 고정비 증가 | **done(주거)** — `household.FixedCostIncreased` 구독, `category = housing` 만 신호 `fixed_cost_increased:housing`(금액 · 가맹점 읽지 않음, 나머지 분류는 처리 기록만) → 새 글 월세 세액공제(조세특례제한법 제95조의2) · 제도 파라미터 다섯 줄 | `HouseholdEventsListener` · `TriggerKind.forFixedCostCategory` · `monthly-rent-credit.md` |
| FR-4 나머지(신규 정기결제 · 월초 · 기한 없는 목표 · 물가 · 만 34세) | 범위 밖 — 원천 이벤트가 없거나(정기결제 · 물가 · 생년) 붙일 공적 제도 글이 없다 | 원천 · 글이 생길 때 |
| FR-9 홈 요약 카드 | 범위 밖 | S3 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-05 | 금융 팁 S2a — to-do → in-progress. FR-1 · 2 · 3 · 5 done, FR-4 부분(저축 두 이벤트 + 달 셋), FR-7 첫 판(이력), FR-6 · 8 · 9 S2b. 커밋 `38e2d16d` · `dd7f536a`(회사 이름 목록 → 업권 꼬리) |
| 2026-11-05 | 금융 팁 S2b — FR-7 줄 diff done · FR-8 퀴즈 done · 첫 판 이력 정정 · 예약 slug. FR-6 · 4 나머지는 S2d 로, FR-9 는 S3. 커밋 `d2d662d4` |
| 2026-11-05 | 금융 팁 S2d — FR-6 내 숫자 done(BFF 가 사실을 넘기고 content 가 계산) · FR-4 고정비 증가 구독(주거) + 월세 세액공제 글 · 파라미터 다섯 줄. 나머지 트리거는 원천 · 글이 생길 때, FR-9 S3. 커밋 `1a85dd2b` |
| 2026-11-05 | 금융 팁 S2d 확인 2회차 — 내 숫자 경로의 없는 날짜 500 → 400 `INVALID_GOAL_FACT`(종단 테스트) |
| 2026-11-12 | 서버 S3c 내 데이터(짝 — 루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md`): 금융 팁 조립에 `PersonalData` 빈 · `ContentUserRows`(퀴즈 답 · 닫은 팁 · 신호 / 글 · 정책 값은 개인 데이터 아님). 이 REQ 몫 기능 변경 0 |
