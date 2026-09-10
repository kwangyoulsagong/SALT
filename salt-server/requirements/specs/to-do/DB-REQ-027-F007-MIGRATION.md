---
id: DB-REQ-027
feature: F007
area: db
kind: MIGRATION
title: "F007 모바일 앱 — DB 마이그레이션 정의"
priority: high
labels: [db, migration, prisma, device, notification]
created: 2026-09-09
---

## Summary

전부 **신규 테이블**이다. 기존 행을 변형하지 않으므로 백필이 없고 되돌리기가 쉽다. 유일한 주의점은 **`User`에 역관계 3개 추가**와 **기존 `InvestmentNotification`과의 관계 정리**다.

## 현재 상태

`prisma/schema.prisma`에 `model Device` **0건**. 알림 관련 기존 모델은 `InvestmentNotification`(466행) · `SentimentAlert` · `SmartMoneyAlert` 세 개인데, 이들은 **인앱 알림**이고 푸시 발송 기록이 아니다.

## 마이그레이션 순서

### M1 — enum 생성

```sql
CREATE TYPE "Platform"         AS ENUM ('IOS','ANDROID');
CREATE TYPE "PushProvider"     AS ENUM ('EXPO','FCM','APNS');
CREATE TYPE "DeviceStatus"     AS ENUM ('ACTIVE','REVOKED','DEAD');
CREATE TYPE "NotificationType" AS ENUM ('TAX_DEADLINE','SIGNAL_UPDATE');
CREATE TYPE "DeliveryStatus"   AS ENUM ('QUEUED','SENT','FAILED','SKIPPED');
```

### M2 — `devices`

```sql
CREATE TABLE "devices" (...);
CREATE UNIQUE INDEX "devices_push_token_hash_key" ON "devices"("push_token_hash");
CREATE INDEX "devices_user_id_status_idx"         ON "devices"("user_id","status");
CREATE INDEX "devices_status_last_seen_at_idx"    ON "devices"("status","last_seen_at");
```

### M3 — `notification_deliveries`

```sql
CREATE TABLE "notification_deliveries" (...);
CREATE UNIQUE INDEX "nd_user_dedupe_key"  ON "notification_deliveries"("user_id","dedupe_key");
CREATE INDEX "nd_status_scheduled_idx"    ON "notification_deliveries"("status","scheduled_for");
CREATE INDEX "nd_user_type_created_idx"   ON "notification_deliveries"("user_id","type","created_at" DESC);
```

### M4 — `notification_preferences` · `app_version_gates`

### M5 — `app_version_gates` 초기 행

```sql
INSERT INTO "app_version_gates"(id, platform, min_supported_app, latest_app, min_runtime, message)
VALUES (gen_random_uuid(),'IOS',    '1.0.0','1.0.0','1.0.0','앱을 업데이트해 주세요.'),
       (gen_random_uuid(),'ANDROID','1.0.0','1.0.0','1.0.0','앱을 업데이트해 주세요.');
```

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | M1~M5를 **각각 별도 마이그레이션 파일**로 나눈다. 하나가 실패해도 앞은 남는다 | Must |
| FR-2 | 인덱스 생성은 `CREATE INDEX CONCURRENTLY`를 쓰지 **않는다**. 신규 빈 테이블이므로 불필요하다 | Must |
| FR-3 | 백필이 **0건**이다. 기존 행을 읽거나 쓰지 않는다 | Must |
| FR-4 | `User` 역관계 추가는 Prisma 스키마만 바뀌고 **SQL DDL이 없다** | Must |
| FR-5 | 롤백은 `DROP TABLE` 4개 + `DROP TYPE` 5개다. 데이터 손실 범위가 신규 테이블로 한정된다 | Must |
| FR-6 | **기존 `InvestmentNotification`을 건드리지 않는다.** 통합은 이번 범위가 아니다 | Must |
| FR-7 | `app_version_gates` 초기값은 **가장 낮은 버전**으로 넣는다. 배포 즉시 아무도 차단되지 않게 | Must |
| FR-8 | 마이그레이션 전후로 `prisma migrate diff`가 비어 있음을 CI에서 확인한다 | Must |

