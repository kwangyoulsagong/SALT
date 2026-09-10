---
id: DB-REQ-026
feature: F007
area: db
kind: FUNC
title: "F007 모바일 앱 — DB 기능 정의 (등록 · 중복 차단 · 정리)"
priority: high
labels: [db, func, device, notification, idempotency]
created: 2026-09-09
---

## Summary

이 기능의 데이터 요구는 하나로 줄어든다: **D-30 알림이 정확히 한 번 나가고, 그 기록이 남는다.** 나머지는 그것을 지탱하는 보조 장치다.

## 데이터 동작

### A. 기기 등록 (upsert)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 등록은 `pushTokenHash` 기준 **upsert**다. 앱 재실행마다 새 행이 생기지 않는다 | Must |
| FR-2 | 기존 행의 `userId`가 다르면 **기존 행 `REVOKED` → 새 행 INSERT**를 한 트랜잭션으로 한다 | Must |
| FR-3 | 등록 시 `appVersion`·`runtimeVersion`·`lastSeenAt`을 갱신한다 | Must |
| FR-4 | 재등록 시 `failureCount`를 0으로, `status`를 `ACTIVE`로 되돌린다 | Must |
| FR-5 | 사용자당 활성 기기 수를 **10개로 제한**한다. 초과 시 가장 오래된 것을 `REVOKED` | Should |

### B. 발송 기록과 중복 차단

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 발송은 **"INSERT 먼저, 전송 나중"** 이다. `NotificationDelivery`를 `QUEUED`로 INSERT하고 성공하면 전송한다 | Must |
| FR-11 | `(userId, dedupeKey)` 충돌은 **"이미 보냈다"** 로 해석하고 조용히 종료한다 | Must |
| FR-12 | 전송 성공 시 `SENT` + `sentAt` + `providerMessageId`로 UPDATE | Must |
| FR-13 | 전송 실패 시 `FAILED` + `failureCode`. **행을 삭제하지 않는다** | Must |
| FR-14 | 재시도는 같은 행의 `attemptCount`를 올린다. 새 행을 만들지 않는다 | Must |
| FR-15 | 사용자가 알림을 껐으면 `SKIPPED`로 기록한다. **기록조차 남기지 않으면 껐는지 실패했는지 구분이 안 된다** | Must |

**왜 INSERT 먼저인가**: 전송 후 기록하면 전송 성공·기록 실패에서 D-30이 두 번 나간다. 기록 먼저면 최악이 "기록은 있는데 안 감"이고, 이건 `FAILED` 조회로 복구 가능하다. **중복 발송보다 미발송이 복구 가능하다.**

### C. D-1 예외

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `NotificationPreference.enabled = false`여도 **`dedupeKey`가 `...:D1`이면 발송**한다 | Must |
| FR-21 | 이 예외는 **`TAX_DEADLINE`에만** 적용된다. `SIGNAL_UPDATE`는 예외 없음 | Must |
| FR-22 | 예외 발송은 `NotificationDelivery`에 그대로 `SENT`로 기록된다 | Must |
| FR-23 | 예외 규칙을 DB 제약이 아니라 **애플리케이션 정책**으로 둔다. 단, 쿼리에 명시적으로 표현한다 | Must |

### D. 정리 워커

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 연속 실패 `failureCount >= 5`면 `DEAD`로 전이한다 | Must |
| FR-31 | provider가 `DeviceNotRegistered`류 코드를 주면 **즉시 `DEAD`** 다. 5회를 기다리지 않는다 | Must |
| FR-32 | 정리 워커는 **배치 1,000행 단위**로 돌고 각 배치를 커밋한다 | Must |
| FR-33 | `DEAD`/`REVOKED` 180일 초과분을 하드 삭제한다 | Should |
| FR-34 | 삭제는 **`NotificationDelivery`를 남긴다**(`deviceId` SetNull) | Must |

