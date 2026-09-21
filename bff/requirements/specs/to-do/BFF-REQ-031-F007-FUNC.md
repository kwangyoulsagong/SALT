---
id: BFF-REQ-031
feature: F007
area: bff
kind: FUNC
title: "F007 모바일 앱 — BFF 기능 정의 (기기 pass-through · 게이트 전파 · 모바일 홈 집계)"
priority: high
labels: [bff, func, device, notification, mobile]
created: 2026-09-09
---

## Summary

> **2026-09-21 개정.** 푸시는 **1종(`signal_update`)**(D5 · **기본안 — 감사 문서 B21**), 홈은 **3블록**(D6), 알림 목록 · 설정은 **F006 BFF 계약**(`BFF-REQ-028`)을 그대로 쓴다. 세금 D-Day · 청구서 블록과 D-1 예외는 ADR-002로 사라졌다.

F007에서 BFF가 하는 일은 **거의 없어야 한다.** 기기 등록·버전 게이트는 전부 **얇은 통과**다(알림 on/off는 F006 설정 경로 — 2026-09-21). BFF가 판정을 하기 시작하면 서버와 두 벌의 정책이 생긴다.

BFF가 실제로 하는 일은 하나다: **모바일 홈 1콜 집계**. 그리고 그건 웹과 **같은 계약**이어야 한다.

## Requirements

### A. 얇은 통과 (핵심)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `/bff/app/device/*`는 서버 응답을 **필드 변형 없이** 전달한다 | Must |
| FR-2 | **BFF에 semver 비교 코드가 0건**이다. 버전 판정은 서버다 | Must |
| FR-3 | **BFF에 알림 정책 코드가 0건**이다(`alertsEnabled` 판정 포함). *(개정 2026-09-21 — D-1 예외는 ADR-002로 삭제)* | Must |
| FR-4 | **BFF에 `dedupeKey` 생성 코드가 0건**이다 | Must |
| FR-5 | BFF는 푸시 provider를 **직접 부르지 않는다** | Must |
| FR-6 | `pushToken`을 BFF가 **저장·캐시·로그하지 않는다.** 통과시킬 뿐이다 | Must |

**왜**: 버전 게이트나 알림 정책이 BFF에도 있으면, 서버 정책을 바꿔도 앱이 옛 판정을 받는다. *(개정 2026-09-21 — 마감 알림 예시 삭제)*

### B. 버전 게이트 전파

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 앱이 보낸 `X-App-Version`·`X-Platform`을 **모든 upstream 호출에 pass-through** 한다 | Must |
| FR-11 | 서버가 `426 UPGRADE_REQUIRED`를 주면 **그대로 `426`으로 내려보낸다**. 502로 바꾸지 않는다 | Must |
| FR-12 | `426` 응답 본문(`data.gate`)을 변형 없이 전달한다 | Must |
| FR-13 | 헤더가 없는 요청(웹)은 헤더를 만들어 붙이지 않는다 | Must |
| FR-14 | `/bff/app/device/version-gate`는 **인증 없이** 통과한다 | Must |

### C. 모바일 홈 집계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 홈은 **F006 `GET /api/app/home` 집계 1콜**(`BFF-REQ-028` `HomeViewModel`)을 쓴다. 모바일 전용 엔드포인트를 만들지 않는다. **개정 2026-09-21** — 경로를 F006 계약으로 통일 | Must |
| FR-21 | **3블록**(총자산 · 이번 주 적립 · AI 추천)은 블록별 `status`로 격리된다. 한 블록 실패가 나머지를 막지 않는다. 기존 블록(목표 카드 · `AnalysisGraph` · `TipsApp`)은 각자 기존 경로다. **개정 2026-09-21** — 5블록 → 3블록(D6), 세금 D-Day · 청구서 삭제(ADR-002) | Must |
| FR-22 | 모바일은 스트리밍이 아니므로 **전체를 한 응답으로** 반환한다. 웹은 같은 조립기를 스트리밍으로 쓴다 | Must |
| FR-23 | 실패 블록은 `null` + `blockedReason`이다. **에러가 아니다** | Must |
| FR-24 | 3종 세트 렌더 게이트 필드(`renderable`/`blockedReason`/`trackRecordId`)를 **그대로 전달**한다. BFF가 판정하지 않는다 | Must |
| FR-25 | 응답에 **`lastUpdatedAt`(집계 시각)** 을 포함한다. 앱의 오프라인 배너가 이걸 쓴다 | Must |

### D. 알림 목록 — 개정 2026-09-21

알림 목록 · 읽음 · 모두 읽음 · 안 읽은 수는 **F006 BFF(`BFF-REQ-028` FR-90 · 91)** 계약이다. 앱은 웹과 같은 `/api/app/alerts*`를 쓴다(D5). 이 REQ는 모바일용 별도 경로를 두지 않는다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | ~~`/bff/app/notifications`~~ → **개정 2026-09-21** — 앱이 F006 `GET /api/app/alerts`를 쓴다. 모바일 전용 알림 경로 0건 | Must |
| FR-31 | 알림은 `messageCode` + `params` + `target`이다. BFF가 i18n 카탈로그를 갖지 않는다 | Must |
| FR-32 | **응답에 금액이 없음을 계약 테스트가 검증**한다 | Must |
| FR-33 | 읽음 · 모두 읽음은 F006 경로로 통과시킨다 | Should |
| FR-34 | **2026-09-21 추가 — D5 · B21.** 알림 켜기/끄기는 F006 `PATCH /api/app/settings/alerts` 하나다. `/device/notification-prefs` 경로 0건 | Must |

