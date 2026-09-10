---
id: BFF-REQ-022
feature: F003
area: bff
kind: PERF
title: "F003 밸류에이션 밴드 적립 — BFF 성능 정의"
priority: medium
labels: [bff, performance, budget, kimchi, cache]
created: 2026-09-09
---

## Summary

F003은 BFF 부하가 가장 낮다. **김프만 느리고 그것도 서버가 30초 캐시**한다. 이 REQ의 요점은 **김프가 계획 조회를 막지 않게** 하는 것이다.

## 예산

| 엔드포인트 | 예산 | 내역 |
|---|---|---|
| `GET /api/app/plan/weekly` | **300ms** | 서버 250ms + BFF 20ms. 김프는 병렬 |
| `GET /api/app/plan/kimchi-premium` | **1.6s** (상한) | 서버 캐시 히트면 100ms |
| `GET /api/app/plan/settings` | 100ms | |
| `PATCH /api/app/plan/settings` | 150ms | |
| `POST /api/app/plan/weekly/complete` | 150ms | |
| `GET /api/app/plan/indicators` | 200ms | |
| **BFF가 얹는 지연** | **20ms 이하** | |

## 급소 — 김프가 계획을 막지 않게

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 계획과 김프를 **병렬**로 부른다. `Promise.allSettled` | Must |
| FR-2 | **김프 타임아웃 1.5s.** 계획 응답(300ms)을 김프가 막으면 안 된다 | Must |
| FR-3 | 김프 실패·타임아웃 시 `kimchiPremium: null`. **`items`는 정상 반환** | Must |
| FR-4 | 김프를 **별도 엔드포인트로도** 제공해 화면이 나중에 갱신할 수 있게 한다 | Must |
| FR-5 | 김프 실패율을 측정한다. **높으면 외부 소스 문제**다 | Must |

## 캐시

| 대상 | 정책 |
|---|---|
| 주간 계획 | **캐시하지 않는다.** 서버가 이미 주 1회 생성한 것을 읽는다 |
| 지표 | 캐시하지 않는다. 서버가 일 1회 갱신 |
| 김프 | **서버가 30초 캐시**한다. BFF에서 다시 캐시하지 않는다 |
| 실패 이력 | 캐시하지 않는다. 거의 안 바뀌지만 크지 않다 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | BFF에 새 캐시를 만들지 않는다 | Must |
| FR-11 | 두 곳에 캐시를 두면 김프 30초 TTL이 실질적으로 60초가 된다 | Must |

## 병렬화와 타임아웃

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `Promise.allSettled`. `Promise.all` 0건 | Must |
| FR-21 | 서버 호출마다 타임아웃 | Must |
| FR-22 | mutation 재시도 0회 | Must |
| FR-23 | 총 타임아웃 = 가장 느린 블록(김프 1.5s) + 100ms. **단 계획만 필요하면 300ms에 응답**한다 | Must |

## 응답 크기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `items`가 자산 수만큼(현재 2개)이다. 작다 | Must |
| FR-31 | `trackRecords`의 `hits`·`misses`가 각 5개 이하다. 전부 전달 | Must |
| FR-32 | `reasonParams`가 작다 | Must |
| FR-33 | 전체 응답이 **10KB 이하**여야 한다. 넘으면 무언가 잘못됐다 | Should |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 측정: 엔드포인트별 p95, **김프 실패율·지연**, **게이트 미렌더 카운터**, `staleDays` 분포(서버 값 전달), 적립 완료 호출 수 | Must |
| FR-41 | **게이트 미렌더 카운터**를 남긴다. 실패 이력이 없어 카드가 안 나오는 상황을 숫자로 봐야 한다 | Must |
| FR-42 | **BFF가 얹는 지연**을 별도 측정한다 | Must |
| FR-43 | 금액을 로그에 남기지 않는다 | Must |
| FR-44 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] 계획과 김프가 병렬로 호출된다
- [ ] 김프 타임아웃이 1.5s다
- [ ] **김프 실패 시 `items`가 정상 반환된다**
- [ ] 김프 별도 엔드포인트가 있다
- [ ] 김프 실패율이 측정된다
- [ ] BFF에 새 캐시가 0건이다
- [ ] `Promise.all`이 0건이다
- [ ] 서버 호출 전부에 타임아웃이 있다
- [ ] mutation 재시도가 0건이다
- [ ] `GET /api/app/plan/weekly` p95 < 300ms (측정값 기록)
- [ ] 전체 응답이 10KB 이하다
- [ ] **게이트 미렌더 카운터가 있다**
- [ ] `staleDays` 분포가 전달·측정된다
- [ ] **BFF가 얹는 지연 < 20ms** (측정값 기록)
- [ ] 로그에 금액이 0건이다

## Dependencies

- **선행:** `BFF-REQ-019`~`021` · `SRV-REQ-023`(서버 성능)
- **규칙:** `performance-bff.md`

## Open Questions

- 김프를 계획 응답에 합치면 **계획 응답이 김프 지연을 기다린다**(병렬이어도 총 응답은 느린 쪽). `allSettled` + 타임아웃으로 김프만 잘라내면 300ms를 지킬 수 있다 → **그렇게 한다.**
- 김프를 화면이 나중에 별도로 갱신하는 방식이 더 나을 수 있다. 그러면 계획 응답에서 김프를 빼도 된다.
