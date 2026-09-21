---
id: SRV-REQ-032
feature: F007
area: server
kind: FUNC
title: "F007 모바일 앱 — 서버 기능 정의 (device 컨텍스트 · 푸시 발송 · 버전 게이트)"
priority: high
labels: [server, func, ddd, device, notification]
created: 2026-09-09
---

## Summary

서버에 **`device` 컨텍스트를 신설**한다. 이 컨텍스트가 책임지는 것은 셋이다: **기기를 안다**, **한 번만 보낸다**, **낡은 앱을 막는다**. 푸시 provider는 인프라이지 도메인이 아니다.

## DDD 배치

```
src/contexts/device/
  domain/
    Device.ts                 애그리거트. 등록·이전·실패·사망 전이
    PushToken.ts              값 객체. 평문을 외부로 내보내지 않는다
    DeliveryRecord.ts         애그리거트. dedupeKey · 상태 전이
    DedupeKey.ts              값 객체. signal:{investmentNotificationId} (2026-09-21 — 세금 형식 삭제)
    NotificationPolicy.ts     도메인 서비스. alertsEnabled 판정. 예외 없음 (2026-09-21)
    AppVersionGate.ts         값 객체. semver 비교
    ports/
      DevicePort.ts
      DeliveryPort.ts
      PushSenderPort.ts       send(deviceRef, notificationCode, params) : 금액 파라미터 금지
  application/
    RegisterDeviceUseCase.ts
    RevokeDeviceUseCase.ts
    (UpdateNotificationPrefsUseCase 삭제 2026-09-21 — 알림 on/off는 F006 notification 컨텍스트)
    GetVersionGateUseCase.ts
    SendNotificationUseCase.ts    큐 pull -> 정책 -> 전송 -> 기록
    ReapDeadDevicesUseCase.ts
  infrastructure/
    PrismaDeviceRepository.ts
    PrismaDeliveryRepository.ts
    ExpoPushSender.ts             provider 어댑터
    KmsTokenCipher.ts
  presentation/
    device.routes.ts
    device.controller.ts
    dto/
```

`notification` 컨텍스트(F006)는 **`device`의 공개 유스케이스만** 호출한다. `PrismaDeviceRepository`를 직접 쓰지 않는다. *(개정 2026-09-21 — `tax` 컨텍스트는 ADR-002로 없다)*

> **2026-09-21 개정.** 푸시는 **1종(`signal_update` — 지표 · 추천 갱신)** 이다(D5 · **기본안 — 감사 문서 B21**). 원인은 F006 `SRV-REQ-028` FR-90이 정한 둘 — F004 최신 추천의 action · symbol 변경, F003 주간 밴드 변경. `device`는 **F006이 만든 `InvestmentNotification` 1건을 푸시 1회로 옮기는 일**만 한다.

## Requirements

### A. 기기 등록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `RegisterDeviceUseCase`가 `pushTokenHash` 기준 upsert를 수행한다 | Must |
| FR-2 | 토큰은 **도메인에 평문으로 머무르지 않는다.** `PushToken` 값 객체가 해시와 암호문만 노출한다 | Must |
| FR-3 | 다른 사용자에게 붙어 있던 토큰이면 **기존 기기를 `REVOKED`로 내리고** 새로 등록한다 | Must |
| FR-4 | 등록 시 앱/런타임 버전을 저장하고 `lastSeenAt`을 갱신한다 | Must |
| FR-5 | 등록 응답에 **토큰을 되돌려주지 않는다.** `deviceId`와 상태만 | Must |
| FR-6 | 등록 요청 본문을 **로그에 남기지 않는다** | Must |

### B. 발송

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `SendNotificationUseCase`는 **INSERT(QUEUED) → 정책 판정 → 전송 → 상태 UPDATE** 순이다 | Must |
| FR-11 | `dedupeKey` 충돌은 **성공적 no-op**이다. 예외를 밖으로 던지지 않는다 | Must |
| FR-12 | 전송은 `PushSenderPort` 뒤에 있다. 도메인이 Expo/FCM을 모른다 | Must |
| FR-13 | **`PushSenderPort.send`의 시그니처에 금액 타입이 없다.** 알림 코드 + 제한된 파라미터만 받는다 | Must |
| FR-14 | 본문 조립은 **presentation이 아니라 infrastructure(sender)** 에서 i18n 카탈로그로 한다 | Must |
| FR-15 | provider 호출은 **트랜잭션 밖**이다 | Must |
| FR-16 | 실패 시 `failureCode`를 기록하고 `Device.failureCount`를 올린다. `DeviceNotRegistered`류는 즉시 `DEAD` | Must |
| FR-17 | 재시도는 최대 3회, 지수 백오프. **같은 `DeliveryRecord`** 를 쓴다 | Must |

