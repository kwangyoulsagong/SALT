---
id: SRV-REQ-034
feature: F007
area: server
kind: DATA
title: "F007 모바일 앱 — 서버 데이터 정의 (영속화 · 암호화 · 워커)"
priority: high
labels: [server, data, ddd, repository, worker, security]
created: 2026-09-09
---

## Summary

`device` 컨텍스트의 데이터 규칙은 하나로 요약된다: **평문 토큰이 도메인 밖으로도, DB로도, 로그로도 나가지 않는다.** 그리고 발송 기록은 **지워지지 않는다.**

## 매핑

| 도메인 | 테이블 | 비고 |
|---|---|---|
| `Device` | `devices` | 애그리거트 루트 |
| `PushToken` (VO) | `push_token_hash` + `push_token_cipher` | **두 컬럼으로 분해** |
| `DeliveryRecord` | `notification_deliveries` | 애그리거트 루트 |
| `DedupeKey` (VO) | `dedupe_key` | 문자열 |
| ~~`NotificationPreference`~~ | — | **삭제 2026-09-21** — F006 `User.alertsEnabled` (D5 · B21) |
| `AppVersionGate` (VO) | `app_version_gates` | 플랫폼당 1행 |

## Requirements

### A. 암호화

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 토큰 암호화는 `KmsTokenCipher`(infrastructure)에서만 한다. **도메인은 암복호를 모른다** | Must |
| FR-2 | 복호화는 **`ExpoPushSender` 내부에서만** 일어난다. 다른 어떤 코드도 평문을 얻지 못한다 | Must |
| FR-3 | `pushTokenHash` = `sha256(token + serverPepper)`. 레인보우 테이블 방지 | Must |
| FR-4 | 암호화 키 회전 시 **재암호화 배치**가 존재한다. 해시는 그대로 | Should |
| FR-5 | ~~거래소 API 키와 다른 KMS 키~~ → **개정 2026-09-21** — 서버에 거래소 API 키가 없다(계좌 연동 영구 Non-Goal · ADR-002). 푸시 토큰 전용 데이터 키를 쓴다 | Should |

### B. 리포지토리 규칙

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `DevicePort`·`DeliveryPort`가 도메인에 있고 Prisma 구현이 infrastructure에 있다 | Must |
| FR-11 | 리포지토리가 **도메인 객체를 반환**한다. Prisma 모델을 그대로 내보내지 않는다 | Must |
| FR-12 | `Device`를 반환할 때 **평문 토큰 필드가 없다** | Must |
| FR-13 | `findActiveByUser`는 `status = ACTIVE`이고 `lastSeenAt`이 90일 이내인 것만 반환한다 | Must |
| FR-14 | `insertQueued`는 `P2002`를 잡아 **`null` 반환**으로 변환한다. 예외를 도메인으로 올리지 않는다 | Must |
| FR-15 | 배치 INSERT는 `createMany({ skipDuplicates: true })` | Must |
| FR-16 | 큐 pull은 `$queryRaw`로 `FOR UPDATE SKIP LOCKED`를 쓴다 | Must |

### C. 발송 기록 보존

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `DeliveryRecord`는 **UPDATE만 하고 DELETE하지 않는다**(정리 배치 제외) | Must |
| FR-21 | 기기 하드 삭제 시 `device_id`가 `SetNull`된다. 기록은 남는다 | Must |
| FR-22 | ~~`TAX_DEADLINE` 3년 보존~~ → **삭제 2026-09-21** — 타입이 없다(ADR-002 · B21) | — |
| FR-23 | `SIGNAL_UPDATE` 기록은 180일 보존 후 삭제 가능하다 | Should |
| FR-24 | ~~타입별 다른 보존 기간~~ → **개정 2026-09-21** — 타입이 1종이라 보존 기간은 하나(180일)다 | Must |

### D. 워커

| 워커 | 주기 | 책임 |
|---|---|---|
| ~~`tax-deadline-notify.worker`~~ | — | **삭제 2026-09-21** (ADR-002 · B21) |
| (이벤트 구독) `InvestmentNotificationCreated` → `QUEUED` INSERT | 이벤트 | F006 알림 1건 → 활성 기기별 delivery (2026-09-21) |
| `notification-dispatch.worker` | 1분 | `QUEUED` pull → 전송 → 상태 UPDATE |
| `device-reap.worker` | 매일 KST 04:00 | `DEAD`/`REVOKED` 정리, 오래된 기록 삭제 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 두 워커와 이벤트 구독 전부 **중복 실행에 안전**하다. 재실행이 추가 발송을 만들지 않는다. *(개정 2026-09-21 — 워커 3→2)* | Must |
| FR-31 | 워커는 **advisory lock**으로 단일 실행을 보장한다(dispatch는 예외 — SKIP LOCKED로 다중 허용) | Must |
| FR-32 | 워커 실패는 알림(운영)으로 올린다. **조용히 죽지 않는다** | Must |
| FR-33 | ~~`tax-deadline-notify` 12월 즉시 페이지~~ → **삭제 2026-09-21** — 시즌 심각도 구분이 없다. `notification-dispatch` 실패는 FR-32 일반 알림 | — |
| FR-34 | 워커 로그에 **토큰·금액·사용자 이메일이 0건**이다. `userId`(uuid)까지만 | Must |
| FR-35 | 워커 실행 결과(대상 수·발송 수·스킵 수·실패 수)를 메트릭으로 남긴다 | Must |

