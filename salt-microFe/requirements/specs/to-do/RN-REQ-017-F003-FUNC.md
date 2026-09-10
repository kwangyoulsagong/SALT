---
id: RN-REQ-017
feature: F003
area: rn
kind: FUNC
title: "F003 밸류에이션 밴드 적립 — 모바일 기능 정의 (공유 셀렉터 · 오프라인 · 딥링크)"
priority: high
labels: [rn, func, plan, render-gate, offline]
created: 2026-09-09
---

## Summary

모바일도 **계산하지 않는다.** 웹과 다른 점은 셋뿐이다: **오프라인**, **푸시 딥링크**, **앱 포그라운드 복귀 시 재검증**. 게이트 판정 로직은 웹과 **같은 코드**를 쓴다.

## 구성

```
packages/core/plan/
  selectMultiplierRenderable()   <- web · mobile 공유. 복제 금지
  parseWeeklyPlan()              <- zod, fail-closed
apps/mobile/src/
  entities/plan/                 store · 화면 상태
  features/complete-weekly-plan/ 큐 · 낙관적 갱신
  screens/PlanDetailScreen.tsx
  navigation/linking.ts          푸시 딥링크
```

## Requirements

### A. 계산 금지 · 공유 셀렉터

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **밴드 임계값·배수 상수가 앱 소스에 0건**이다 | Must |
| FR-2 | **금액 곱셈·반올림이 0건**이다 | Must |
| FR-3 | 게이트 판정은 `packages/core`의 **단일 셀렉터**다. RN 복제 구현이 0건이다 | Must |
| FR-4 | `renderable` 누락 시 `false` (fail-closed) | Must |
| FR-5 | 김프 `level`을 앱이 재판정하지 않는다 | Must |
| FR-6 | 위 금지를 lint + 테스트로 강제한다 | Must |

### B. 데이터 로딩과 재검증

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `GET /bff/plan/weekly` 1회로 화면을 조립한다 | Must |
| FR-11 | **앱이 포그라운드로 돌아올 때 재검증**한다. 단 60초 이내 재진입은 생략 | Must |
| FR-12 | 주 경계(월요일 00:00 KST)를 넘겨 복귀하면 **무조건 재검증**한다 | Must |
| FR-13 | 실패 이력은 시트 열 때 lazy fetch | Must |
| FR-14 | `renderable: false`면 실패 이력을 fetch하지 않는다 | Must |
| FR-15 | 김프 실패(`null`)를 에러로 다루지 않는다 | Must |

### C. 오프라인

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 마지막 성공 응답을 **메모리 + 암호화 저장소**에 보관해 오프라인에서 보여준다 | Should |
| FR-21 | 오프라인 표시 시 **"마지막 갱신 시각"** 을 함께 표시한다 | Must |
| FR-22 | **오프라인에서 적립 완료 버튼은 disabled**다. 큐에 쌓아 나중에 보내지 않는다 | Must |
| FR-23 | 오프라인 캐시는 **금액을 평문으로 저장하지 않는다**. `expo-secure-store` 또는 암호화 MMKV | Must |
| FR-24 | 로그아웃 시 캐시를 전부 지운다 | Must |
| FR-25 | 캐시 TTL은 7일. 초과분은 표시하지 않고 재조회를 유도한다 | Should |

**왜 큐가 아닌 disabled인가**: 적립 완료는 "내가 실제로 샀다"는 사실 기록이다. 오프라인 큐가 몇 시간 뒤 전송되면 **어느 주차의 완료인지 서버와 어긋날 수 있다.** 사실 기록은 온라인에서만 받는다.

### D. 적립 완료

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `POST /bff/plan/weekly/{planId}/complete` + `Idempotency-Key: {planId}:{weekOf}` | Must |
| FR-31 | 요청 중 버튼 disabled. 낙관적 갱신 후 실패 시 롤백 | Must |
| FR-32 | `409 ALREADY_COMPLETED`는 **조용히 완료 상태로 동기화**한다 | Must |
| FR-33 | 성공 후 계획·연속주차를 재검증한다 | Must |
| FR-34 | 앱 강제 종료 후 재진입 시 서버 상태가 정답이다 | Must |

### E. 푸시 딥링크

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 주간 적립 푸시 payload에 `{ type: 'weekly_plan', planId }` | Must |
| FR-41 | 웜/콜드 스타트 모두 `PlanDetailScreen(planId)`로 라우팅한다 | Must |
| FR-42 | **미로그인 상태면 로그인 후 원래 목적지로 복귀**한다 | Must |
| FR-43 | `planId`가 만료(지난 주)면 최신 주간 계획으로 폴백하고 안내한다 | Must |
| FR-44 | 딥링크 payload를 **로그에 남기지 않는다** | Must |