### C. 알림 정책 (도메인)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `NotificationPolicy.shouldSend(alertsEnabled)`가 유일한 판정 지점이다. 입력은 F006 `User.alertsEnabled`를 `notification` 공개 API로 받은 값이다. **개정 2026-09-21** — 타입별 `pref` 삭제 | Must |
| FR-21 | ~~끈 상태여도 `TAX_DEADLINE`의 `D1`은 보낸다~~ → **개정 2026-09-21** — 끈 상태면 **예외 없이** 보내지 않는다. 세금 D-Day 푸시가 없다(ADR-002 · B21) | Must |
| FR-22 | ~~`SIGNAL_UPDATE`에는 예외가 없다~~ → FR-21에 흡수 (2026-09-21) | — |
| FR-23 | 정책이 `false`면 `SKIPPED`로 기록한다 | Must |
| FR-24 | **알림 타입은 1종(`SIGNAL_UPDATE`)뿐**이다. 2번째를 추가하려면 enum과 정책, 그리고 D5 결정을 함께 바꿔야 한다. **개정 2026-09-21** — 2종 → 1종(D5 · B21) | Must |
| FR-26 | **2026-09-21 추가 — D5.** 푸시 트리거는 F006 `notification`의 `InvestmentNotificationCreated` 이벤트(또는 유스케이스 호출) **하나**다. `device`가 추천 · 밴드 변경을 직접 판정하지 않는다 | Must |
| FR-27 | **2026-09-21 추가.** 딥링크 대상: 원인이 F004 추천 → 코치 탭 추천 카드(또는 상세 분석 페이지), F003 밴드 → 적립 상세. `payloadRef`는 `InvestmentNotification.id`, 앱이 진입 후 재조회한다 | Must |
| FR-25 | 문구에 **압박·독촉 표현이 0건**이다. i18n 카탈로그를 검수 대상으로 둔다 | Must |

### ~~D. 세금 D-Day 연동~~ — 삭제 2026-09-21

ADR-002 · 기본안 — 감사 문서 B21. `tax-deadline-notify.worker`를 만들지 않는다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | ~~`tax-deadline-notify.worker`~~ → **개정 2026-09-21** — 푸시 발송은 F006 알림 생성 이벤트 구독 한 경로다(FR-26). 발송은 `SendNotificationUseCase` 경유, 직접 sender 호출 0건 | Must |
| FR-31 | ~~D-30/14/7/3/1 판정~~ → **삭제 2026-09-21** | — |
| FR-32 | 발송 대상 산정이 사용자 · 기기를 **한 번에 읽는다**(N+1 0건) | Must |
| FR-33 | `dedupeKey`가 **`signal:{investmentNotificationId}`** 로 생성된다. **개정 2026-09-21** | Must |
| FR-34 | **알림에 금액이 실리지 않음을 테스트가 검증**한다(밴드 갱신 푸시에 적립 금액 0건) | Must |
| FR-35 | ~~2026-11-29 D-30 1회~~ → **개정 2026-09-21** — 같은 `InvestmentNotification`이 두 번 생성 이벤트를 내도 푸시는 정확히 1회다 | Must |

### E. 버전 게이트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `GetVersionGateUseCase`가 플랫폼별 최소 지원 버전을 반환한다 | Must |
| FR-41 | semver 비교는 `AppVersionGate` 값 객체 안에 있다. 문자열 비교가 0건이다 | Must |
| FR-42 | 앱 버전이 최소 미만이면 **일반 API가 `426 UPGRADE_REQUIRED`** 를 반환한다 | Must |
| FR-43 | `426` 대상에서 **버전 게이트 조회와 로그아웃은 제외**한다. 그렇지 않으면 앱이 잠긴다 | Must |
| FR-44 | 최소 버전 상향은 **감사 로그**를 남긴다 | Should |

### F. 금지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | **푸시 토큰을 응답·로그에 노출하는 경로가 0건**이다 | Must |
| FR-51 | **알림 본문·payload에 금액이 들어가는 경로가 0건**이다 | Must |
| FR-52 | 알림에서 거래소 주문·출금을 유도하는 딥링크가 0건이다 | Must |
| FR-53 | `device` 도메인이 Prisma·Expo SDK를 import하지 않는다 | Must |
| FR-54 | 다른 컨텍스트가 `devices` 테이블을 직접 읽지 않는다 | Must |

## 이벤트

| 이벤트 | 발행 | 구독 |
|---|---|---|
| `DeviceRegistered` | `device` | 없음 (감사만) |
| `DeviceMarkedDead` | `device` | `notification` — 대체 채널 판단 |
| `NotificationSent` | `device` | 감사·메트릭 |
| ~~`TaxDeadlineApproaching`~~ | — | **삭제 2026-09-21** (ADR-002) |
| `InvestmentNotificationCreated` | `notification`(F006) | `device` — 발송 트리거 (2026-09-21) |

