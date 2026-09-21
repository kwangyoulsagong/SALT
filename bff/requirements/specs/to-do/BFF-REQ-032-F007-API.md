---
id: BFF-REQ-032
feature: F007
area: bff
kind: API
title: "F007 모바일 앱 — BFF API 계약 정의"
priority: high
labels: [bff, api, device, mobile, contract]
created: 2026-09-09
---

## Summary

앱이 보는 계약. **웹과 같은 것은 같게 두고, 다른 것은 `device` 계열과 푸시 payload뿐이다.**

> **2026-09-21 개정.** 알림 목록 · 알림 on/off · 홈은 **F006 BFF 계약**(`BFF-REQ-028`)을 그대로 쓴다. 이 REQ는 그 타입을 다시 정의하지 않는다. 알림은 1종(`signal_update`, D5 · **기본안 — 감사 문서 B21**), 홈은 3블록(D6). `TAX_DEADLINE` · `taxDeadline` · `invoice` · `alwaysOnExceptions`는 ADR-002로 삭제.

## 계약

### POST /bff/app/device/register

```ts
type RegisterDeviceRequest = {
  pushToken: string;          // BFF는 통과만. 저장·로그 금지
  platform: 'IOS' | 'ANDROID';
  pushProvider: 'EXPO' | 'FCM' | 'APNS';
  appVersion: string;         // semver
  runtimeVersion: string;
  osVersion?: string;
  deviceModel?: string;
};

type RegisterDeviceResponse = {
  deviceId: string;
  status: 'ACTIVE';
  registeredAt: string;
};
```

### GET /bff/app/device/version-gate?platform=IOS

```ts
type VersionGateResponse = {
  platform: 'IOS' | 'ANDROID';
  minSupportedApp: string;
  latestApp: string;
  minRuntime: string;
  message: string;            // 금액·사용자 데이터 없음
};
```

### ~~GET/PATCH /bff/app/device/notification-prefs~~ — 삭제 2026-09-21

알림 on/off는 F006 `PATCH /api/app/settings/alerts` `{ alertsEnabled }`(`BFF-REQ-028`). 타입별 설정 · `alwaysOnExceptions: ['D1']`이 없다(ADR-002 · B21).

### 알림 목록 — F006 `GET /api/app/alerts` (개정 2026-09-21)

`/bff/app/notifications`를 두지 않는다. 앱은 F006 계약 `{ items: [{ id, messageCode, params, target, isRead, createdAt }], nextCursor }`(`BFF-REQ-028` FR-90)을 그대로 쓴다. 문장은 앱 i18n이 `messageCode`로 만든다.

### 푸시 payload (2026-09-21 신규 — 이 REQ가 소유)

```ts
// 잠금 화면에 보이는 title/body 는 서버가 i18n 카탈로그로 조립. 금액 없음
type PushPayload = {
  type: 'signal_update';                 // 1종 (D5 · B21)
  alertId: string;                       // InvestmentNotification.id — 진입 후 재조회
  target: 'plan' | 'coach' | 'detail';   // F006 alerts.target 과 같은 값
  symbol?: string;                       // target: 'detail' 일 때만
};
```

### 홈 — F006 `GET /api/app/home` (개정 2026-09-21)

`HomeViewModel`은 `BFF-REQ-028`이 정의한다: **3블록**(`totalAsset` · `weeklyPlan` · `coach`) + `unreadAlertCount`. `taxDeadline` · `invoice` 블록은 ADR-002로 삭제됐다. 모바일 오프라인 배너용 `lastUpdatedAt`은 F006 계약에 이 REQ가 요구하는 필드다(FR-5).

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 타입을 `packages/core`에 두고 **web·mobile이 공유**한다 | Must |
| FR-2 | **모바일 전용 필드를 추가하지 않는다** | Must |
| FR-3 | `HomeViewModel`(F006 소유)은 웹 스트리밍과 모바일 단일 응답이 **같은 타입**이다. 3블록 + 기존 블록(D6). *(개정 2026-09-21)* | Must |
| FR-4 | `BlockResult`가 실패를 **정상 값으로 표현**한다. HTTP 상태로 표현하지 않는다 | Must |
| FR-5 | `lastUpdatedAt`은 **BFF 집계 완료 시각**이다. upstream 데이터 시각이 아니다 | Must |
| FR-6 | 딥링크는 **`PushPayload.target` + `alertId`로 앱이 조립**한다. 외부 URL 필드가 payload에 0건이다. *(개정 2026-09-21 — `deepLink` 문자열 대신 target, Open Question 3안 채택)* | Must |
| FR-7 | **응답 어디에도 `pushToken`이 없다** | Must |
| FR-8 | **푸시 `title`/`body`와 알림 `params`에 금액 패턴(`원`·`₩`·숫자+콤마)이 0건**임을 계약 테스트가 검증한다 | Must |
| FR-9 | ~~`alwaysOnExceptions` 전달~~ → **삭제 2026-09-21** — D-1 예외가 없다(ADR-002 · B21) | — |
| FR-11 | **2026-09-21 추가 — D5 · B21.** `PushPayload.type`은 `'signal_update'` 리터럴 하나다 | Must |
| FR-10 | 모든 응답이 `{ success, message, data }` envelope다 | Must |