## 배포 순서 (중요)

```
1. DB 마이그레이션 (M1~M5)        ← 앱보다 먼저
2. 서버 배포 (device 컨텍스트)     ← 엔드포인트가 생긴다
3. BFF 배포
4. 앱 릴리스 (TestFlight/내부테스트)
```

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **DB → 서버 → BFF → 앱** 순서를 지킨다. 앱이 먼저 나가면 등록이 전부 실패한다 | Must |
| FR-11 | 서버는 `devices` 테이블 부재를 **기동 실패로 취급**한다. 조용히 무시하지 않는다 | Must |
| FR-12 | 앱은 등록 실패를 **치명 오류로 다루지 않는다.** 앱은 동작하고 푸시만 안 온다 | Must |

## 검증

| 단계 | 검사 |
|---|---|
| 마이그레이션 후 | 4개 테이블·5개 enum·6개 인덱스 존재 |
| 마이그레이션 후 | `app_version_gates` 2행 |
| 마이그레이션 후 | `\d devices`에 평문 토큰 컬럼 0건 |
| 롤백 리허설 | 스테이징에서 up→down→up 1회 성공 |
| 등록 스모크 | 실기기 1대 등록 → `devices` 1행 |
| 중복 스모크 | 같은 토큰 2회 등록 → 1행 유지 |
| dedupe 스모크 | 같은 `dedupeKey` 2회 INSERT → `P2002` |

## 데이터 보존

| ID | 요구사항 |
|---|---|
| FR-20 | 롤백 시 `notification_deliveries`가 사라진다 → **세금 시즌(12월) 중 롤백을 금지**한다 |
| FR-21 | 12월 이전에 배포를 끝낸다. F002 하드 마감(2026-12-29)의 선행 조건이다 |
| FR-22 | 프로덕션 마이그레이션 전 스냅샷을 남긴다 |

## Acceptance Criteria

- [ ] M1~M5가 별도 마이그레이션 파일로 분리되어 있다
- [ ] **백필이 0건이다**
- [ ] 4개 테이블·5개 enum·6개 인덱스가 생성된다
- [ ] `app_version_gates`에 플랫폼별 초기 행이 있고 값이 최저 버전이다
- [ ] **평문 푸시 토큰 컬럼이 0건이다**
- [ ] 기존 `InvestmentNotification`이 변경되지 않는다
- [ ] 스테이징에서 up→down→up이 1회 성공한다
- [ ] `prisma migrate diff`가 CI에서 비어 있다
- [ ] **배포 순서가 DB → 서버 → BFF → 앱으로 문서화되고 지켜진다**
- [ ] 서버가 `devices` 부재 시 기동 실패한다
- [ ] 앱이 등록 실패해도 동작한다
- [ ] 같은 토큰 2회 등록에서 1행이 유지된다
- [ ] 같은 `dedupeKey` 2회 INSERT가 `P2002`다
- [ ] **12월 롤백 금지가 릴리스 체크리스트에 있다**

## Dependencies

- **선행:** `DB-REQ-025`(SCHEMA) · `DB-REQ-026`(FUNC)
- **짝:** `DB-REQ-028`(PERF)
- **차단:** F002 세금 D-Day 알림은 이 마이그레이션 없이는 도달하지 않는다

## Open Questions

- `InvestmentNotification`과 `NotificationDelivery`를 언제 통합할지. 지금은 인앱/푸시로 역할이 다르지만 알림 목록 화면이 둘을 합쳐 보여줘야 한다면 조인이 필요하다.
- 롤백 시 발송 기록 손실을 막으려면 down 마이그레이션에서 덤프를 뜨게 할지.
