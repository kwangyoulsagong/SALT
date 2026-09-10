---
id: DB-REQ-025
feature: F007
area: db
kind: SCHEMA
title: "F007 모바일 앱 — DB 스키마 정의 (Device · NotificationDelivery · NotificationPreference)"
priority: high
labels: [db, schema, prisma, device, notification, security]
created: 2026-09-09
---

## Summary

모바일이 존재하는 이유는 **마감 알림이 도달하는 것**이다. 그러려면 DB에 세 가지가 필요하다: **기기가 누구 것인지**(`Device`), **무엇을 이미 보냈는지**(`NotificationDelivery` — D-30을 두 번 보내지 않기 위해), **무엇을 끄기로 했는지**(`NotificationPreference`).

기존 스키마에 `Device`가 **없다**(`prisma/schema.prisma`에 `model Device` 0건). 전부 신규다.

## 모델

### Device

```prisma
model Device {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")

  platform       Platform                            // IOS | ANDROID
  pushTokenHash  String   @map("push_token_hash")     // sha256(token). 조회/중복 판정용
  pushTokenCipher Bytes   @map("push_token_cipher")   // 암호화 저장. 발송 시에만 복호화
  pushProvider   PushProvider @map("push_provider")   // EXPO | FCM | APNS

  appVersion     String   @map("app_version")          // 네이티브 빌드 버전 (semver)
  runtimeVersion String   @map("runtime_version")      // OTA 런타임 버전
  osVersion      String?  @map("os_version")
  deviceModel    String?  @map("device_model")

  status         DeviceStatus @default(ACTIVE)          // ACTIVE | REVOKED | DEAD
  failureCount   Int      @default(0) @map("failure_count")
  lastSeenAt     DateTime @map("last_seen_at")
  registeredAt   DateTime @default(now()) @map("registered_at")
  revokedAt      DateTime? @map("revoked_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveries     NotificationDelivery[]

  @@unique([pushTokenHash])
  @@index([userId, status])
  @@index([status, lastSeenAt])
  @@map("devices")
}

enum Platform      { IOS ANDROID }
enum PushProvider  { EXPO FCM APNS }
enum DeviceStatus  { ACTIVE REVOKED DEAD }
```

### NotificationDelivery

```prisma
model NotificationDelivery {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  deviceId     String?  @map("device_id")               // 기기 삭제 후에도 기록은 남는다

  type         NotificationType                          // TAX_DEADLINE | SIGNAL_UPDATE
  dedupeKey    String   @map("dedupe_key")               // 중복 발송 차단의 전부
  payloadRef   String?  @map("payload_ref")              // 딥링크 대상 식별자 (금액 아님)

  status       DeliveryStatus @default(QUEUED)           // QUEUED|SENT|FAILED|SKIPPED
  providerMessageId String? @map("provider_message_id")
  failureCode  String?  @map("failure_code")
  attemptCount Int      @default(0) @map("attempt_count")

  scheduledFor DateTime @map("scheduled_for")
  sentAt       DateTime? @map("sent_at")
  createdAt    DateTime @default(now()) @map("created_at")

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  device       Device?  @relation(fields: [deviceId], references: [id], onDelete: SetNull)

  @@unique([userId, dedupeKey])
  @@index([status, scheduledFor])
  @@index([userId, type, createdAt])
  @@map("notification_deliveries")
}

enum NotificationType { TAX_DEADLINE SIGNAL_UPDATE }
enum DeliveryStatus   { QUEUED SENT FAILED SKIPPED }
```

### NotificationPreference

```prisma
model NotificationPreference {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  type      NotificationType
  enabled   Boolean  @default(true)
  updatedAt DateTime @updatedAt @map("updated_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type])
  @@map("notification_preferences")
}
```

### AppVersionGate

```prisma
model AppVersionGate {
  id                String   @id @default(uuid())
  platform          Platform
  minSupportedApp   String   @map("min_supported_app")   // semver. 미만이면 진행 차단
  latestApp         String   @map("latest_app")
  minRuntime        String   @map("min_runtime")
  message           String                                // 사용자에게 보일 안내 (금액 없음)
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@unique([platform])
  @@map("app_version_gates")
}
```

`User`에 역관계 3개(`devices`, `notificationDeliveries`, `notificationPreferences`)를 추가한다.

## Requirements

### A. 푸시 토큰 취급

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **푸시 토큰 평문 컬럼이 0건**이다. `pushTokenCipher`(암호문) + `pushTokenHash`(조회용)만 둔다 | Must |
| FR-2 | `pushTokenHash`에 **글로벌 unique**를 건다. 같은 토큰이 두 사용자에게 붙지 않는다 | Must |
| FR-3 | 기기 이전(다른 계정 로그인)으로 같은 토큰이 오면 **기존 행을 `REVOKED`로 내리고 새 행을 만든다** | Must |
| FR-4 | 복호화는 **발송 워커에서만** 일어난다. 조회 API 응답에 토큰이 실리지 않는다 | Must |
| FR-5 | 토큰·기기 모델을 **로그에 남기지 않는다** | Must |

