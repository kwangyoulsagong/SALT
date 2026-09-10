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

앱이 보는 계약. **웹과 같은 것은 같게 두고, 다른 것은 `device` 계열뿐이다.**

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

### GET/PATCH /bff/app/device/notification-prefs

```ts
type NotificationPrefsResponse = {
  prefs: {
    type: 'TAX_DEADLINE' | 'SIGNAL_UPDATE';
    enabled: boolean;
    alwaysOnExceptions: string[];   // TAX_DEADLINE: ['D1']
  }[];
};
```

### GET /bff/app/notifications?cursor=&limit=20

```ts
type NotificationListResponse = {
  items: {
    id: string;
    type: 'TAX_DEADLINE' | 'SIGNAL_UPDATE';
    title: string;            // 서버가 조립. 금액 없음
    body: string;             // 서버가 조립. 금액 없음
    deepLink: string;         // 앱 내부 경로. 외부 URL 금지
    sentAt: string;
    readAt: string | null;
  }[];
  nextCursor: string | null;
};
```

### GET /bff/home (웹과 공유)

```ts
type HomeViewModel = {
  lastUpdatedAt: string;                  // 오프라인 배너용
  blocks: {
    netWorth:  BlockResult<NetWorthVM>;
    weeklyPlan: BlockResult<WeeklyPlanSummaryVM>;
    signal:    BlockResult<SignalCardVM>;
    taxDeadline: BlockResult<TaxDeadlineVM>;
    invoice:   BlockResult<InvoiceSummaryVM>;
  };
};

type BlockResult<T> =
  | { status: 'ok';      data: T }
  | { status: 'blocked'; reason: string; data: null }
  | { status: 'failed';  reason: string; data: null };
```

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 위 타입을 `packages/core`에 두고 **web·mobile이 공유**한다 | Must |
| FR-2 | **모바일 전용 필드를 추가하지 않는다** | Must |
| FR-3 | `HomeViewModel`은 웹 스트리밍과 모바일 단일 응답이 **같은 타입**이다 | Must |
| FR-4 | `BlockResult`가 실패를 **정상 값으로 표현**한다. HTTP 상태로 표현하지 않는다 | Must |
| FR-5 | `lastUpdatedAt`은 **BFF 집계 완료 시각**이다. upstream 데이터 시각이 아니다 | Must |
| FR-6 | `deepLink`는 **앱 내부 경로**만 허용한다(`salt://` 또는 상대 경로). 외부 URL은 거부 | Must |
| FR-7 | **응답 어디에도 `pushToken`이 없다** | Must |
| FR-8 | **알림 `title`/`body`에 금액 패턴(`원`·`₩`·숫자+콤마)이 0건**임을 계약 테스트가 검증한다 | Must |
| FR-9 | `alwaysOnExceptions`를 그대로 전달해 앱이 "끄더라도 D-1은 옵니다"를 표시하게 한다 | Must |
| FR-10 | 모든 응답이 `{ success, message, data }` envelope다 | Must |

## 에러 코드

| 상태 | 코드 | 상황 | 앱 동작 |
|---|---|---|---|
| 401 | `UNAUTHORIZED` | 미인증 | 리프레시 → 로그인 |
| 404 | `DEVICE_NOT_FOUND` | 남의/없는 기기 | 무시 |
| 422 | `INVALID_PUSH_TOKEN` | 토큰 형식 | 재등록 시도 안 함, 로그만 |
| 422 | `INVALID_VERSION` | semver 아님 | 빌드 버그. 리포트 |
| 422 | `UNKNOWN_NOTIFICATION_TYPE` | 2종 밖 | 앱이 낡음 |
| 426 | `UPGRADE_REQUIRED` | 버전 미달 | **업데이트 화면** |
| 429 | `TOO_MANY_REQUESTS` | rate limit | 백오프 |
| 502/504 | `UPSTREAM_*` | 서버 장애 | 재시도 버튼 |

## 계약 테스트

| 검사 | 기대 |
|---|---|
| 응답 JSON에 `pushToken` 키 | 0건 |
| 알림 `title`/`body`에 금액 패턴 | 0건 |
| `deepLink`에 `http://`/`https://` | 0건 |
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
- [ ] **`deepLink`에 외부 URL이 0건이다**
- [ ] **응답에 `pushToken`이 0건이다**
- [ ] **알림 본문에 금액 패턴이 0건임이 계약 테스트로 검증된다**
- [ ] `alwaysOnExceptions`가 전달된다
- [ ] 모든 응답이 envelope 규약을 따른다
- [ ] 8개 에러 코드가 앱 동작과 함께 문서화되어 있다
- [ ] 7개 계약 테스트가 CI에서 돈다

## Dependencies

- **선행:** `SRV-REQ-033`(서버 API)
- **짝:** `BFF-REQ-031`(FUNC) · `033`(UPSTREAM) · `034`(PERF)
- **소비:** `RN-REQ-030`(앱 API 연동)

## Open Questions

- `deepLink`를 서버가 만들지 BFF가 만들지. 서버가 만들면 앱 라우팅 구조가 서버에 새고, BFF가 만들면 "BFF는 얇게"와 충돌한다. **`payloadRef` + 타입으로 앱이 조립**하는 3안이 더 나을 수 있다.
- `lastUpdatedAt`이 집계 시각이면 "5분 전 데이터"를 "방금"으로 보이게 할 수 있다. 블록별 `dataAsOf`를 따로 둘지.
