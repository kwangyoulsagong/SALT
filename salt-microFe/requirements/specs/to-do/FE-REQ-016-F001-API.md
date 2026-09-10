---
id: FE-REQ-016
feature: F001
area: fe
kind: API
title: "F001 개입 청구서 — 웹 API 호출 계약 정의"
priority: critical
labels: [fe, api, fsd, rsc, upload, polling]
created: 2026-09-09
---

## Summary

청구서 화면의 BFF 호출. 조회는 서버 컴포넌트, **업로드와 키 등록은 클라이언트 mutation**, 계산 완료는 **폴링**이다.

## 호출 배치

| 화면 요소 | 호출 | 방식 | Suspense |
|---|---|---|---|
| 청구서 전체 | `GET /api/app/invoice?window` | 서버 컴포넌트 | 안 |
| 원장 건강도 | `GET /api/app/ledger/health` | 서버 컴포넌트 | 안 |
| 거래 목록 | `GET /api/app/invoice/trades?...` | 서버 컴포넌트 + 클라이언트 페이징 | 안 |
| CSV 업로드 | `POST /api/app/ledger/import` | **mutation (multipart)** | — |
| 실제 잔고 입력 | `POST /api/app/ledger/reported-balance` | mutation | — |
| 키 등록/삭제 | `POST/DELETE /api/app/ledger/keys` | mutation | — |
| 동기화 | `POST /api/app/ledger/sync` | mutation → 폴링 | — |
| 재계산 | `POST /api/app/invoice/recompute` | mutation → 폴링 | — |
| 결측/백필 | `GET /coverage` · `POST /backfill` | query + mutation | — |

## Requirements

### A. 조회

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 조회는 서버 컴포넌트에서 `shared/api` BFF 클라이언트로 | Must |
| FR-2 | **인증 토큰을 클라이언트로 내리지 않는다.** 쿠키 → 서버에서 BFF 호출 | Must |
| FR-3 | 청구서와 원장건강도를 **병렬**로 띄운다 | Must |
| FR-4 | `window`는 URL 쿼리에서 읽는다. 서버 컴포넌트가 그 값으로 호출 | Must |
| FR-5 | 조회 함수는 `entities/invoice/api/` · `entities/ledger/api/` | Must |

### B. 업로드 (multipart)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 업로드는 클라이언트 mutation이다. **서버 컴포넌트에서 할 수 없다**(파일이 브라우저에 있다) | Must |
| FR-11 | `FormData`로 전송. `tradesCsv` 필수, `cashflowCsv` 선택, `source` 지정 | Must |
| FR-12 | **크기(20MB)·확장자·MIME을 클라이언트에서 먼저 검사**한다 | Must |
| FR-13 | `AbortSignal`로 취소 가능 | Must |
| FR-14 | 진행률은 `XMLHttpRequest.upload.onprogress` 또는 `fetch` 스트림으로. **없으면 스피너만** | Should |
| FR-15 | 재시도 0회 | Must |
| FR-16 | 성공 시 관련 쿼리 무효화 + `router.refresh()`로 서버 컴포넌트 재조회 | Must |

### C. 폴링 — 계산 완료 대기

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `recompute`·`sync`·`import` 후 반사실 계산이 비동기로 돈다. **`GET /api/app/invoice`를 폴링**해 `degradedReasons`에 `snapshot_missing`이 사라지는지 본다 | Must |
| FR-21 | 폴링 간격 2초, **최대 30회(60초)**. 초과 시 중단하고 재시도 버튼 | Must |
| FR-22 | **중단 조건을 반드시 둔다**: 완료 · 실패 · 화면 이탈(언마운트) | Must |
| FR-23 | 폴링 중 화면은 마지막 스냅샷을 보여준다. 스켈레톤으로 되돌리지 않는다 | Must |
| FR-24 | 탭이 백그라운드면 폴링을 멈춘다(`document.visibilityState`) | Should |

### D. 키 등록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | mutation. 재시도 0회 | Must |
| FR-31 | **secret을 요청 본문에만** 담고 상태·로컬스토리지·URL에 남기지 않는다 | Must |
| FR-32 | `403 SCOPE_NOT_ALLOWED`를 **정상 응답 경로**로 처리한다(오류 토스트가 아니라 안내 화면) | Must |
| FR-33 | 성공 후 `accessKeyMasked`·`scopes`를 표시하고 입력 필드를 비운다 | Must |

### E. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `413` → "파일이 너무 큽니다(최대 20MB)" | Must |
| FR-41 | `422` → 실패 행 표시 | Must |
| FR-42 | `403 SCOPE_NOT_ALLOWED` → FR-32 | Must |
| FR-43 | 블록 조회 실패는 error boundary가 잡는다 | Must |
| FR-44 | HTTP 상태 → 문구 매핑은 `shared/i18n`. `shared/api`가 정규화 | Must |
| FR-45 | 서버 에러 원문을 화면에 노출하지 않는다 | Must |

### F. 타입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 뷰모델 타입은 `packages/core`에서. 프론트 재정의 0건 | Must |
| FR-51 | 열거값은 `enum`. 리터럴 union 금지 | Must |
| FR-52 | `any` 0건 | Must |
| FR-53 | `reconciliation`·`topGains`가 **옵셔널이 아닌 필수 필드**로 타입 정의된다. 누락이 컴파일에서 잡혀야 한다 | Must |

## Acceptance Criteria

- [ ] 조회가 전부 서버 컴포넌트에서 일어난다
- [ ] 토큰이 클라이언트 번들·`localStorage`에 0건이다
- [ ] 청구서와 원장건강도가 병렬로 호출된다
- [ ] `window`가 URL 쿼리에서 읽힌다
- [ ] 업로드가 `FormData` mutation이고 재시도가 0건이다
- [ ] 20MB 초과·비CSV 파일이 클라이언트에서 걸러진다
- [ ] 업로드가 취소 가능하다
- [ ] 업로드 성공 후 쿼리 무효화 + 서버 컴포넌트 재조회가 일어난다
- [ ] 폴링이 2초 간격 최대 30회다
- [ ] **폴링에 중단 조건 3개(완료·실패·언마운트)가 있다**
- [ ] 폴링 중 마지막 스냅샷이 표시된다 (스켈레톤 0건)
- [ ] secret이 상태·스토리지·URL에 0건이다
- [ ] `403 SCOPE_NOT_ALLOWED`가 안내 화면으로 처리된다
- [ ] 성공 후 입력 필드가 비워진다
- [ ] `413`·`422`·`403`이 각각 다른 문구로 처리된다
- [ ] 블록 실패가 error boundary에서 잡힌다
- [ ] 서버 에러 원문이 화면에 0건이다
- [ ] 뷰모델 타입이 `packages/core`에서 온다
- [ ] 리터럴 union 0건, `any` 0건
- [ ] **`reconciliation`·`topGains`를 옵셔널로 바꾸면 컴파일이 실패한다**

## Dependencies

- **선행:** `BFF-REQ-012` · `FE-REQ-008`(RSC) · `FE-REQ-009`(FSD)
- **규칙:** `api-convention.md` · `streaming-ssr.md`

## Open Questions

- 업로드 진행률을 알 수 있는가. BFF가 스트리밍 프록시하므로 **서버 진행은 모르고 업로드 진행만** 안다 → 업로드 후 "처리 중"은 진행률 없이 스피너.
- 폴링 대신 알림·SSE로 완료를 받을지(`BFF-REQ-011` Open Question).
- 쿠키 인증 전환 시점(`FE-REQ-008` Open Question).