### E. 컨텍스트 경계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `notification`(F006) 컨텍스트가 **`devices` 테이블에 직접 접근하지 않는다**. *(개정 2026-09-21 — `tax` 삭제)* | Must |
| FR-41 | `device`가 추천 · 밴드 변경 판정(F004 · F003 · F006 규칙)을 복제하지 않는다. *(개정 2026-09-21 — 세금 마감일 규칙 대체)* | Must |
| FR-42 | 컨텍스트 간 전달은 **유스케이스 호출 또는 도메인 이벤트**다 | Must |
| FR-43 | ACL: `notification`이 넘기는 데이터는 `{ userId, investmentNotificationId, messageCode, params, target }`뿐이다. **금액이 없다**. *(개정 2026-09-21)* | Must |

### F. 마이그레이션 안전

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `devices` 테이블 부재 시 서버가 **기동 실패**한다 | Must |
| FR-51 | 키 회전 중에도 기존 암호문을 복호화할 수 있게 **키 버전을 함께 저장**한다 | Should |
| FR-52 | 백업에서 `push_token_cipher`가 복원되어도 **KMS 키 없이는 무용**하다 | Must |

## 데이터 무결성 스크립트

| 검사 | 주기 |
|---|---|
| 같은 `push_token_hash`로 `ACTIVE` 2행 | 일 1회 |
| `SENT`인데 `sent_at` null | 일 1회 |
| ~~`TAX_DEADLINE` 3년 보존 검사~~ | **삭제 2026-09-21** |
| 로그에 `ExponentPushToken` 문자열 | 배포 시 |
| 알림 카탈로그에 금액 플레이스홀더 | 배포 시 |
| `notification` 컨텍스트에서 `devices` 직접 참조 | 배포 시 (grep) — 2026-09-21 개정 |

## Acceptance Criteria

- [ ] 토큰 암복호가 infrastructure에만 있고 도메인이 모른다
- [ ] **복호화가 sender 내부에서만 일어난다**
- [ ] 해시에 pepper가 들어간다
- [ ] 푸시 토큰 전용 데이터 키를 쓴다 (2026-09-21 개정)
- [ ] 리포지토리가 도메인 객체를 반환하고 평문 토큰 필드가 없다
- [ ] `findActiveByUser`가 90일 조건을 적용한다
- [ ] **`P2002`가 `null` 반환으로 변환된다**
- [ ] 배치 INSERT가 `skipDuplicates`다
- [ ] 큐 pull이 `FOR UPDATE SKIP LOCKED`다
- [ ] **발송 기록이 DELETE되지 않는다(정리 배치 제외)**
- [ ] 기기 삭제 후에도 기록이 남는다
- [ ] 발송 기록 보존이 180일 하나다 (2026-09-21)
- [ ] 두 워커와 이벤트 구독이 중복 실행에 안전하다
- [ ] 워커가 advisory lock으로 단일 실행된다(dispatch 제외)
- [ ] **`tax-deadline-notify.worker`·`NotificationPreference` 매핑이 0건이다** (ADR-002 · B21)
- [ ] **워커 로그에 토큰·금액·이메일이 0건이다**
- [ ] 워커 메트릭 4종이 수집된다
- [ ] **`notification`이 `devices`를 직접 읽지 않는다**
- [ ] **ACL 전달 데이터에 금액이 없다**
- [ ] 서버가 `devices` 부재 시 기동 실패한다
- [ ] 위 5개 무결성 스크립트가 존재한다 (2026-09-21 개정)

## Dependencies

- **선행:** `DB-REQ-025~027` · `SRV-REQ-032`
- **짝:** `SRV-REQ-033`(API) · `035`(PERF)
- **규칙:** `ddd-infrastructure.md` · `ddd-domain.md`

## Open Questions

- KMS 키 분리는 운영 비용이 든다. 초대제 10명 규모에서 **키 하나 + 컨텍스트별 데이터 키**로 절충할지.
- ~~`TAX_DEADLINE` 3년 보존~~ → **닫힘 2026-09-21**(ADR-002).
- `notification`이 `device`를 부르는지 `device`가 `InvestmentNotificationCreated`를 구독하는지 방향이 열려 있다(`SRV-REQ-032` Open Question과 동일).

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` 반영. `NotificationPreference` 매핑 · `tax-deadline-notify.worker` · 세금 3년 보존 · 12월 페이지 삭제(ADR-002 · B21). 컨텍스트 경계를 F006 `notification` 기준으로 개정(FR-40~43), FR-5 · FR-24 · FR-30 개정 |
