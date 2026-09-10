---
id: BFF-REQ-033
feature: F007
area: bff
kind: UPSTREAM
title: "F007 모바일 앱 — BFF upstream 호출 정의"
priority: high
labels: [bff, upstream, device, resilience]
created: 2026-09-09
---

## Summary

F007의 upstream은 전부 `salt-server` **단일 대상**이다. 외부 push provider를 BFF가 부르는 경로는 **0건**이다.

## 호출 지도

| BFF 라우트 | upstream | 타임아웃 | 재시도 | 실패 시 |
|---|---|---|---|---|
| `POST /bff/app/device/register` | `POST /api/app/device/register` | 3s | **0회** | 원 상태 보존 |
| `DELETE /bff/app/device/:id` | `DELETE /api/app/device/:id` | 3s | 0회 | 원 상태 보존 |
| `GET /bff/app/device/version-gate` | `GET /api/app/device/version-gate` | 2s | 1회 | **캐시된 마지막 값** |
| `GET/PATCH /notification-prefs` | 동일 | 3s | 0회 | 원 상태 보존 |
| `GET /bff/app/notifications` | `GET /api/notifications` | 2s | 1회 | 빈 목록 + `degraded` |
| `GET /bff/home` → 5블록 | 5개 서버 엔드포인트 | **블록당 1.5s** | 0회 | 블록별 `failed` |

## Requirements

### A. push provider 금지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **BFF가 Expo/FCM/APNS를 호출하는 경로가 0건**이다 | Must |
| FR-2 | BFF 의존성에 push SDK가 **0건**이다 | Must |
| FR-3 | 발송은 전적으로 서버 워커다. BFF는 발송 트리거도 갖지 않는다 | Must |

### B. 버전 게이트 회복력

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 게이트 응답을 **BFF에서 5분 캐시**한다. 사용자 무관 데이터다 | Must |
| FR-11 | upstream 실패 시 **마지막 캐시 값**을 준다 | Must |
| FR-12 | 캐시도 없고 upstream도 실패하면 **가장 허용적인 값**(`minSupportedApp: '0.0.0'`)을 준다 | Must |
| FR-13 | 위 폴백은 `degraded: true`로 표시한다 | Should |

**왜 허용적 폴백인가**: 게이트가 실패했을 때 전원을 잠그면 장애가 서비스 중단이 된다. 게이트는 UX 안내이지 보안 경계가 아니다(`SRV-REQ-035` FR-11과 같은 근거).

### C. 홈 집계 격리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 5블록을 `Promise.allSettled`로 병렬 호출한다 | Must |
| FR-21 | 블록당 타임아웃 1.5s. **전체 응답 상한 2s** | Must |
| FR-22 | 느린 블록 하나가 나머지를 기다리게 하지 않는다 | Must |
| FR-23 | 세금 블록(F002) 실패는 **`failed`로 표시하고 응답은 200**이다 | Must |
| FR-24 | 추천 블록의 렌더 게이트 필드는 **판정 없이 전달**한다 | Must |
| FR-25 | 블록별 서킷 브레이커를 둔다. 연속 실패 시 즉시 `failed` 반환으로 빠르게 실패한다 | Should |

### D. 재시도 정책

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | **쓰기(POST/PATCH/DELETE)는 재시도하지 않는다** | Must |
| FR-31 | 읽기 재시도는 최대 1회 + 지터 | Must |
| FR-32 | 홈 블록은 **재시도하지 않는다.** 응답 시간이 예산을 넘는다 | Must |
| FR-33 | `429`·`426`·`422`는 **재시도 대상이 아니다** | Must |

### E. 헤더 전달

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `Authorization`·`X-App-Version`·`X-Platform`·`X-Request-Id`를 전달한다 | Must |
| FR-41 | `Idempotency-Key`가 있으면 전달한다 | Must |
| FR-42 | 앱이 보내지 않은 헤더를 **BFF가 만들어내지 않는다** | Must |
| FR-43 | upstream 응답 헤더 중 `Retry-After`를 전달한다 | Should |

### F. 관측과 보안

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | upstream 호출에 **요청 본문을 로그하지 않는다.** device 계열은 특히 | Must |
| FR-51 | 트레이스 속성에 `pushToken`이 0건이다 | Must |
| FR-52 | 블록별 upstream 지연·실패율을 메트릭으로 남긴다 | Must |
| FR-53 | `426` 전달 횟수를 메트릭으로 남긴다 (낡은 앱 사용 현황) | Should |

## 장애 시나리오

| 시나리오 | 조건 | 기대 |
|---|---|---|
| 서버 전체 다운 | 5xx | 홈 전 블록 `failed`, **200 응답**, 앱은 캐시 표시 |
| 게이트 upstream 다운 | 타임아웃 | 캐시 값 → 없으면 허용적 폴백 |
| 세금 블록만 느림 | 3s | 1.5s에 끊고 `failed`, 나머지 정상 |
| 등록 upstream 429 | rate limit | `429` + `Retry-After` 그대로 전달 |
| 등록 중 네트워크 끊김 | 응답 유실 | **재시도 0회**. 앱이 다시 시도 |
| 알림 목록 upstream 404 | 없음 | 빈 목록 |

## Acceptance Criteria

- [ ] **BFF가 push provider를 호출하는 경로가 0건이고 SDK 의존성이 0건이다**
- [ ] 게이트가 5분 캐시된다
- [ ] **게이트 upstream 실패 시 캐시 → 허용적 폴백 순으로 동작한다**
- [ ] 폴백이 `degraded`로 표시된다
- [ ] 5블록이 `allSettled` 병렬이고 블록당 1.5s, 전체 2s다
- [ ] **느린 블록이 나머지를 막지 않는다**
- [ ] 세금 블록 실패에도 응답이 200이다
- [ ] 렌더 게이트 필드가 판정 없이 전달된다
- [ ] **쓰기가 재시도되지 않는다**
- [ ] 홈 블록이 재시도되지 않는다
- [ ] `429`·`426`·`422`가 재시도되지 않는다
- [ ] 4종 헤더가 전달되고 BFF가 헤더를 날조하지 않는다
- [ ] `Retry-After`가 전달된다
- [ ] **device 계열 요청 본문이 로그에 없고 트레이스에 `pushToken`이 0건이다**
- [ ] 블록별 지연·실패율 메트릭이 수집된다
- [ ] 6개 장애 시나리오가 검증된다

## Dependencies

- **선행:** `SRV-REQ-033`(서버 API) · `BFF-REQ-031`(FUNC)
- **짝:** `BFF-REQ-032`(API) · `034`(PERF)

## Open Questions

- 게이트 캐시를 프로세스 메모리에 둘지 Redis에 둘지. 인스턴스가 여러 개면 폴백 시점이 갈린다.
- 서킷 브레이커를 블록별로 두면 상태가 5개다. 초대제 규모에서 과한 복잡도일 수 있다 — 타임아웃만으로 충분한지 실측 후 결정.