### E. 알림 목록 조회

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 목록은 `(userId, type, createdAt DESC)` 인덱스로 커서 페이지네이션한다 | Must |
| FR-41 | `QUEUED`는 목록에 노출하지 않는다 | Must |
| FR-42 | 목록 응답은 **본문을 DB에서 읽지 않고** `type`+`payloadRef`로 조립한다 | Must |

### F. 트랜잭션과 잠금

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 발송 큐 pull은 `FOR UPDATE SKIP LOCKED`로 한다. 워커 다중 인스턴스에서 같은 행을 잡지 않는다 | Must |
| FR-51 | 기기 등록 upsert는 단일 트랜잭션이다 | Must |
| FR-52 | D-Day 산정과 INSERT를 **한 트랜잭션에 묶지 않는다.** 산정은 읽기, INSERT는 짧은 쓰기 | Should |

## 무결성 검증

| 검사 | 주기 | 기대 |
|---|---|---|
| 같은 `(userId, dedupeKey)`가 2행 | 상시(제약) | 불가능 |
| 같은 `pushTokenHash`가 `ACTIVE` 2행 | 일 1회 | 0건 |
| `SENT`인데 `sentAt`이 null | 일 1회 | 0건 |
| `NotificationDelivery`에 금액 문자열 | 배포 시 | 0건 |
| D-30 발송이 자산군·연도당 2건 이상 | 세금 시즌 일 1회 | 0건 |
| `ACTIVE`인데 `lastSeenAt` 90일 초과 | 주 1회 | 알림 |

## Acceptance Criteria

- [ ] 기기 등록이 `pushTokenHash` 기준 upsert다
- [ ] **계정이 바뀐 토큰에서 기존 행이 `REVOKED`되고 새 행이 생긴다**
- [ ] 재등록 시 `failureCount`가 0이 되고 `ACTIVE`로 복귀한다
- [ ] 활성 기기 10개 제한이 동작한다
- [ ] **발송이 "INSERT 먼저, 전송 나중" 순서다**
- [ ] **`(userId, dedupeKey)` 충돌이 조용히 종료된다**
- [ ] 실패 시 행이 삭제되지 않고 `FAILED`로 남는다
- [ ] 재시도가 같은 행의 `attemptCount`를 올린다
- [ ] **알림을 끈 경우 `SKIPPED`로 기록된다**
- [ ] **알림을 꺼도 세금 D-1은 발송되고 `SENT`로 기록된다**
- [ ] D-1 예외가 `SIGNAL_UPDATE`에는 적용되지 않는다
- [ ] `failureCount >= 5`에서 `DEAD` 전이가 일어난다
- [ ] `DeviceNotRegistered`에서 즉시 `DEAD`가 된다
- [ ] 정리 워커가 1,000행 배치로 커밋한다
- [ ] 기기 하드 삭제 후에도 발송 기록이 남는다
- [ ] 알림 목록이 커서 페이지네이션이고 `QUEUED`가 제외된다
- [ ] **목록 본문이 DB가 아니라 코드+파라미터로 조립된다**
- [ ] 큐 pull이 `FOR UPDATE SKIP LOCKED`다
- [ ] 위 6개 무결성 검사가 스크립트로 존재한다

## Dependencies

- **선행:** `DB-REQ-025`(SCHEMA)
- **짝:** `DB-REQ-027`(MIGRATION) · `028`(PERF)
- **연관:** `SRV-REQ-032`(서버 기능) — 발송 워커

## Open Questions

- 활성 기기 10개 제한은 초대제 10명 규모에서 과할 수 있다. 제한을 두는 이유는 토큰 누적이지 남용이 아니므로 **`lastSeenAt` 기반 정리로 대체 가능**한지 검토.
- D-1 예외를 사용자가 "완전히 끄기"로 해제할 수 있어야 하는가. 현재 정책은 불가. 법적/UX 리스크 확인 필요.
