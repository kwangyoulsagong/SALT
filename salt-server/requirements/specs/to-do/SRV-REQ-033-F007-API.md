---
id: SRV-REQ-033
feature: F007
area: server
kind: API
title: "F007 모바일 앱 — 서버 API 정의 (device 등록 · 버전 게이트)"
priority: high
labels: [server, api, device, notification, security]
created: 2026-09-09
---

## Summary

엔드포인트 3개(2026-09-21 개정 — 5개에서 `notification-prefs` 2개 삭제). 버전 게이트 외 전부 **인증 필수**이고, 전부 **응답에 푸시 토큰이 없다**.

> **2026-09-21 개정.** 알림이 1종(`signal_update`)이 되어(D5 · **기본안 — 감사 문서 B21**) 타입별 설정이 의미가 없다. 알림 켜기/끄기는 **F006 `GET/PATCH /api/investment-notifications/preferences` `{ alertsEnabled }`**(`SRV-REQ-029`)를 쓴다. 두 곳에 두면 앱과 웹 설정이 갈린다.

## 엔드포인트

| Method | Path | 용도 | 인증 |
|---|---|---|---|
| POST | `/api/app/device/register` | 기기 등록/갱신 | 필수 |
| DELETE | `/api/app/device/:deviceId` | 등록 해제 | 필수 |
| GET | `/api/app/device/version-gate` | 최소 지원 버전 | **불필요** |
| ~~GET~~ | ~~`/api/app/device/notification-prefs`~~ | **삭제 2026-09-21** → F006 `/api/investment-notifications/preferences` | — |
| ~~PATCH~~ | ~~`/api/app/device/notification-prefs`~~ | **삭제 2026-09-21** → 동일 | — |

## 계약

### POST /api/app/device/register

```jsonc
// request
{
  "pushToken": "ExponentPushToken[...]",   // 서버가 즉시 해시+암호화. 로그 금지
  "platform": "IOS",
  "pushProvider": "EXPO",
  "appVersion": "1.2.0",
  "runtimeVersion": "1.2.0",
  "osVersion": "17.4",
  "deviceModel": "iPhone14,2"
}
// 200
{
  "success": true,
  "data": {
    "deviceId": "uuid",
    "status": "ACTIVE",
    "registeredAt": "2026-09-10T00:00:00.000Z"
  }
}
```

### GET /api/app/device/version-gate?platform=IOS

```jsonc
// 200
{
  "success": true,
  "data": {
    "platform": "IOS",
    "minSupportedApp": "1.0.0",
    "latestApp": "1.2.0",
    "minRuntime": "1.0.0",
    "message": "앱을 업데이트해 주세요."
  }
}
```

### ~~PATCH /api/app/device/notification-prefs~~ — 삭제 2026-09-21

`TAX_DEADLINE` 타입과 `alwaysOnExceptions: ["D1"]`이 ADR-002로 사라졌다. 알림 on/off는 F006 계약을 쓴다.

## Requirements

### A. 응답 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 모든 응답이 기존 `{ success, message, data }` envelope을 따른다 | Must |
| FR-2 | **어느 응답에도 `pushToken`이 없다** | Must |
| FR-3 | ~~`alwaysOnExceptions`로 "끄더라도 D-1은 온다" 표시~~ → **삭제 2026-09-21** — 예외가 없다(ADR-002 · B21) | — |
| FR-4 | `version-gate`는 **인증 없이** 호출 가능하다. 로그인 전 차단 판정을 해야 하므로 | Must |
| FR-5 | `version-gate`는 사용자별 정보를 담지 않는다 | Must |

### B. 입력 검증

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `pushToken` 형식을 provider별로 검증한다. 실패 시 `422 INVALID_PUSH_TOKEN` | Must |
| FR-11 | `appVersion`·`runtimeVersion`은 **semver**여야 한다. 아니면 `422` | Must |
| FR-12 | `platform`은 enum 밖이면 `422` | Must |
| FR-13 | `deviceModel`·`osVersion`은 선택. 길이 상한 64자 | Must |
| FR-14 | ~~`prefs`의 `type` 2종 검증~~ → **삭제 2026-09-21** — `prefs` 엔드포인트가 없다 | — |

### C. 인가

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `DELETE /device/:deviceId`는 **본인 기기만** 가능하다. 아니면 `404`(존재 노출 방지) | Must |
| FR-21 | 등록은 인증된 사용자에게만 귀속된다. 요청 본문의 `userId`를 받지 않는다 | Must |
| FR-22 | 알림 설정은 사용자 단위다(F006 `User.alertsEnabled`). 기기 단위가 아니다 | Must |

