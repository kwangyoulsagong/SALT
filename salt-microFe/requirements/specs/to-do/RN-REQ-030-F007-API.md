---
id: RN-REQ-030
feature: F007
area: rn
kind: API
title: "F007 모바일 앱 기반 — API 연동 정의 (기기 · 알림 · 게이트)"
priority: high
labels: [rn, api, device, security]
created: 2026-09-09
---

## Summary

앱이 BFF와 맺는 계약 중 **모바일에만 있는 부분**. 나머지 기능(F000~F006)은 웹과 같은 계약을 쓴다.

## 엔드포인트

| 용도 | 메서드 | 경로 | 인증 | 호출 시점 |
|---|---|---|---|---|
| 기기 등록 | POST | `/bff/app/device/register` | 필수 | 권한 허용 / 로그인 / 토큰 변경 |
| 등록 해제 | DELETE | `/bff/app/device/:id` | 필수 | 로그아웃 |
| 버전 게이트 | GET | `/bff/app/device/version-gate` | **불필요** | 앱 시작 |
| 알림 설정 | GET/PATCH | `/bff/app/device/notification-prefs` | 필수 | 설정 화면 |
| 알림 목록 | GET | `/bff/app/notifications` | 필수 | 목록 화면 |
| 홈 집계 | GET | `/bff/home` | 필수 | 홈 진입 / 복귀 |

## Requirements

### A. 공통 헤더

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **모든 요청**에 `X-App-Version`·`X-Platform`을 붙인다 | Must |
| FR-2 | `X-Request-Id`(uuid)를 붙여 서버 로그와 대조 가능하게 한다 | Should |
| FR-3 | 인증은 `Authorization: Bearer`. 저장은 Keychain/Keystore | Must |
| FR-4 | 헤더 값에 **사용자 식별 가능 정보를 넣지 않는다**(이메일 등) | Must |

### B. 등록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `pushToken`은 **요청 본문에만** 실린다. 쿼리스트링·헤더에 0건 | Must |
| FR-11 | 등록 응답의 `deviceId`를 **암호화 저장소**에 보관한다(해제용) | Must |
| FR-12 | `pushToken` 자체는 저장하지 않는다 | Must |
| FR-13 | 등록은 **재시도 3회 백오프**. 실패해도 앱은 정상 | Must |
| FR-14 | `422 INVALID_PUSH_TOKEN`은 재시도하지 않는다. 다음 실행에 새 토큰으로 | Must |
| FR-15 | `429`는 `Retry-After`를 존중한다 | Must |

### C. 버전 게이트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 앱 시작 시 **인증 전에** 조회한다 | Must |
| FR-21 | 응답을 메모리에만 둔다. 디스크 캐시하지 않는다 | Must |
| FR-22 | 조회 실패는 **차단하지 않는다**(fail-open) | Must |
| FR-23 | 어떤 API든 `426`을 받으면 **전역 차단 상태**로 전환한다 | Must |
| FR-24 | 차단 상태에서도 **`version-gate`와 로그아웃은 호출 가능**하다 | Must |

### D. 응답 파싱

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | zod 파싱. 실패는 크래시가 아니라 폴백 | Must |
| FR-31 | **알 수 없는 필드를 무시**한다. 서버가 필드를 추가해도 구버전 앱이 죽지 않는다 | Must |
| FR-32 | **알 수 없는 `NotificationType`은 목록에서 건너뛴다.** 화면 전체를 깨뜨리지 않는다 | Must |
| FR-33 | `deepLink`가 외부 URL이면 **그 항목을 비활성**으로 렌더한다 | Must |
| FR-34 | `HomeViewModel`의 `BlockResult`가 `failed`여도 다른 블록을 렌더한다 | Must |

### E. 보안

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | **요청/응답 본문을 릴리스 빌드에서 로그하지 않는다** | Must |
| FR-41 | `pushToken`·토큰·금액이 **크래시 리포트에 0건**이다. 스크러빙 규칙을 둔다 | Must |
| FR-42 | 네트워크 인터셉터가 **디버그 빌드에서만** 활성이다 | Must |
| FR-43 | **거래소 API 키를 요청에 싣는 경로가 0건**이다 | Must |
| FR-44 | 서드파티 분석 SDK에 응답 본문을 넘기지 않는다 | Must |
| FR-45 | TLS 인증서 검증을 끄는 설정이 릴리스에 0건이다 | Must |

### F. 에러 매핑

| 상태 | 코드 | 앱 동작 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 리프레시 1회 → 실패 시 로그아웃 |
| 404 | `DEVICE_NOT_FOUND` | 저장된 `deviceId` 삭제. 조용히 |
| 422 | `INVALID_PUSH_TOKEN` | 재시도 안 함. 리포트만 |
| 422 | `UNKNOWN_NOTIFICATION_TYPE` | 앱이 낡음. 게이트 재조회 |
| 426 | `UPGRADE_REQUIRED` | **전역 차단 모달** |
| 429 | `TOO_MANY_REQUESTS` | `Retry-After` 백오프 |
| 5xx/timeout | `UPSTREAM_*` | 캐시 표시 + 재시도 버튼 |
| offline | — | 오프라인 상태 (에러 아님) |

## Acceptance Criteria

- [ ] **모든 요청에 `X-App-Version`·`X-Platform`이 붙는다**
- [ ] 토큰이 Keychain/Keystore에 저장된다
- [ ] 헤더에 이메일 등 식별 정보가 없다
- [ ] **`pushToken`이 본문에만 실리고 저장되지 않는다**
- [ ] `deviceId`가 암호화 저장소에 보관된다
- [ ] 등록이 3회 백오프 재시도하고 실패해도 앱이 동작한다
- [ ] `422`가 재시도되지 않고 `429`가 `Retry-After`를 존중한다
- [ ] **게이트가 인증 전에 조회되고 실패해도 차단하지 않는다**
- [ ] **`426`에서 전역 차단되고 게이트·로그아웃은 여전히 호출된다**
- [ ] zod 파싱 실패가 크래시가 아니다
- [ ] **알 수 없는 필드·알림 타입에서 앱이 죽지 않는다**
- [ ] 외부 URL `deepLink` 항목이 비활성 렌더된다
- [ ] `BlockResult: failed`에서 다른 블록이 렌더된다
- [ ] **릴리스 빌드에서 본문 로깅이 0건이다**
- [ ] **크래시 리포트에 토큰·금액이 0건이고 스크러빙 규칙이 있다**
- [ ] 네트워크 인터셉터가 디버그 전용이다
- [ ] **거래소 API 키 전송 경로가 0건이다**
- [ ] TLS 검증 비활성 설정이 릴리스에 0건이다
- [ ] 8개 에러 매핑이 구현되고 테스트된다
- [ ] iOS·Android 양쪽에서 통과한다

## Dependencies

- **선행:** `BFF-REQ-032`(계약) · `RN-REQ-029`(FUNC)
- **짝:** `RN-REQ-028`(UI) · `031`(PERF)

## Open Questions

- `X-App-Version`을 앱이 스스로 보내므로 **위조 가능**하다. 게이트가 UX 장치라 문제는 아니지만, 금액 계산이 바뀌는 릴리스에서 구버전 차단이 필요하면 서버가 다른 근거(토큰 발급 시 버전 기록)를 써야 한다.
- 크래시 리포트 스크러빙을 SDK 설정으로 할지 자체 래퍼로 할지. SDK 기본 설정만 믿으면 금액이 새어나갈 수 있다.
