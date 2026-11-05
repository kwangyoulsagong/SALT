---
id: SRV-REQ-044
area: server
kind: ARCH
title: "도메인 이벤트 — 트랜잭셔널 아웃박스 · RabbitMQ · contracts/events 스키마 · 멱등 구독"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-006-server-msa-kotlin.md
---

## Summary

서비스끼리 서로 부르지 않는다. 한 도메인의 사건이 다른 도메인에 영향을 줄 때는 이벤트, 화면이 여러 도메인을 모을 때는 BFF 병렬 호출이다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 아웃박스 — 발행 서비스가 같은 트랜잭션에 `outbox` 행을 쓰고 릴레이가 RabbitMQ 로. ~~Spring Modulith 이벤트 발행 기록 · 외부화 사용~~ **정정 2026-11-03: 서비스 스키마마다 `outbox` 표 + 직접 릴레이(`OutboxRelay` — 확인(confirm) 뒤 표시 · 브로커 I/O 는 트랜잭션 밖 · 서비스마다 ShedLock).** Modulith 발행 기록은 프로세스에 표 하나라, 서비스 계정 · 트랜잭션이 따로인 구조(`DB-REQ-036` FR-1)에서 업무 쓰기와 한 트랜잭션이 될 수 없다. Modulith 는 경계 검증에만 |
| FR-2 | 구독자 멱등 — `processed_event(event_id)` 로 중복 무시. 재전송해도 결과 같음 |
| FR-3 | 이벤트 스키마 — 루트 `contracts/events/<service>.<Event>.json`(JSON Schema). Kotlin · BFF(TS) · Python 이 같은 파일에서 타입 생성 또는 검증 — **Kotlin 은 발행 시점 검증(2026-11-03, `EventSchemas` — 어긋나면 업무 트랜잭션째 롤백)**. 형식은 `pattern` 으로(검증기가 `format` 을 기본 검사하지 않음). BFF · Python 쪽 읽기는 그 쪽이 첫 구독자가 될 때(`FC-REQ-024` · `025`) |
| FR-4 | **S0 는 `ping.PingRecorded` 하나(경로 점검용).** 13종은 발행하는 서비스가 생기는 단계에 스키마 파일과 같이(본문 필드는 그 서비스 REQ 가 정한다 — 먼저 쓰면 짐작). 첫 이벤트 13종: `identity.UserDeletionRequested` · `household.FixedCostIncreased` · `household.LandingIssued` · `identity.UserRegistered` · `savings.GoalCreated` · `savings.GoalReached` · `savings.ProjectionIssued` · `household.ExpenseRecorded` · `household.MonthClosed` · `portfolio.TransactionRecorded` · `market.DailyCandleClosed` · `coach.JudgmentPublished` · `content.PolicyParamChanged` |
| FR-5 | 이벤트 본문에 금액이 들어갈 때는 서비스 간에만(브로커 내부). 로그 · 추적 속성에는 금액 0 |
| FR-6 | 프로젝션 — 다른 도메인 데이터를 자주 읽으면 이벤트로 자기 스키마에 읽기 전용 사본(예: coach 의 보유 프로젝션). 재구성 명령 하나 |
| FR-7 | 즉시 답이 필요한 조회만 내부 REST(서비스 토큰) + 타임아웃 · 서킷. 실패 시 `degraded` |
| FR-8 | 데드레터 큐 + 재시도 3회(**S0 구현 — 리스너 재시도 3 · `default-requeue-rejected: false` · 구독마다 `<queue>.dlq`**). 데드레터 쌓이면 운영 점검(`forecast.ops_check` 와 같은 방식)에 남김 — ~~이 줄은 첫 실제 구독(S1)과 같이~~ **2026-11-03 지표로**: `salt.events.dead_letters{queue}` · `salt.outbox.dead{service}`(릴레이가 10회 뒤 포기한 이벤트) — `/actuator/metrics`. 경보 · 수집처는 `OPS-001` |
| FR-9 | Kafka 전환 조건을 적어 둔다 — 이벤트 재생이 필요할 때(프로젝션 전체 재구성이 DB 재조회로 안 될 때) |

## Acceptance Criteria