## 에러 코드

| 상태 | 코드 | 상황 | 앱 동작 |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | 미인증 | 리프레시 → 로그인 |
| 404 | `DEVICE_NOT_FOUND` | 남의/없는 기기 | 무시 |
| 422 | `INVALID_PUSH_TOKEN` | 토큰 형식 | 재등록 시도 안 함, 로그만 |
| 422 | `INVALID_VERSION` | semver 아님 | 빌드 버그. 리포트 |
| ~~422~~ | ~~`UNKNOWN_NOTIFICATION_TYPE`~~ | **삭제 2026-09-21** | — |
| 426 | `UPGRADE_REQUIRED` | 버전 미달 | **업데이트 화면** |
| 429 | `TOO_MANY_REQUESTS` | rate limit | 백오프 |
| 502/504 | `UPSTREAM_*` | 서버 장애 | 재시도 버튼 |

## 계약 테스트

| 검사 | 기대 |
|---|---|
| 응답 JSON에 `pushToken` 키 | 0건 |
| 알림 `title`/`body`에 금액 패턴 | 0건 |
| `PushPayload`에 `http://`/`https://` | 0건 |
| `PushPayload.type`이 `signal_update` 외 | 0건 (2026-09-21) |
| `HomeViewModel`에 `taxDeadline`·`invoice` | 0건 (2026-09-21) |
| `HomeViewModel` 타입이 web·mobile 동일 모듈 | 참 |
| 한 블록 upstream 실패 → 나머지 `ok` | 참 |
| `426` 본문에 사용자 데이터 | 0건 |
| device 응답 필드가 서버 응답과 동일 | 참 (스냅샷) |

## Acceptance Criteria

- [ ] 타입이 `packages/core`에 있고 web·mobile이 공유한다
- [ ] **모바일 전용 필드가 0건이다**
- [ ] `HomeViewModel`이 웹 스트리밍과 모바일 단일 응답에서 같은 타입이다
- [ ] **`BlockResult`가 실패를 정상 값으로 표현한다**
- [ ] `lastUpdatedAt`이 BFF 집계 시각이다
- [ ] **푸시 payload에 외부 URL이 0건이고 딥링크가 `target`으로 조립된다**
- [ ] **응답에 `pushToken`이 0건이다**
- [ ] **알림 본문에 금액 패턴이 0건임이 계약 테스트로 검증된다**
- [ ] **`TAX_DEADLINE`·`alwaysOnExceptions`·`taxDeadline`·`invoice`가 계약에 0건이다** (ADR-002 · B21)
- [ ] 알림 목록 · 홈 타입을 이 REQ가 재정의하지 않고 F006 타입을 import한다
- [ ] 모든 응답이 envelope 규약을 따른다
- [ ] 7개 에러 코드가 앱 동작과 함께 문서화되어 있다 (2026-09-21 개정)
- [ ] 9개 계약 테스트가 CI에서 돈다 (2026-09-21 개정)

## Dependencies

- **선행:** `SRV-REQ-033`(서버 API)
- **짝:** `BFF-REQ-031`(FUNC) · `033`(UPSTREAM) · `034`(PERF)
- **소비:** `RN-REQ-030`(앱 API 연동)

## Open Questions

- ~~`deepLink`를 누가 만들지~~ → **닫힘 2026-09-21** — `target` + `alertId`로 앱이 조립(3안).
- F006 `HomeViewModel`에 `lastUpdatedAt`이 있는지 확인 필요 — 없으면 `BFF-REQ-028`에 추가를 요청한다.
- `lastUpdatedAt`이 집계 시각이면 "5분 전 데이터"를 "방금"으로 보이게 할 수 있다. 블록별 `dataAsOf`를 따로 둘지.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` 반영. 머리 배너 추가. `notification-prefs` · `/bff/app/notifications` · 5블록 `HomeViewModel` 삭제 → F006 계약 참조(D5 · D6 · B21 · ADR-002). `PushPayload` 신설, FR-3 · 6 · 8 개정, FR-9 삭제, FR-11 추가 |
