---
id: BFF-REQ-021
feature: F003
area: bff
kind: UPSTREAM
title: "F003 밸류에이션 밴드 적립 — 서버 호출 계약 정의"
priority: high
labels: [bff, upstream, backend-integration, kimchi]
created: 2026-09-09
---

## Summary

BFF가 부르는 서버 엔드포인트. **김프만 느리고 나머지는 캐시 히트**다.

## 호출 맵

| BFF 함수 | 서버 호출 | 타임아웃 | 재시도 |
|---|---|---|---|
| `weeklyPlan` | `GET /api/plan/weekly` | 500ms | 1회 |
| `kimchiPremium` | `GET /api/plan/kimchi-premium` | **1.5s** | **0회** |
| `planSettings` GET/PATCH | `GET/PATCH /api/plan/settings` | 400ms | GET 1회 / PATCH 0회 |
| `completePlan` | `POST /api/plan/weekly/complete` | 600ms | **0회** |
| `indicators` | `GET /api/indicators?names=` | 400ms | 1회 |
| `trackRecord` | `GET /api/indicators/:i/track-record` | 400ms | 1회 |
| `streak` | (weekly 응답에 포함) | — | — |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `weeklyPlan`과 `kimchiPremium`을 **병렬**로 부른다 | Must |
| FR-2 | **김프 타임아웃 1.5s.** 외부 3곳(업비트·바이낸스·환율)을 부르므로 느리다 | Must |
| FR-3 | **김프를 재시도하지 않는다.** 실패하면 `null`이고 적립 숫자는 유효하다 | Must |
| FR-4 | mutation 재시도 0회 | Must |
| FR-5 | 서버 에러 코드를 그대로 전달: `422` · `404`(track-record 없음) | Must |
| FR-6 | **`track-record` 404가 정상 경로**다. 게이트가 차단하는 근거다 — 오류로 만들지 않는다 | Must |

## 계약 의존

| 서버 필드 | 변경 시 영향 |
|---|---|
| **`renderable`·`trackRecordId`** | **실패 이력 게이트.** 누락 시 화면이 게이트를 우회한다 |
| `multiplier`·`amountKrw` | 화면의 핵심 숫자 |
| `indicator.fallback`·`staleDays` | 지연·폴백 배지 |
| `band.code`·`rangeCode` | 밴드 표 강조 위치 |
| `secondaryIndicators` | Puell 표시(배수 미반영) |
| `kimchiPremium.costKrwOnPlan` | 프리미엄 비용 |
| `streak.skippedLast12` | 미실행 사실 표시 |
| `excluded[]` | 국내주식 제외 문구 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **`renderable`이 없으면 그 item을 전달하지 않고 `degraded`로 처리**한다. 게이트 없이 배수 카드를 내보내는 것이 가장 위험하다 | Must |
| FR-11 | `trackRecordId`가 없으면 **기본값을 만들지 않는다** | Must |
| FR-12 | `indicator` 필드가 없으면 그 item을 `unavailable`로 처리한다. **지표 없이 배수만 보여주면 근거가 없다** | Must |
| FR-13 | 계약 스냅샷 테스트를 둔다. **게이트 필드를 특히 고정**한다 | Must |

## 하지 않는 것

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **외부 지표 API를 BFF가 직접 부르지 않는다.** 서버를 경유한다 | Must |
| FR-21 | **업비트·바이낸스를 김프 목적으로 직접 부르지 않는다.** 서버가 계산한다 — BFF가 가격 캐시를 갖고 있어도 환율이 없다 | Must |
| FR-22 | 배수·금액을 계산하지 않는다 | Must |
| FR-23 | 게이트를 판정하지 않는다 | Must |

## Acceptance Criteria

- [ ] 계획과 김프가 병렬로 호출된다
- [ ] 김프 타임아웃이 1.5s이고 재시도가 0건이다
- [ ] mutation 재시도가 0건이다
- [ ] `track-record` 404가 정상 경로로 처리된다 (오류 0건)
- [ ] **`renderable` 없는 item이 전달되지 않고 `degraded`로 처리된다**
- [ ] `trackRecordId`가 기본값으로 채워지지 않는다
- [ ] `indicator` 없는 item이 `unavailable`이다
- [ ] 계약 스냅샷 테스트가 게이트 필드를 고정한다
- [ ] **BFF가 외부 지표 API·업비트·바이낸스를 직접 부르지 않는다** (코드 검사)
- [ ] BFF에 배수·금액 계산, 게이트 판정 코드가 0건이다

## Dependencies

- **선행:** `SRV-REQ-021`(서버 계약)
- **짝:** `BFF-REQ-019` · `020` · `022`
- **규칙:** `backend-integration.md`

## Open Questions

- BFF가 이미 업비트 WS 가격 캐시를 갖고 있다. **김프를 BFF에서 계산하면 업비트 호출이 하나 준다** — 그러나 바이낸스와 환율이 없고, **계산은 서버의 일**이라는 원칙에 어긋난다 → 서버가 맞다.
- `track-record` 404를 BFF가 어떻게 표현할지. `trackRecordId: null` + `renderable: false`가 이미 서버 응답에 있으므로 별도 처리가 불필요하다.
