---
id: DB-REQ-028
feature: F007
area: db
kind: PERF
title: "F007 모바일 앱 — DB 성능 정의 (발송 큐 · 등록 · 정리)"
priority: medium
labels: [db, performance, device, notification]
created: 2026-09-09
---

## Summary

이 기능의 DB 부하는 **평상시 거의 0이고 세금 시즌 하루에 몰린다.** D-30/14/7/3/1이 겹치는 12월에, 자산군 × 사용자 수만큼의 INSERT가 짧은 창에 발생한다. 초대제 10명 규모에서는 사소하지만, **쿼리 형태가 잘못되어 있으면 규모와 무관하게 중복 발송이 난다.**

## 예산

| 쿼리 | 목표 (p95) | 상한 |
|---|---|---|
| 기기 등록 upsert | 5ms | 20ms |
| 버전 게이트 조회 | 2ms | 10ms |
| 발송 큐 pull (100건) | 15ms | 50ms |
| delivery INSERT (dedupe 판정 포함) | 5ms | 20ms |
| delivery 상태 UPDATE | 3ms | 10ms |
| 알림 목록 (20건 커서) | 10ms | 30ms |
| 정리 워커 배치 (1,000행) | 200ms | 1s |
| 발송 대상 기기 조회 (사용자 1명) | 3ms | 10ms |

## Requirements

### A. 인덱스 사용 강제

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 8개 쿼리 전부에 대해 **`EXPLAIN (ANALYZE, BUFFERS)` 결과를 문서에 첨부**한다 | Must |
| FR-2 | 어느 쿼리도 `devices`·`notification_deliveries`에 **Seq Scan을 하지 않는다** | Must |
| FR-3 | 알림 목록은 `nd_user_type_created_idx`로 **Index Scan + Limit**이다. Sort 노드가 없다 | Must |
| FR-4 | 큐 pull은 `nd_status_scheduled_idx`를 탄다 | Must |

### B. 발송 큐

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | pull은 `LIMIT 100 ... FOR UPDATE SKIP LOCKED`다 | Must |
| FR-11 | 워커 인스턴스가 늘어도 **같은 행을 두 번 잡지 않는다**. 부하 테스트로 확인한다 | Must |
| FR-12 | 트랜잭션 안에서 **외부 push provider를 호출하지 않는다.** 잠금 시간이 네트워크에 묶인다 | Must |
| FR-13 | 상태 UPDATE는 pull 트랜잭션과 **분리된 짧은 트랜잭션**이다 | Must |
| FR-14 | 큐 적체(`QUEUED` 건수)를 메트릭으로 노출한다 | Must |

**왜 FR-12인가**: provider 응답이 3초 걸리는데 트랜잭션을 열어두면 100건 배치가 5분간 행을 잠근다. 그동안 다른 워커는 SKIP LOCKED로 아무것도 못 집고, 재시작하면 잠금이 풀리며 **같은 알림이 두 번 나갈 창**이 생긴다.

### C. 세금 시즌 스파이크

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | D-Day 산정 쿼리는 **자산군 × 사용자**를 한 번에 읽는다. 사용자별 N+1이 0건이다 | Must |
| FR-21 | delivery INSERT를 **배치(`createMany` + `skipDuplicates`)** 로 한다 | Must |
| FR-22 | `skipDuplicates`가 dedupe unique와 함께 동작함을 테스트한다 | Must |
| FR-23 | 12월 1일~31일 동안 큐 적체·실패율을 **일 단위로 모니터**한다 | Must |
| FR-24 | 스파이크 시각을 분산한다. D-Day 알림을 **동시 발송하지 않고** 사용자 해시 기반으로 5분 창에 흩는다 | Should |

### D. 정리 워커

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 1,000행 배치마다 커밋한다. 긴 트랜잭션이 0건이다 | Must |
| FR-31 | 정리는 **트래픽이 적은 시간대(KST 04:00)** 에 돈다 | Should |
| FR-32 | 대량 삭제 후 `notification_deliveries`에 대해 통계 갱신을 확인한다 | Should |
| FR-33 | `devices`·`notification_deliveries`의 autovacuum 임계를 **기본값보다 공격적으로** 설정한다 | Should |