- [x] 트랜잭션 롤백 시 이벤트 0(테스트 — 실 Postgres, 2026-11-03). 트랜잭션 밖 쓰기는 거부
- [x] 같은 이벤트 2회 전달 시 구독 결과 1회분(`processed_event` `ON CONFLICT DO NOTHING` 영향 행 수 — 오류 코드를 잡지 않는다)
- [x] `contracts/events` 스키마와 다른 본문 발행 시 테스트 실패(발행 자체가 거부 · 아웃박스 0)

## 계약 영향

- BFF · Python 이 같은 스키마를 읽는다 — `FC-REQ-024`(`ProjectionIssued`) · `FC-REQ-025`(`DailyCandleClosed`)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | **S0 구현**(`feat/srv-req-043-s0-platform`) — to-do → in-progress. `support/messaging`: `OutboxWriter` · `OutboxRelay` · `EventSchemas` · `EventTopology`(교환기 `salt.events` topic · 데드레터 `salt.events.dlx` · 큐 `<subscriber>.<eventType>`) · `ProcessedEvents` · `TraceParent`(아웃박스 행에 traceparent 를 저장해 릴레이가 그 추적 아래 발행 — 요청 → 구독 한 추적 ID). FR-1 정정(위). 수용 기준 3 + 재시도 3회 → 데드레터 실측. Kafka 대신 RabbitMQ 유지 확인(사용자 질문 2026-11-03 — FR-9 조건 그대로) |
| 2026-11-03 | **코드 리뷰 뒤** `405e5683` — 릴레이: 영원히 실패하는 이벤트 하나가 그 서비스 뒤 이벤트를 전부 막던 것 → 10회 뒤 `dead_at` 으로 건너뜀 · 순서 `seq`(같은 트랜잭션의 같은 시각 둘). 쓰기: 다른 서비스 트랜잭션 아래 쓰기 거부. FR-8 지표 둘 |
| 2026-11-03 | 커밋 대조 — `fafb6a0d`(아웃박스 · 릴레이 · 스키마 · 멱등) · `405e5683`(포기 · 순서 · 트랜잭션 확인 · 지표) · `b308718e`(문서). S0 수용 기준 3/3, FR-4 · 6 · 7 · 경보는 다음 단계라 in-progress |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`e83f7f80`): FR-4 첫 이벤트 13종 중 3 — `savings.GoalCreated` · `GoalReached` · `ProjectionIssued` 계약 + 발행(쓰기 시점 검증). 로컬 운영 실측 릴레이가 브로커로 보냄(published_at) |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — 이벤트 2종 계약 `household.ExpenseRecorded` · `household.LandingIssued`(`contracts/events`) · 쓰기 시점 스키마 검증 · 종단 테스트가 아웃박스 행으로 발행 확인(`63146ddf`). FR-4 13종 중 가계부 몫 2(`MonthClosed` · `FixedCostIncreased` 는 S1b) |
| 2026-11-04 | 가계부 S1b — 이벤트 `household.MonthClosed`(새 계약 · 답 글 0) · `household.LandingIssued` 에 `scheduled` 필수 필드(`a32d349e`). 발행 시점 스키마 검증 그대로 |
| 2026-11-04 | 가계부 S1e — FR-4 첫 이벤트 13종 중 `household.FixedCostIncreased`(새 계약 · 가맹점 0 · 가맹점 · 달마다 한 번)(`98895870`). 발행 시점 스키마 검증 그대로 |
| 2026-11-05 | 가계부 S1f — `household.ExpenseRecorded` 계약 `category` 에 사용자 분류 꼴(`^u_[0-9a-f]{12}$`) 추가(`96c7c5b4`). 이름은 싣지 않는다 · 구독자 0 이라 깨지는 소비처 없음 · 발행 시점 스키마 검증 그대로 |
| 2026-11-05 | 금융 팁 S2a(`MONEY-S2a-tips-content`, 루트 `requirements/specs/done/MONEY-S2a-tips-content-slice.md`) — 이 REQ 에 걸린 몫: 새 계약 `content.PolicyParamChanged`(원문 동기화 때 줄마다) · **첫 서비스 간 구독** — content 가 `savings.GoalCreated` · `GoalReached` 를 받는다(큐 `content.<event>` · 데드레터 · `processed_event` 멱등). 종단 테스트가 저축 쓰기 → 릴레이 → 구독 → 신호를 실 RabbitMQ 로 확인 |