### E. 오류 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 기기 등록 upstream 실패는 **`502`가 아니라 원 상태를 보존**한다(`422`·`429`는 그대로) | Must |
| FR-41 | 등록 실패가 홈·다른 화면을 막지 않는다. 독립 경로다 | Must |
| FR-42 | upstream 타임아웃: device 계열 3s. 홈은 F006 `BFF-REQ-030` 예산을 따른다 (2026-09-21 개정) | Must |
| FR-43 | device 계열은 **재시도하지 않는다.** 등록은 앱이 다시 시도한다 | Must |

### F. 금지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | **`pushToken`을 로그·메트릭·트레이스에 남기는 경로가 0건**이다 | Must |
| FR-51 | **알림 본문·payload에 금액을 추가하는 코드가 0건**이다 | Must |
| FR-52 | 모바일 전용 응답 변형이 0건이다. 계약을 두 벌 만들지 않는다 | Must |
| FR-53 | BFF가 기기 정보를 캐시하지 않는다 | Must |
| FR-54 | 주문·출금 upstream 경로가 0건이다 | Must |

## 라우트

| Method | BFF 경로 | upstream |
|---|---|---|
| POST | `/bff/app/device/register` | `POST /api/app/device/register` |
| DELETE | `/bff/app/device/:id` | `DELETE /api/app/device/:id` |
| GET | `/bff/app/device/version-gate` | `GET /api/app/device/version-gate` |
| ~~GET/PATCH~~ | ~~`/bff/app/device/notification-prefs`~~ | **삭제 2026-09-21** → F006 `PATCH /api/app/settings/alerts` |
| GET | `/api/app/alerts` (F006 소유) | `GET /api/investment-notifications` — `signal_update`만 (2026-09-21 개정) |
| GET | `/api/app/home` (F006 소유) | 3블록 집계 (웹과 공유 — 2026-09-21 개정, D6) |

## Acceptance Criteria

- [ ] device 계열이 필드 변형 없이 통과한다
- [ ] **BFF에 semver 비교 코드가 0건이다**
- [ ] **BFF에 알림 정책·`dedupeKey` 생성 코드가 0건이다**
- [ ] BFF가 푸시 provider를 직접 부르지 않는다
- [ ] **`pushToken`이 BFF에 저장·캐시·로그되지 않는다**
- [ ] `X-App-Version`·`X-Platform`이 모든 upstream에 전달된다
- [ ] **`426`이 그대로 `426`으로 내려간다**
- [ ] `version-gate`가 인증 없이 통과한다
- [ ] **홈이 웹과 같은 계약이고 모바일 전용 엔드포인트가 0건이다**
- [ ] 홈 3블록이 블록별 `status`로 격리되고 `taxDeadline`·`invoice` 블록이 0건이다 (D6 · ADR-002)
- [ ] **`/device/notification-prefs`·모바일 전용 알림 경로가 0건이다** (D5 · B21)
- [ ] 실패 블록이 `null` + `blockedReason`이다
- [ ] **렌더 게이트 필드가 BFF 판정 없이 그대로 전달된다**
- [ ] 응답에 `lastUpdatedAt`이 있다
- [ ] 알림이 F006 `/api/app/alerts` 계약이고 BFF에 카탈로그가 없다
- [ ] **알림 응답에 금액이 없음이 계약 테스트로 검증된다**
- [ ] 등록 실패가 `422`·`429` 원 상태를 보존한다
- [ ] device 계열이 재시도하지 않는다
- [ ] 모바일 전용 응답 변형이 0건이다
- [ ] 주문·출금 upstream 경로가 0건이다

## Dependencies

- **선행:** `SRV-REQ-033`(서버 API) · `BFF-REQ-006`(레이어)
- **짝:** `BFF-REQ-032`(API) · `033`(UPSTREAM) · `034`(PERF)
- **계약 소유:** `BFF-REQ-028`(F006 — 홈 · 알림 · 설정). 이 REQ는 모바일 고유(device · 버전 게이트)만

## Open Questions

- 모바일 홈이 "한 응답"이고 웹이 "스트리밍"이면 조립기는 같아도 **응답 경로가 갈라진다.** 같은 조립기에 두 어댑터를 붙일지, 모바일도 청크로 받을지(RN에서 실익이 적다).
- `426`을 BFF가 그대로 내려보내면 웹 클라이언트도 볼 수 있다. 웹에는 헤더가 없으니 서버가 게이트를 적용하지 않지만, 프록시 설정 실수에 대비한 방어가 필요한지.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-21 | `pm/requirements/reports/feature-audits/2026-09-21-storyboard-gap.md` · `ADR-002` 반영. 머리 배너 추가. 홈 3블록 · F006 `/api/app/home` 통일(FR-20 · 21, D6), 알림 목록 · on/off를 F006 경로로(D절 · FR-34, D5 · B21), `notification-prefs` 라우트 삭제, FR-3 개정(D-1 예외 삭제) |
