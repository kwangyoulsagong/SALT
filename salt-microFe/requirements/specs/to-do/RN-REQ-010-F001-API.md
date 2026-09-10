---
id: RN-REQ-010
feature: F001
area: rn
kind: API
title: "F001 개입 청구서 — 모바일 API 호출 계약 정의"
priority: critical
labels: [rn, api, react-query, multipart, polling, offline]
created: 2026-09-09
---

## Summary

모바일은 **집계 1콜**을 쓰고, 업로드는 **URI 기반 multipart**, 계산 완료는 **폴링**이다. 오프라인 persist가 웹과 가장 다른 점이다.

## 호출 배치

| 화면 요소 | 호출 | 방식 |
|---|---|---|
| 청구서 전체 | `GET /api/app/invoice?window` | React Query, `staleTime: 10m` |
| 원장 건강도 | `GET /api/app/ledger/health` | React Query, `staleTime: 5m` |
| 거래 목록 | `GET /api/app/invoice/trades?...` | `useInfiniteQuery` |
| CSV 업로드 | `POST /api/app/ledger/import` | mutation (multipart, URI) |
| 실제 잔고 | `POST /api/app/ledger/reported-balance` | mutation |
| 키 등록/삭제 | `POST/DELETE /api/app/ledger/keys` | mutation |
| 동기화 | `POST /api/app/ledger/sync` | mutation → 폴링 |
| 재계산 | `POST /api/app/invoice/recompute` | mutation → 폴링 |

## Requirements

### A. 조회

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 청구서는 **집계 1콜**이다. 블록별로 나누지 않는다(RSC 없음) | Must |
| FR-2 | `staleTime`을 명시한다. 청구서 10분, 원장건강도 5분 | Must |
| FR-3 | 청구서와 원장건강도를 **병렬**로 띄운다 | Must |
| FR-4 | 조회 훅은 `entities/invoice/api/` · `entities/ledger/api/` | Must |
| FR-5 | `window`별로 쿼리 키를 분리한다. 기간 전환이 캐시를 재사용한다 | Must |

### B. 오프라인 persist

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 쿼리 캐시를 persist한다. 저장소는 `AsyncStorage` | Must |
| FR-11 | **토큰은 `AsyncStorage`가 아니라 secure store**다. 캐시와 토큰 저장소를 혼동하지 않는다 | Must |
| FR-12 | persist 크기를 제한한다. **`series`가 수백 점 × window 5개**면 커진다 | Must |
| FR-13 | 오프라인에서 조회는 캐시를 반환하고 `dataUpdatedAt`을 배너에 쓴다 | Must |
| FR-14 | **`mutationCache` 재생(오프라인 큐)을 쓰지 않는다** | Must |
| FR-15 | 온라인 복귀 시 조회만 재개한다 | Must |
| FR-16 | 백그라운드 복귀 시 stale이면 재조회한다 | Must |

### C. 업로드 (URI multipart)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | `FormData`에 `{ uri, name, type }`을 넣는다. **파일 내용을 읽지 않는다** | Must |
| FR-21 | 크기·확장자·MIME을 선택 직후 검사한다 | Must |
| FR-22 | 재시도 0회. `AbortSignal`로 취소 | Must |
| FR-23 | 업로드 진행률을 표시한다(`XMLHttpRequest.upload.onprogress` 또는 `expo-file-system` upload) | Should |
| FR-24 | 성공 시 청구서·원장·포지션 쿼리 무효화 | Must |
| FR-25 | **백그라운드 전환 시 요청이 중단된다.** 중단을 감지해 사용자에게 알린다 | Must |

### D. 폴링

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `recompute`·`sync`·`import` 후 청구서를 폴링해 `snapshot_missing`이 사라지는지 본다 | Must |
| FR-31 | 간격 2초, 최대 30회 | Must |
| FR-32 | **중단 조건 4개**: 완료 · 실패 · 언마운트 · **백그라운드 전환** | Must |
| FR-33 | 폴링 중 마지막 캐시를 보여준다 | Must |
| FR-34 | 폴링 요청에 `AbortSignal` | Must |

