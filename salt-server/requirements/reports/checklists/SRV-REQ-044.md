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
