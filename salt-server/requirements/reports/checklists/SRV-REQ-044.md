# SRV-REQ-044 — 이벤트 · 아웃박스 S0 검증 · 2026-11-03

커밋 `fafb6a0d` · `405e5683`. 테스트는 `salt-platform/app/src/test/kotlin/com/salt/PlatformEndToEndTest.kt`(실 Postgres · RabbitMQ).

| 수용 기준 · FR | 결과 |
|---|---|
| 트랜잭션 롤백 시 이벤트 0 | 통과 — 아웃박스 수 그대로 |
| 트랜잭션 밖 · **다른 서비스 트랜잭션** 아래 쓰기 | 둘 다 거부(리뷰 뒤 — 풀 단위 확인) |
| 2회 전달 → 1회분 | 통과 — 되울림 1 · `processed_event` 1(`ON CONFLICT DO NOTHING` 영향 행 수) |
| 계약과 다른 본문 | 발행 거부(`EventSchemaViolation`) · 아웃박스 0 |
| 재시도 3회 → 데드레터 | 없는 checkId(FK 실패) 메시지 → `ping.ping.PingRecorded.dlq` +1 · 지표 `salt.events.dead_letters` 같은 수 |
| 릴레이 포기 · 순서 | 독 이벤트 3회 실패 → `dead_at` · 뒤 이벤트 발행 · 지표 `salt.outbox.dead` 1 · 같은 시각 둘이 `seq` 순서 |
| 추적 | 아웃박스 행 traceparent → 릴레이가 그 부모로 발행 → 구독 쪽 같은 trace ID(테스트 · Compose · BFF · Jaeger) |
| FR-5 금액 0 | 로그 · span 속성에 본문 없음(이벤트 이름 · ID 만) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-4 이벤트 13종 스키마 | 발행 서비스가 없다 — 본문은 그 서비스 REQ 가 정한다 | S1~S6 단계마다 |
| FR-3 BFF · Python 쪽 검증 | 첫 구독자가 아직 없다 | `FC-REQ-024` · `025` |
| FR-6 프로젝션 · FR-7 내부 REST | 서비스가 하나뿐 | S4~S6 |
| 데드레터 경보 | 수집처가 없다(지표는 있음) | `OPS-001` |

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`e83f7f80`): FR-4 첫 이벤트 13종 중 3 — `savings.GoalCreated` · `GoalReached` · `ProjectionIssued` 계약 + 발행(쓰기 시점 검증). 로컬 운영 실측 릴레이가 브로커로 보냄(published_at)
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] 지출 2건 → `ExpenseRecorded` 2 · `LandingIssued` 1(그날 처음만)
- [x] 계약 README 표에 두 행

## 2026-11-04 — 가계부 S1b 이벤트

- [x] `household.MonthClosed` 계약 · 발행(종단 테스트 — 처음 닫을 때 한 번, 답 글 0) · `LandingIssued.scheduled` 스키마 검증 통과

## 2026-11-04 — 가계부 S1e 이벤트

- [x] `household.FixedCostIncreased` 계약 · 발행(종단 테스트 — 오른 회차에 한 번 · 지우고 다시 적어도 1 · 본문 가맹점 0) · 로컬 실스택 아웃박스 발행(`published_at`) 확인

## 2026-11-05 — 가계부 S1f 이벤트

- [x] `household.ExpenseRecorded` — 내 분류로 적은 지출이 발행 시점 스키마 검증을 지난다(종단 — 아웃박스 `category` = 키 · 본문에 이름 0)
