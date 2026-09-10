---
id: RN-REQ-018
feature: F003
area: rn
kind: API
title: "F003 밸류에이션 밴드 적립 — 모바일 API 연동 정의"
priority: high
labels: [rn, api, bff, plan, security]
created: 2026-09-09
---

## Summary

모바일도 **BFF만** 부른다. 웹과 다른 점은 **인증 방식**(쿠키 아님 → Bearer + Keychain/Keystore)과 **네트워크 신뢰성**(재시도·타임아웃)이다. 뷰모델 타입은 `packages/core`에서 웹과 **공유**한다.

## 엔드포인트

| 용도 | 메서드 | 경로 |
|---|---|---|
| 주간 계획 | GET | `/bff/plan/weekly` |
| 실패 이력 | GET | `/bff/indicator/{code}/track-record` |
| 적립 완료 | POST | `/bff/plan/weekly/{planId}/complete` |
| 설정 조회/저장 | GET/PUT | `/bff/plan/settings` |

응답 계약은 `FE-REQ-024` / `BFF-REQ-020`의 `WeeklyPlanViewModel`과 **동일**하다. 모바일 전용 필드를 추가하지 않는다.

## Requirements

### A. 계약 공유

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 타입·zod 스키마·파서를 `packages/core`에서 **web과 공유**한다 | Must |
| FR-2 | 모바일 전용 응답 변형을 BFF에 요구하지 않는다 | Must |
| FR-3 | `renderable` 누락 → `false` 파싱 (fail-closed) | Must |
| FR-4 | `multiplier: 0`을 `null`과 구분한다 | Must |
| FR-5 | `kimchiPremium: null` · `narrative: null`이 정상 값이다 | Must |
| FR-6 | 파싱 실패는 크래시가 아니라 `degraded` 폴백이다 | Must |
| FR-7 | 알 수 없는 필드는 무시한다(forward compatible). OTA 없이 서버가 필드를 추가해도 앱이 죽지 않는다 | Must |

### B. 인증과 보안

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 액세스 토큰은 `Authorization: Bearer`. 저장은 **iOS Keychain / Android Keystore**(`expo-secure-store`) | Must |
| FR-11 | **`AsyncStorage`에 토큰을 저장하는 경로가 0건**이다 | Must |
| FR-12 | 401 시 리프레시 1회 → 실패하면 로그아웃 | Must |
| FR-13 | 동시 401이 여러 건이면 **리프레시를 1회로 합친다** | Must |
| FR-14 | **거래소 API 키를 기기에 저장하거나 요청에 싣는 경로가 0건**이다 | Must |
| FR-15 | 요청/응답 본문을 로그에 남기지 않는다. 메서드·경로·상태·소요시간만 | Must |
| FR-16 | **적립 금액을 로그·크래시 리포트에 남기지 않는다** | Must |
| FR-17 | 릴리스 빌드에서 HTTP 로깅 인터셉터가 비활성이다 | Must |

### C. 네트워크 신뢰성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | GET 타임아웃 8s. 재시도 1회(지수 백오프 + 지터) | Must |
| FR-21 | **POST complete는 재시도하지 않는다.** `Idempotency-Key`가 있어도 사용자 확인이 우선 | Must |
| FR-22 | `Idempotency-Key: {planId}:{weekOf}` | Must |
| FR-23 | 네트워크 없음(`NETWORK_UNAVAILABLE`)은 에러 화면이 아니라 **오프라인 상태**로 매핑한다 | Must |
| FR-24 | 앱 버전 헤더 `X-App-Version` · `X-Platform`을 보낸다 | Must |
| FR-25 | 서버가 `426 UPGRADE_REQUIRED`를 주면 **강제 업데이트 화면**으로 간다 | Must |

### D. 에러 매핑

| 상태 | 코드 | 화면 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 리프레시 → 실패 시 로그인 |
| 404 (plan) | `PLAN_NOT_READY` | 온보딩 1필드 |
| 404 (track-record) | — | 시트에 이력 미표시. **에러 아님** |
| 409 (complete) | `ALREADY_COMPLETED` | 조용히 완료 동기화 |
| 422 (settings) | `VALIDATION_FAILED` | 필드 오류 |
| 426 | `UPGRADE_REQUIRED` | 강제 업데이트 |
| 5xx / timeout | `UPSTREAM_*` | 재시도 버튼 |
| offline | `NETWORK_UNAVAILABLE` | 캐시 + 오프라인 배너 |

### E. 금지

| ID | 요구사항 |
|---|---|
| FR-30 | `salt-server` · 지표 제공자 · Upbit · Binance 직접 호출 0건 |
| FR-31 | **주문·출금 엔드포인트 문자열 0건** |
| FR-32 | 응답 원본을 `console.log` 하는 코드 0건 (릴리스) |
| FR-33 | 서드파티 SDK에 적립 금액을 보내는 경로 0건 |

## Acceptance Criteria

- [ ] **타입·스키마·파서가 `packages/core`에서 web과 공유된다**
- [ ] 모바일 전용 응답 변형이 없다
- [ ] `renderable` 누락이 `false`로 파싱된다
- [ ] `multiplier: 0`이 `null`과 구분된다
- [ ] 알 수 없는 필드에서 앱이 죽지 않는다
- [ ] **토큰이 Keychain/Keystore에 저장되고 `AsyncStorage` 경로가 0건이다**
- [ ] 동시 401에서 리프레시가 1회로 합쳐진다
- [ ] **거래소 API 키 기기 저장·전송이 0건이다**
- [ ] **적립 금액이 로그·크래시 리포트에 없다**
- [ ] 릴리스 빌드에 HTTP 본문 로깅이 없다
- [ ] GET이 8s 타임아웃 + 1회 재시도다
- [ ] **POST complete가 자동 재시도되지 않는다**
- [ ] `Idempotency-Key`가 실린다
- [ ] 오프라인이 에러가 아니라 오프라인 상태로 매핑된다
- [ ] `X-App-Version`·`X-Platform`이 전송된다
- [ ] `426`에서 강제 업데이트 화면으로 간다
- [ ] `track-record` 404가 에러 UI를 띄우지 않는다
- [ ] **BFF 외 직접 호출과 주문 엔드포인트 문자열이 0건이다**
- [ ] iOS·Android 양쪽에서 통과한다

## Dependencies

- **선행:** `BFF-REQ-020`(계약) · `RN-REQ-001`(아키텍처)
- **짝:** `RN-REQ-016`(UI) · `017`(FUNC) · `019`(PERF)

## Open Questions

- `426 UPGRADE_REQUIRED`는 F007(버전 게이트)와 겹친다. 판정 기준을 F007에서 정의하고 여기서는 소비만 할지.
- POST complete를 재시도하지 않으면 응답 유실 시 사용자가 다시 눌러야 한다. `409` 처리가 있으니 안전하지만, 자동 1회 재시도를 허용할지 재검토 여지가 있다.