### F. 금지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | **주문·출금 API 호출 경로가 0건**이다 | Must |
| FR-51 | 거래소 앱 딥링크 유도가 0건이다 | Must |
| FR-52 | **김프 차익거래 안내 로직이 0건**이다 | Must |
| FR-53 | `multiplier: 0`을 매도 문구로 매핑하는 분기가 0건이다 | Must |
| FR-54 | 점수·등급·벌점 계산이 0건이다 | Must |
| FR-55 | 거래소 API 키를 기기에 저장하는 경로가 0건이다 | Must |

## 상태 머신

```
cold/warm start -> loading -> ready
ready --(renderable=false)--> gated
ready --(indicators=[])-----> degraded
ready --(multiplier=0)------> zeroWeek
ready --(체크)--------------> completing -> completed
completing --(409)----------> completed (토스트 없음)
completing --(실패)---------> ready + 토스트
*    --(offline)------------> cachedReadOnly (체크 disabled)
*    --(foreground, >60s)---> revalidating -> ready
```

## 테스트

| 종류 | 대상 |
|---|---|
| 단위 | 공유 셀렉터가 web과 **같은 모듈**임을 import 경로로 검증 |
| 단위 | `renderable` 누락 → `false` |
| 컴포넌트 | `renderable:false` → 배수 노드 부재, 기본액 존재 |
| 통합 | 오프라인 → 체크 disabled, 마지막 갱신 시각 표시 |
| 통합 | 콜드 스타트 딥링크 → PlanDetailScreen 도착 |
| 통합 | 미로그인 딥링크 → 로그인 후 복귀 |
| 통합 | 주 경계 넘어 포그라운드 복귀 → 재검증 발생 |
| 통합 | 더블 탭 → 요청 1회 |
| 정적 | 밴드 임계값 리터럴 0건 · 주문 API 문자열 0건 |
| 기기 | iOS/Android 실기기에서 위 통합 시나리오 |

## Acceptance Criteria

- [ ] **밴드 임계값·배수 상수가 앱 소스에 0건이다**
- [ ] 금액 곱셈·반올림이 0건이다
- [ ] **게이트 셀렉터가 `packages/core` 단일 구현이고 RN 복제가 0건이다**
- [ ] `renderable` 누락이 `false`로 처리된다
- [ ] 김프 `level`을 앱이 재판정하지 않는다
- [ ] BFF 1회 호출로 화면이 조립된다
- [ ] **포그라운드 복귀 재검증이 60초 디바운스로 동작한다**
- [ ] **주 경계를 넘긴 복귀는 무조건 재검증한다**
- [ ] `renderable:false`에서 실패 이력 fetch가 0건이다
- [ ] 오프라인에서 마지막 갱신 시각이 표시된다
- [ ] **오프라인에서 완료 버튼이 disabled고 큐잉이 0건이다**
- [ ] **오프라인 캐시가 평문 저장이 아니다**
- [ ] 로그아웃 시 캐시가 전부 삭제된다
- [ ] complete에 `Idempotency-Key`가 실린다
- [ ] `409`가 조용히 동기화된다
- [ ] **콜드 스타트 딥링크가 PlanDetailScreen에 도착한다**
- [ ] 미로그인 딥링크가 로그인 후 복귀한다
- [ ] 만료 `planId`가 최신 계획으로 폴백된다
- [ ] **딥링크 payload가 로그에 없다**
- [ ] **주문·출금 호출과 거래소 딥링크가 0건이다**
- [ ] 김프 차익거래 안내가 0건이다
- [ ] `multiplier:0` 매도 분기가 0건이다
- [ ] 거래소 API 키 기기 저장이 0건이다
- [ ] iOS·Android 양쪽에서 통과한다

## Dependencies

- **선행:** `RN-REQ-016`(UI) · `RN-REQ-001`(아키텍처) · `BFF-REQ-020`
- **짝:** `RN-REQ-018`(API) · `019`(PERF)
- **규칙:** `rn-architecture.md`

## Open Questions

- 오프라인 캐시를 암호화 MMKV로 할지 `expo-secure-store`로 할지. secure-store는 용량 제한이 있어 계획 JSON 전체는 부담일 수 있다.
- 주 경계 판정을 기기 시계로 하면 조작 가능하다. 서버 `weekOf`와 비교하는 방식이 안전하지만 그러려면 요청이 필요하다 — 순환.