### E. 저장 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `pushTokenCipher`는 Bytes다. 토큰 길이 ~200B + 암호화 오버헤드로 행당 1KB 이하다 | Must |
| FR-41 | `NotificationDelivery` 행이 **1KB를 넘지 않는다**. 본문을 저장하지 않기 때문 | Must |
| FR-42 | 연간 delivery 증가량을 추정해 문서화한다 (사용자 × 알림 종류 × 발송 횟수) | Should |

## 부하 시나리오

| 시나리오 | 조건 | 기대 |
|---|---|---|
| 세금 D-30 일괄 | 사용자 10 × 자산군 3 = 30건 | 큐 비움 < 10s, 중복 0건 |
| 세금 D-30 일괄 (확장 가정) | 사용자 10,000 × 3 = 30,000건 | 큐 비움 < 5분, 중복 0건 |
| 워커 3인스턴스 동시 | 같은 큐 | 같은 행 중복 획득 0건 |
| provider 3s 지연 | 전건 | 잠금 시간이 트랜잭션 밖 |
| 기기 재등록 폭주 | 1대가 1분에 60회 | 행 1개 유지, upsert p95 20ms 이내 |
| 정리 100만 행 | 배치 1,000 | 각 배치 1s 이내, 서비스 영향 없음 |

## 측정

| ID | 요구사항 |
|---|---|
| FR-50 | 8개 쿼리의 p50/p95/p99를 대시보드에 노출한다 |
| FR-51 | `QUEUED` 적체 · `FAILED` 비율 · `DEAD` 전이 수를 노출한다 |
| FR-52 | **중복 발송 검사(자산군·연도·D-n당 2건 이상)를 세금 시즌 일 1회** 자동 실행한다 |
| FR-53 | 느린 쿼리(>100ms)를 로그로 남긴다. **단, 파라미터에 토큰이 들어가지 않게 한다** |

## Acceptance Criteria

- [ ] 8개 쿼리의 `EXPLAIN (ANALYZE, BUFFERS)`가 첨부되어 있다
- [ ] **어느 쿼리도 Seq Scan을 하지 않는다**
- [ ] 알림 목록에 Sort 노드가 없다
- [ ] 큐 pull이 `LIMIT 100 ... FOR UPDATE SKIP LOCKED`다
- [ ] **워커 3인스턴스에서 같은 행 중복 획득이 0건이다**
- [ ] **트랜잭션 안에서 push provider를 호출하지 않는다**
- [ ] 상태 UPDATE가 분리된 짧은 트랜잭션이다
- [ ] 큐 적체가 메트릭으로 노출된다
- [ ] **D-Day 산정에 사용자별 N+1이 0건이다**
- [ ] delivery INSERT가 `createMany` + `skipDuplicates` 배치다
- [ ] `skipDuplicates`와 dedupe unique 조합이 테스트되어 있다
- [ ] D-Day 발송이 5분 창으로 분산된다
- [ ] 정리 워커가 1,000행 배치 커밋이고 긴 트랜잭션이 0건이다
- [ ] `devices`·`notification_deliveries`에 autovacuum 튜닝이 적용되어 있다
- [ ] **`NotificationDelivery` 행이 1KB 이하다**
- [ ] 30,000건 스파이크에서 큐 비움 5분 이내, 중복 0건이다
- [ ] 기기 재등록 폭주에서 행 1개가 유지된다
- [ ] **세금 시즌 중복 발송 검사가 일 1회 자동 실행된다**
- [ ] 느린 쿼리 로그에 토큰이 들어가지 않는다

## Dependencies

- **선행:** `DB-REQ-025`(SCHEMA) · `027`(MIGRATION)
- **짝:** `DB-REQ-026`(FUNC)
- **규칙:** `performance-database.md`

## Open Questions

- 5분 분산이 D-1 알림에도 적용되면 마감 당일 늦게 받는 사용자가 생긴다. **D-1은 분산하지 않고 정시 발송**해야 하는지.
- 30,000건 기준은 현재 규모(10명)와 무관한 가정이다. 부하 테스트를 실제로 돌릴지, 쿼리 형태 검증으로 대체할지.