### B. 중복 발송 차단

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `(userId, dedupeKey)` **unique**가 D-30 중복 발송을 막는 유일한 장치다 | Must |
| FR-11 | 세금 D-Day의 `dedupeKey`는 `tax:{assetClass}:{taxYear}:D{n}` 형식이다 | Must |
| FR-12 | 지표 갱신의 `dedupeKey`는 `signal:{indicatorCode}:{asOfDate}` 형식이다 | Must |
| FR-13 | 워커는 INSERT 충돌(`P2002`)을 **정상 경로로 처리**한다. 에러가 아니다 | Must |
| FR-14 | 발송 기록은 **기기 삭제 후에도 남는다**(`deviceId` nullable + `SetNull`) | Must |

### C. 금액 금지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **`NotificationDelivery`에 금액 컬럼이 0건**이다. `payloadRef`는 식별자만 | Must |
| FR-21 | 알림 본문(title/body)을 **DB에 저장하지 않는다.** 발송 시 코드+파라미터로 조립한다 | Must |
| FR-22 | 위 두 항목을 스키마 린트로 검사한다 (`amount`·`krw`·`value` 접미 컬럼 0건) | Should |

**왜**: 잠금화면 노출 방지(FEATURE-007 FR-16)는 발송 시점만의 문제가 아니다. **본문을 DB에 저장하면 백업·덤프·로그로 새어나간다.**

### D. 버전 게이트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `AppVersionGate`는 **플랫폼당 1행**(`@@unique([platform])`)이다 | Must |
| FR-31 | 최소 지원 버전을 **낮추는 방향의 UPDATE는 감사 로그**를 남긴다 | Should |
| FR-32 | `Device.appVersion`·`runtimeVersion`은 등록·하트비트마다 갱신된다 | Must |

### E. 정리(cleanup)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 발송 실패가 연속 누적되면 `failureCount`를 올리고 임계 초과 시 `DEAD`로 내린다 | Must |
| FR-41 | `DEAD` 또는 `REVOKED` 기기는 **180일 후 하드 삭제**한다 | Should |
| FR-42 | `lastSeenAt`이 **90일 이상 지난 `ACTIVE`** 기기는 발송 대상에서 제외한다 | Should |
| FR-43 | 사용자 삭제 시 `Device`·`Preference`는 cascade 삭제된다 | Must |

## 인덱스 근거

| 인덱스 | 쿼리 | 근거 |
|---|---|---|
| `devices(push_token_hash)` unique | 등록 시 중복 판정 | 등록마다 1회 |
| `devices(user_id, status)` | 발송 대상 조회 | 사용자당 기기 1~3개 |
| `devices(status, last_seen_at)` | 죽은 토큰 정리 워커 | 전체 스캔 방지 |
| `notification_deliveries(user_id, dedupe_key)` unique | **중복 차단** | 삽입마다 1회 |
| `notification_deliveries(status, scheduled_for)` | 발송 큐 pull | 워커 주기 실행 |
| `notification_deliveries(user_id, type, created_at)` | 알림 목록 화면 | 페이지네이션 |

## Acceptance Criteria

- [ ] `Device`·`NotificationDelivery`·`NotificationPreference`·`AppVersionGate`가 스키마에 추가된다
- [ ] **푸시 토큰 평문 컬럼이 0건이다**
- [ ] `push_token_hash`에 글로벌 unique가 있다
- [ ] 기기 이전 시 기존 행이 `REVOKED`가 되고 새 행이 생긴다
- [ ] **`(user_id, dedupe_key)` unique가 존재한다**
- [ ] `dedupeKey` 형식이 세금·지표 두 종으로 문서화되어 있다
- [ ] `P2002` 충돌이 워커에서 정상 경로로 처리된다
- [ ] 기기 삭제 후에도 발송 기록이 남는다
- [ ] **`NotificationDelivery`에 금액 컬럼이 0건이다**
- [ ] **알림 본문이 DB에 저장되지 않는다**
- [ ] `AppVersionGate`가 플랫폼당 1행이다
- [ ] `failureCount` 임계 초과 시 `DEAD` 전이가 정의되어 있다
- [ ] 사용자 삭제 시 cascade가 동작한다
- [ ] 위 6개 인덱스가 생성되고 각각 사용 쿼리가 문서화되어 있다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) — `device` 컨텍스트 신설
- **짝:** `DB-REQ-026`(FUNC) · `027`(MIGRATION) · `028`(PERF)
- **연관:** `DB-REQ-009~012`(F002 세금) — D-Day 발송의 데이터 원천

## Open Questions

- 푸시 토큰 암호화 키를 거래소 API 키와 **같은 KMS 키로 쓸지 분리할지**. 분리가 안전하지만 운영 부담이 는다.
- Expo push token을 쓰면 FCM/APNS 토큰이 Expo에 한 겹 더 있다. `pushProvider`를 두었지만 Phase 1은 `EXPO` 단일로 갈지 확정 필요.
- `NotificationDelivery`의 보존 기간. 세금 D-Day는 연 단위 감사가 필요할 수 있어 180일로는 부족할 수 있다.
