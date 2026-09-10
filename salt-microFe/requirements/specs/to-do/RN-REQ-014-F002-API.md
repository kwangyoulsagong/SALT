---
id: RN-REQ-014
feature: F002
area: rn
kind: API
title: "F002 세금 마감 콕핏 — 모바일 API 호출 계약 정의"
priority: critical
labels: [rn, api, react-query, aggregate, offline]
created: 2026-09-09
---

## Summary

모바일은 **RSC가 없으므로 집계 1콜**을 쓴다. 웹의 블록별 호출과 달리 `GET /api/app/tax/cockpit` 하나로 받고 세그먼트로 전환한다.

## 호출 배치

| 화면 요소 | 호출 | 방식 |
|---|---|---|
| D-Day 요약 (자산 탭) | `GET /api/app/tax/deadlines` | React Query, `staleTime: 5m` |
| 세금 화면 전체 | **`GET /api/app/tax/cockpit`** | React Query, `staleTime: 10m` |
| 환율 함정 | 위 응답에 포함 | — |
| 손실수확 솔버 | `POST /api/app/tax/harvest-solve` | mutation, `gcTime: 0` |
| 슬라이더 대조 | `POST /api/app/tax/crypto-scenario` | mutation |
| 증빙 다운로드 | `POST /api/app/tax/archive/download` | mutation → OS 공유 시트 |
| 법령 파라미터 | `GET/PATCH /api/app/tax/law-config` | query + mutation |
| 수동 스냅샷 | `POST /api/app/tax/snapshot/manual` | mutation |

## Requirements

### A. 집계 1콜

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 세금 화면은 **집계 엔드포인트 1콜**로 렌더한다. 자산군별로 3번 부르지 않는다 | Must |
| FR-2 | 세그먼트 전환은 **이미 받은 데이터로** 한다. 전환마다 서버를 부르지 않는다 | Must |
| FR-3 | `GET /api/app/tax/deadlines`는 **자산 탭 요약용**으로 별도 호출한다. 세금 화면을 열지 않고도 D-Day를 보여준다 | Must |
| FR-4 | 두 호출의 `deadlines`가 같아야 한다. 다르면 서버 계약 문제다 | Must |

### B. React Query 설정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | `staleTime`을 **명시**한다. `deadlines` 5분, `cockpit` 10분. 기본값 0이면 포커스마다 재요청한다 | Must |
| FR-11 | 오프라인 캐시를 위해 **persist**를 설정한다. 캐시 저장소는 `AsyncStorage`(민감 정보 아님 — 금액은 있지만 토큰이 아니다) | Must |
| FR-12 | **토큰은 `AsyncStorage`가 아니라 secure store**다. 쿼리 캐시와 토큰 저장소를 혼동하지 않는다 | Must |
| FR-13 | mutation은 **재시도하지 않는다** | Must |
| FR-14 | 솔버 mutation 결과를 캐시하지 않는다(`gcTime: 0`) | Must |
| FR-15 | `useUpdateLawConfig` 성공 시 세금 쿼리를 **전부 무효화**한다 | Must |
| FR-16 | 긴 요청(솔버)에 `AbortSignal`을 연결한다. 화면 이탈 시 취소 | Must |
| FR-17 | 백그라운드 복귀 시 stale이면 재조회한다(`refetchOnAppFocus`) | Must |
| FR-18 | 조회 훅은 `entities/tax/api/`, mutation 훅은 `features/{slice}/api/`에 둔다 | Must |

### C. 오프라인

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 네트워크 상태를 감지해 **오프라인이면 mutation을 시도하지 않는다.** 버튼 비활성 + 사유 표시 | Must |
| FR-21 | 오프라인에서 조회는 **캐시를 반환**하고 `dataUpdatedAt`을 배너에 표시한다 | Must |
| FR-22 | **오프라인 큐(`mutationCache` 재생)를 쓰지 않는다** | Must |
| FR-23 | 온라인 복귀 시 자동 재조회한다. 자동 mutation 재전송은 하지 않는다 | Must |