### D. 버전 게이트 집행

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 모든 API가 `X-App-Version`·`X-Platform` 헤더를 읽는다 | Must |
| FR-31 | 최소 미만이면 **`426 UPGRADE_REQUIRED`** + `data.gate` | Must |
| FR-32 | **제외 경로**: `GET /device/version-gate`, `POST /auth/logout`, 헬스체크 | Must |
| FR-33 | 헤더가 없으면(웹 요청) 게이트를 적용하지 않는다 | Must |
| FR-34 | `426` 응답 본문에 금액·사용자 데이터가 없다 | Must |

### E. 보안

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | **등록 요청 본문을 로그에 남기지 않는다.** 접근 로그에 body가 안 실리게 한다 | Must |
| FR-41 | `pushToken`을 에러 메시지·검증 실패 응답에 **echo하지 않는다** | Must |
| FR-42 | 등록 엔드포인트에 rate limit(사용자당 분 10회)을 건다 | Should |
| FR-43 | **거래소 API 키를 다루는 경로가 이 그룹에 0건**이다(계좌 연동은 영구 Non-Goal — ADR-002) | Must |
| FR-44 | ~~알림 설정 변경 감사 로그~~ → F006 소관 (2026-09-21) | — |

### F. 에러 코드

| 상태 | 코드 | 상황 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 미인증 |
| 404 | `DEVICE_NOT_FOUND` | 남의 기기 또는 없음 |
| 422 | `INVALID_PUSH_TOKEN` | 토큰 형식 |
| 422 | `INVALID_VERSION` | semver 아님 |
| ~~422~~ | ~~`UNKNOWN_NOTIFICATION_TYPE`~~ | **삭제 2026-09-21** |
| 426 | `UPGRADE_REQUIRED` | 최소 버전 미만 |
| 429 | `TOO_MANY_REQUESTS` | rate limit |

## Acceptance Criteria

- [ ] 3개 엔드포인트가 envelope 규약을 따른다 (2026-09-21 개정)
- [ ] **`/device/notification-prefs` 경로가 0건이다** — 알림 on/off는 F006 (D5 · B21)
- [ ] **어느 응답에도 `pushToken`이 없다**
- [ ] **`version-gate`가 인증 없이 호출된다**
- [ ] `version-gate`에 사용자별 정보가 없다
- [ ] 토큰 형식·semver·platform 검증이 `422`를 반환한다
- [ ] 남의 기기 삭제가 `404`다
- [ ] 요청 본문의 `userId`를 받지 않는다
- [ ] 모든 API가 `X-App-Version`·`X-Platform`을 읽는다
- [ ] **최소 미만에서 `426`이 반환된다**
- [ ] **`426` 제외 경로에 게이트 조회·로그아웃이 있다**
- [ ] 헤더 없는 웹 요청에 게이트가 적용되지 않는다
- [ ] **등록 요청 본문이 로그에 없다**
- [ ] 검증 실패 응답에 토큰이 echo되지 않는다
- [ ] 등록에 rate limit이 있다
- [ ] 이 엔드포인트 그룹에 거래소 키 경로가 0건이다

## Dependencies

- **선행:** `SRV-REQ-032`(FUNC) · `DB-REQ-025`
- **짝:** `SRV-REQ-034`(DATA) · `035`(PERF)
- **소비:** `BFF-REQ-033`(upstream) · `RN-REQ-030`(앱 연동)

## Open Questions

- `426` 게이트를 서버 미들웨어로 전역 적용하면 BFF 경유 요청에도 걸린다. BFF가 헤더를 pass-through 해야 하는데, 그러면 웹 요청과 구분이 헤더 유무에만 의존한다 — 위조 가능. 앱 전용 경로를 분리할지 검토.
- 알림 설정을 기기 단위로 하고 싶다는 요구가 나올 수 있다(회사폰/개인폰). 지금은 사용자 단위(F006 `alertsEnabled`)로 확정.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` 반영. 머리 배너 추가. `notification-prefs` GET/PATCH 삭제 → F006 `/api/investment-notifications/preferences`(D5 · B21). FR-3 · FR-14 · FR-44 · 에러 `UNKNOWN_NOTIFICATION_TYPE` 삭제 |