## 테스트

| 종류 | 대상 |
|---|---|
| 도메인 단위 | `NotificationPolicy` — `alertsEnabled=false` → `false` (예외 없음, 2026-09-21) |
| 도메인 단위 | `DedupeKey` 형식 파싱/생성 |
| 도메인 단위 | `AppVersionGate` semver 비교 (`1.10.0 > 1.9.0`) |
| 유스케이스 | 중복 `dedupeKey` → no-op, 예외 없음 |
| 유스케이스 | provider 실패 3회 → `FAILED`, `attemptCount=3` |
| 유스케이스 | `DeviceNotRegistered` → 즉시 `DEAD` |
| 통합 | 밴드 갱신 알림 1건 → 활성 기기마다 푸시 1회 (2026-09-21) |
| 통합 | 같은 알림 생성 이벤트 2회 → 추가 발송 0건 |
| 정적 | `PushSenderPort` 시그니처에 금액 타입 0건 |
| 정적 | 도메인에서 Prisma/Expo import 0건 |
| 정적 | 알림 카탈로그에 금액 플레이스홀더 0건 |

## Acceptance Criteria

- [ ] `device` 컨텍스트가 `domain/application/infrastructure/presentation`으로 신설된다
- [ ] 등록이 `pushTokenHash` upsert고 계정 이전이 처리된다
- [ ] **토큰이 응답·로그에 노출되지 않는다**
- [ ] 발송이 INSERT → 정책 → 전송 → UPDATE 순이다
- [ ] **`dedupeKey` 충돌이 성공적 no-op이다**
- [ ] **`PushSenderPort.send` 시그니처에 금액 타입이 없다**
- [ ] 본문 조립이 i18n 카탈로그 기반이다
- [ ] **provider 호출이 트랜잭션 밖이다**
- [ ] `DeviceNotRegistered`에서 즉시 `DEAD`가 된다
- [ ] 재시도가 최대 3회고 같은 레코드를 쓴다
- [ ] **`NotificationPolicy`가 유일한 판정 지점이다**
- [ ] **끈 상태에서 예외 없이 `SKIPPED`다** (2026-09-21 — ADR-002 · B21)
- [ ] 정책 차단이 `SKIPPED`로 기록된다
- [ ] **알림 타입이 1종(`SIGNAL_UPDATE`)뿐이다** (D5 · B21)
- [ ] `tax-deadline-notify.worker`·`TaxDeadlineApproaching`·`tax:` dedupeKey가 0건이다
- [ ] 푸시 트리거가 F006 알림 생성 한 경로다
- [ ] 알림 문구에 압박 표현이 0건이다
- [ ] 발송이 `SendNotificationUseCase`를 통한다
- [ ] 발송 대상 산정에 N+1이 0건이다
- [ ] **같은 알림 이벤트 2회에도 푸시가 1회다**
- [ ] **알림에 금액이 없음을 테스트가 검증한다**
- [ ] semver 비교가 값 객체 안에 있다
- [ ] 낮은 버전에서 `426`이 반환되고 **게이트 조회·로그아웃은 제외**된다
- [ ] `device` 도메인이 Prisma·Expo를 import하지 않는다
- [ ] 다른 컨텍스트가 `devices` 테이블을 직접 읽지 않는다

## Dependencies

- **선행:** `SRV-REQ-006`(DDD) · `DB-REQ-025~027`
- **짝:** `SRV-REQ-033`(API) · `034`(DATA) · `035`(PERF)
- **연관:** `SRV-REQ-028`(F006 — `signal_update` 생성 · `alertsEnabled`). *(개정 2026-09-21 — "F002 세금 D-Day 차단" 삭제)*

## Open Questions

- `InvestmentNotificationCreated`를 이벤트로 받을지, F006 유스케이스가 `device` 공개 유스케이스를 직접 부를지. 이벤트가 깔끔하지만 인프라(큐)가 늘어난다. *(2026-09-21 — 세금 이벤트 질문을 대체)*
- F004 `notificationLevel`(B16)이 푸시 여부에도 영향하는지. F006 `DB-REQ-021` Open Question(`alertsEnabled` ↔ `notificationLevel`)과 함께 정한다.
- 최소 지원 버전 상향을 누가 어떤 절차로 하는지. 관리 UI가 없으므로 마이그레이션 또는 운영 스크립트가 될 텐데, 실수하면 전원이 잠긴다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` 반영. 머리 배너 추가. 푸시 1종(`SIGNAL_UPDATE`)으로 C절 개정(FR-20 · 21 · 24), D절(세금 D-Day) 삭제·개정(FR-30~35), 이벤트 표 개정. FR-26 · 27(F006 알림 생성 트리거 · 딥링크 대상) 추가. `UpdateNotificationPrefsUseCase` 삭제 |
