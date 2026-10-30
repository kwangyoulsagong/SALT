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
| FR-1 | 아웃박스 — 발행 서비스가 같은 트랜잭션에 `outbox` 행을 쓰고 릴레이가 RabbitMQ 로. Spring Modulith 이벤트 발행 기록 · 외부화 사용 |
| FR-2 | 구독자 멱등 — `processed_event(event_id)` 로 중복 무시. 재전송해도 결과 같음 |
| FR-3 | 이벤트 스키마 — 루트 `contracts/events/<service>.<Event>.json`(JSON Schema). Kotlin · BFF(TS) · Python 이 같은 파일에서 타입 생성 또는 검증 |
| FR-4 | 첫 이벤트 13종: `identity.UserDeletionRequested` · `household.FixedCostIncreased` · `household.LandingIssued` · `identity.UserRegistered` · `savings.GoalCreated` · `savings.GoalReached` · `savings.ProjectionIssued` · `household.ExpenseRecorded` · `household.MonthClosed` · `portfolio.TransactionRecorded` · `market.DailyCandleClosed` · `coach.JudgmentPublished` · `content.PolicyParamChanged` |
| FR-5 | 이벤트 본문에 금액이 들어갈 때는 서비스 간에만(브로커 내부). 로그 · 추적 속성에는 금액 0 |
| FR-6 | 프로젝션 — 다른 도메인 데이터를 자주 읽으면 이벤트로 자기 스키마에 읽기 전용 사본(예: coach 의 보유 프로젝션). 재구성 명령 하나 |
| FR-7 | 즉시 답이 필요한 조회만 내부 REST(서비스 토큰) + 타임아웃 · 서킷. 실패 시 `degraded` |
| FR-8 | 데드레터 큐 + 재시도 3회. 데드레터 쌓이면 운영 점검(`forecast.ops_check` 와 같은 방식)에 남김 |
| FR-9 | Kafka 전환 조건을 적어 둔다 — 이벤트 재생이 필요할 때(프로젝션 전체 재구성이 DB 재조회로 안 될 때) |

## Acceptance Criteria

- [ ] 트랜잭션 롤백 시 이벤트 0(테스트)
- [ ] 같은 이벤트 2회 전달 시 구독 결과 1회분
- [ ] `contracts/events` 스키마와 다른 본문 발행 시 테스트 실패

## 계약 영향

- BFF · Python 이 같은 스키마를 읽는다 — `FC-REQ-024`(`ProjectionIssued`) · `FC-REQ-025`(`DailyCandleClosed`)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
