---
id: FE-REQ-020
feature: F002
area: fe
kind: API
title: "F002 세금 마감 콕핏 — 웹 API 호출 계약 정의"
priority: critical
labels: [fe, api, fsd, rsc, react-query]
created: 2026-09-09
---

## Summary

세금 화면이 BFF를 부르는 방식. **조회는 서버 컴포넌트, mutation은 React Query**다. D-Day는 Suspense 밖에서 먼저 받는다.

## 호출 배치

| 화면 요소 | 호출 | 어디서 | Suspense |
|---|---|---|---|
| D-Day 칩 | `GET /api/app/tax/deadlines` | 서버 컴포넌트 | **밖** (즉시) |
| 미국주식 카드 | `GET /api/app/tax/cockpit/us-stock` | 서버 컴포넌트 | 안 |
| 크립토 카드 | `GET /api/app/tax/cockpit/crypto` | 서버 컴포넌트 | 안 |
| 국내주식 카드 | `GET /api/app/tax/cockpit/kr-stock` | 서버 컴포넌트 | 안 |
| 증빙 | `GET /api/app/tax/cockpit/archive` | 서버 컴포넌트 | 안 |
| 환율 함정 | `GET /api/app/tax/fx-trap` | 서버 컴포넌트 | 안 |
| 손실수확 솔버 | `POST /api/app/tax/harvest-solve` | **React Query mutation** | — |
| 슬라이더 대조 | `POST /api/app/tax/crypto-scenario` | React Query mutation | — |
| 증빙 다운로드 | `POST /api/app/tax/archive/download` | React Query mutation | — |
| 법령 파라미터 | `GET/PATCH /api/app/tax/law-config` | 서버 조회 + mutation | — |
| 수동 스냅샷 | `POST /api/app/tax/snapshot/manual` | React Query mutation | — |

## Requirements

### A. 조회는 서버 컴포넌트

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 조회는 **서버 컴포넌트에서 `shared/api`의 BFF 클라이언트**로 부른다. 클라이언트 컴포넌트에서 조회하지 않는다 | Must |
| FR-2 | **인증 토큰을 클라이언트로 내리지 않는다.** 쿠키에서 읽어 서버에서 BFF를 부른다 | Must |
| FR-3 | 블록별 호출을 **병렬**로 띄운다. `await`를 연달아 쓰면 서버 워터폴이 된다 | Must |
| FR-4 | `deadlines`는 Suspense 밖에서 `await`한다. 100ms 예산이므로 기다려도 된다 | Must |
| FR-5 | 조회 함수는 `entities/tax/api/`에 둔다. 슬라이스 barrel로만 접근 | Must |

### B. mutation은 React Query

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | mutation 훅은 `features/{slice}/api/`에 둔다: `useSolveHarvest` · `useSimulateScenario` · `useDownloadEvidence` · `useUpdateLawConfig` · `useSubmitManualSnapshot` | Must |
| FR-11 | mutation은 **재시도하지 않는다** | Must |
| FR-12 | 솔버 mutation 결과를 **캐시하지 않는다**(`gcTime: 0`) | Must |
| FR-13 | `useUpdateLawConfig` 성공 시 **라우트 전체를 재검증**한다(`router.refresh()`). 법령 변경은 화면 전부에 영향한다 | Must |
| FR-14 | 긴 요청(솔버 2s)에 `AbortSignal`을 연결한다. 화면을 떠난 뒤 도는 요청이 서버 CPU를 먹는다 | Must |
| FR-15 | `staleTime`을 명시한다. 기본값 0이면 포커스마다 재요청한다 | Must |

### C. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `403 SNAPSHOT_IMMUTABLE` → "이미 수집된 시가는 변경할 수 없습니다" | Must |
| FR-21 | `403 SCOPE_NOT_ALLOWED` → 거래소 키 화면으로 안내 | Must |
| FR-22 | 블록 조회 실패는 **error boundary가 잡는다.** 화면 전체를 죽이지 않는다 | Must |
| FR-23 | 타임아웃은 재시도 버튼으로 처리한다. 자동 재시도는 조회 1회까지 | Must |
| FR-24 | HTTP 상태 → 문구 매핑은 `shared/i18n`에 있다. `shared/api`가 에러를 정규화한다 | Must |

### D. 서명 URL

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `archive/download` 응답의 `signedUrl`로 **브라우저가 직접 받는다.** 프론트가 파일을 메모리에 올리지 않는다 | Must |
| FR-31 | `expiresAt`을 표시한다. 만료 후 재요청 안내 | Must |
| FR-32 | 다운로드 실패(만료)를 처리하고 재발급 버튼을 준다 | Must |

### E. 타입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 뷰모델 타입은 **BFF가 소유한 계약**이다. `packages/core`에서 가져온다. 프론트가 다시 정의하지 않는다 | Must |
| FR-41 | 열거값은 `enum`이다. 문자열 리터럴 union 금지 | Must |
| FR-42 | `any` 0건. 응답 파싱에 타입 가드를 둔다 | Must |
| FR-43 | `scenarioParams` 타입이 클라이언트 재계산 함수의 입력 타입과 **정확히 같아야** 한다. 필드 누락이 컴파일에서 잡혀야 한다 | Must |

## Acceptance Criteria

- [ ] 조회가 전부 서버 컴포넌트에서 일어난다 (클라이언트 조회 0건)
- [ ] 인증 토큰이 클라이언트 JS 번들과 `localStorage`에 0건이다
- [ ] 블록 호출이 병렬이다 (`await` 연쇄 0건)
- [ ] `deadlines`가 Suspense 밖에서 먼저 온다
- [ ] mutation 훅 5개가 `features/*/api/`에 있다
- [ ] mutation 재시도가 0건이다
- [ ] 솔버 결과가 캐시되지 않는다
- [ ] `useUpdateLawConfig` 성공 시 라우트가 재검증된다
- [ ] 솔버 요청에 `AbortSignal`이 연결된다 (화면 이탈 시 취소 확인)
- [ ] `staleTime`이 명시되어 있다
- [ ] `403` 2종이 각각 다른 문구로 처리된다
- [ ] 블록 조회 실패가 error boundary에서 잡히고 화면 전체가 살아 있다
- [ ] 서명 URL로 브라우저가 직접 받고 프론트 메모리를 쓰지 않는다
- [ ] `expiresAt`이 표시되고 만료 시 재발급 버튼이 있다
- [ ] 뷰모델 타입이 `packages/core`에서 온다 (프론트 재정의 0건)
- [ ] 문자열 리터럴 union 열거값이 0건, `any`가 0건이다
- [ ] `scenarioParams` 필드를 하나 지우면 **컴파일이 실패한다**

## Dependencies

- **선행:** `BFF-REQ-016`(계약) · `FE-REQ-008`(RSC) · `FE-REQ-009`(FSD)
- **규칙:** `api-convention.md` · `streaming-ssr.md`

## Open Questions

- `packages/core` 타입 공유 방법(`BFF-REQ-006` Open Question).
- 쿠키 기반 인증 전환 시점(`FE-REQ-008` Open Question). 그때까지 서버 컴포넌트가 토큰을 어떻게 얻을지.
- 클라이언트 재계산에 `Decimal` 라이브러리가 필요한가. 필요하면 번들 증가분을 측정해야 한다.