### E. 키 등록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | mutation. 재시도 0회 | Must |
| FR-41 | **secret을 요청 본문에만** 담고 상태·저장소·로그에 남기지 않는다 | Must |
| FR-42 | `403 SCOPE_NOT_ALLOWED`를 정상 응답 경로로 처리한다 | Must |
| FR-43 | 성공 후 입력을 비우고 `accessKeyMasked`만 표시 | Must |

### F. 에러 처리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | `413` → "파일이 너무 큽니다(최대 20MB)" | Must |
| FR-51 | `422` → 실패 행 표시 | Must |
| FR-52 | `403 SCOPE_NOT_ALLOWED` → FR-42 | Must |
| FR-53 | 네트워크 오류는 오프라인 배너와 구분한다. **오프라인과 서버 장애는 다른 안내**다 | Must |
| FR-54 | HTTP → 문구 매핑은 `shared/i18n`. `shared/api`가 정규화 | Must |
| FR-55 | 서버 에러 원문을 화면에 노출하지 않는다 | Must |

### G. 타입

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 뷰모델 타입은 `packages/core`에서 웹과 공유 | Must |
| FR-61 | 열거값은 `enum`. 리터럴 union 금지 | Must |
| FR-62 | `any` 0건 | Must |
| FR-63 | `reconciliation`·`topGains`가 **필수 필드**다. 옵셔널로 바꾸면 컴파일 실패 | Must |

## Acceptance Criteria

- [ ] 청구서가 집계 1콜로 렌더된다 (요청 1건)
- [ ] `staleTime`이 명시되어 있다
- [ ] 청구서와 원장건강도가 병렬로 호출된다
- [ ] `window`별 쿼리 키가 분리되고 기간 전환이 캐시를 재사용한다
- [ ] 쿼리 캐시가 persist되고 오프라인에서 반환된다
- [ ] **토큰이 secure store에 있고 `AsyncStorage`에 0건이다**
- [ ] persist 크기가 제한된다
- [ ] `dataUpdatedAt`이 오프라인 배너에 쓰인다
- [ ] **오프라인 mutation 큐가 0건이다**
- [ ] 온라인 복귀 시 조회만 재개된다
- [ ] 백그라운드 복귀 시 stale 데이터가 재조회된다
- [ ] 업로드가 URI 기반 `FormData`이고 **파일 내용을 읽지 않는다**
- [ ] 업로드 재시도 0회, 취소 가능
- [ ] 업로드 성공 후 3개 쿼리가 무효화된다
- [ ] 백그라운드 전환 시 업로드 중단이 감지되고 알려진다
- [ ] 폴링이 2초 간격 최대 30회다
- [ ] **폴링 중단 조건 4개가 있다**
- [ ] 폴링 중 마지막 캐시가 표시된다
- [ ] secret이 상태·저장소·로그에 0건이다
- [ ] `403 SCOPE_NOT_ALLOWED`가 정상 경로로 처리된다
- [ ] `413`·`422`·`403`이 각각 다른 문구로 처리된다
- [ ] **오프라인과 서버 장애가 다른 안내로 구분된다**
- [ ] 서버 에러 원문이 화면에 0건이다
- [ ] 뷰모델 타입이 `packages/core`에서 온다
- [ ] 리터럴 union 0건, `any` 0건
- [ ] `reconciliation`·`topGains`를 옵셔널로 바꾸면 컴파일이 실패한다

## Dependencies

- **선행:** `BFF-REQ-012` · `RN-REQ-001`(`packages/core`)
- **규칙:** `api-convention.md` · `rn-architecture.md`

## Open Questions

- persist에 금액이 평문으로 남는다(`RN-REQ-014` Open Question과 동일). 기기 분실 시 노출된다.
- 업로드 진행률 구현 방법. `expo-file-system`의 upload API가 진행률을 주는지 확인 필요.
- persist 크기 제한을 어떻게 걸지. window 5개 중 **기본(180)만 persist**하는 것이 기본안.