### D. 서명 URL과 파일

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `archive/download` 응답의 `signedUrl`을 **OS 공유 시트 또는 다운로드 매니저**에 넘긴다. 앱이 파일을 메모리에 올리지 않는다 | Must |
| FR-31 | `expiresAt`을 표시하고 만료 시 재발급 버튼을 준다 | Must |
| FR-32 | 파일 접근 권한이 없으면 요청하고 **사유를 명시**한다 | Must |

### E. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `403 SNAPSHOT_IMMUTABLE` → "이미 수집된 시가는 변경할 수 없습니다" | Must |
| FR-41 | `403 SCOPE_NOT_ALLOWED` → 거래소 키 화면 안내 | Must |
| FR-42 | 타임아웃·네트워크 오류는 재시도 버튼으로. 자동 재시도는 조회 1회 | Must |
| FR-43 | HTTP 상태 → 문구 매핑은 `shared/i18n`. `shared/api`가 에러를 정규화한다 | Must |
| FR-44 | 서버 에러 메시지 원문을 화면에 노출하지 않는다 | Must |

### F. 타입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 뷰모델 타입을 **`packages/core`에서 웹과 공유**한다. 프론트가 다시 정의하지 않는다 | Must |
| FR-51 | 열거값은 `enum`. 문자열 리터럴 union 금지 | Must |
| FR-52 | `any` 0건. 응답 파싱에 타입 가드 | Must |
| FR-53 | `scenarioParams` 타입이 재계산 함수 입력과 정확히 같다. 필드 누락이 **컴파일에서 잡힌다** | Must |

## Acceptance Criteria

- [ ] 세금 화면이 집계 1콜로 렌더된다 (네트워크 로그에 요청 1건)
- [ ] 세그먼트 전환 시 서버 호출이 0건이다
- [ ] 자산 탭 D-Day 요약이 별도 호출로 온다
- [ ] 두 호출의 `deadlines`가 일치한다
- [ ] `staleTime`이 명시되어 있다
- [ ] 쿼리 캐시가 persist되고 오프라인에서 반환된다
- [ ] **토큰이 secure store에 있고 `AsyncStorage`에 0건이다**
- [ ] mutation 재시도가 0건이다
- [ ] 솔버 결과가 캐시되지 않는다
- [ ] 법령 편집 후 세금 쿼리가 무효화된다
- [ ] 솔버에 `AbortSignal`이 연결되고 화면 이탈 시 취소된다
- [ ] 백그라운드 복귀 시 stale 데이터가 재조회된다
- [ ] 오프라인에서 mutation 버튼이 비활성이다
- [ ] 오프라인에서 캐시가 반환되고 `dataUpdatedAt`이 배너에 표시된다
- [ ] **오프라인 mutation 큐가 0건이다**
- [ ] 온라인 복귀 시 조회만 재개되고 mutation 재전송이 0건이다
- [ ] ZIP이 OS 공유 시트로 넘어가고 앱 메모리를 쓰지 않는다
- [ ] `expiresAt`이 표시되고 재발급 버튼이 있다
- [ ] 파일 권한 요청에 사유가 있다
- [ ] `403` 2종이 각각 다른 문구로 처리된다
- [ ] 서버 에러 원문이 화면에 0건이다
- [ ] 뷰모델 타입이 `packages/core`에서 온다
- [ ] 리터럴 union 열거값 0건, `any` 0건
- [ ] `scenarioParams` 필드를 지우면 컴파일이 실패한다

## Dependencies

- **선행:** `BFF-REQ-016`(계약) · `RN-REQ-001`(`packages/core`)
- **규칙:** `api-convention.md` · `rn-architecture.md`

## Open Questions

- 쿼리 캐시 persist 저장소. `AsyncStorage`에 **금액이 평문으로 남는다** — 기기 분실 시 노출된다. 비공개 초대제 앱이고 스크린샷 방지도 하지 않기로 했으므로 일관되지만, **금액 캐시만 secure store에 둘지** 검토 필요.
- `refetchOnAppFocus`가 데이터 사용량을 늘린다. 세금 화면은 자주 보지 않으므로 영향이 작다.
- `packages/core` 타입 공유 방법(`BFF-REQ-006` Open Question).
