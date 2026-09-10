---
id: BFF-REQ-016
feature: F002
area: bff
kind: API
title: "F002 세금 마감 콕핏 — 프론트 대면 계약 정의"
priority: critical
labels: [bff, api, contract, viewmodel, tax]
created: 2026-09-09
---

## Summary

세금 화면이 쓰는 뷰모델 계약. **웹은 블록별, 모바일은 집계 1콜**이고 두 형태를 같은 블록 함수에서 만든다.

## 엔드포인트

| Method | Path | 용도 | 소비자 |
|---|---|---|---|
| GET | `/api/app/tax/deadlines` | D-Day만 | 웹(Suspense 밖) · 홈 블록 |
| GET | `/api/app/tax/cockpit` | **집계 1콜** | 모바일 |
| GET | `/api/app/tax/cockpit/us-stock` | 블록 | 웹 |
| GET | `/api/app/tax/cockpit/crypto` | 블록 | 웹 |
| GET | `/api/app/tax/cockpit/kr-stock` | 블록 | 웹 |
| GET | `/api/app/tax/cockpit/archive` | 블록 | 웹 |
| GET | `/api/app/tax/fx-trap` | 환율 함정 | 웹 · 모바일 |
| POST | `/api/app/tax/harvest-solve` | 솔버 | 사용자 요청 시 |
| POST | `/api/app/tax/crypto-scenario` | 3열 + 파라미터 | 슬라이더 초기값 |
| POST | `/api/app/tax/archive/download` | 서명 URL | |
| GET/PATCH | `/api/app/tax/law-config` | 법령 파라미터 | 설정 화면 |
| POST | `/api/app/tax/snapshot/manual` | 수동 입력 | 수집 실패 시 |

## 뷰모델

```ts
type TaxCockpitViewModel = {
  taxYear: number;
  asOf: string;
  degradedBlocks: string[];
  unsupported: string[];

  deadlines: {
    items: Array<{
      assetClass: 'crypto' | 'kr_stock' | 'us_stock';
      taxable: boolean;
      lastTradeDate: string | null;
      recommendedDate: string | null;
      settlementBasis: string | null;
      daysRemaining: number | null;
      noteCode: string;
      lawStatus: 'enforced' | 'under_review' | 'deferred' | 'repealed';
    }>;
    status: 'ok' | 'unavailable';
  };

  usStock: { /* SRV 계약과 동일 */ status: 'ok' | 'unavailable' } | null;
  crypto:  { /* SRV 계약 + holdings[].scenarioParams */ status: 'ok' | 'unavailable' } | null;
  krStock: { /* SRV 계약 */ status: 'ok' | 'unavailable' } | null;
  archive: { files[]; snapshotStatus; snapshotScheduledAt; status } | null;
  fxTrap:  { items: FxTrapItem[]; status } | null;

  lawConfigShown: Record<string, string | number>;
  disclaimer: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 블록별 엔드포인트와 집계 엔드포인트가 **같은 뷰모델 조각**을 반환한다. 필드명이 갈리지 않는다 | Must |
| FR-2 | 블록마다 `status: 'ok' \| 'unavailable'`이 있다 | Must |
| FR-3 | `degradedBlocks[]`가 최상위에 있다 | Must |
| FR-4 | **`lawConfigShown`과 `disclaimer`를 모든 세금 응답에 포함**한다. 블록 엔드포인트에도 | Must |
| FR-5 | `daysRemaining`이 `null`일 수 있다(비과세 자산군·법령 미시행). 화면이 그것을 처리해야 한다 | Must |
| FR-6 | `taxable: false`(국내주식)면 **양도차익 필드가 아예 없다** | Must |
| FR-7 | 금액은 원 단위 정수. 서버가 반올림한 값을 그대로 전달한다 | Must |
| FR-8 | `crypto.holdings[].scenarioParams`를 **누락 없이** 전달한다 | Must |
| FR-9 | `403 SNAPSHOT_IMMUTABLE`을 그대로 전달한다. BFF가 200으로 바꾸지 않는다 | Must |
| FR-10 | 서명 URL은 응답에 그대로 담고 **BFF가 프록시하지 않는다.** 파일이 BFF를 통과하면 메모리를 먹는다 | Must |
| FR-11 | `law-config` PATCH 후 `recalculated: true`를 전달한다. 화면이 재조회한다 | Must |
| FR-12 | 뷰모델 타입을 `packages/core`로 공유한다 | Should |

## Acceptance Criteria

- [ ] 엔드포인트 12개가 등록된다
- [ ] 블록 엔드포인트 4개의 합이 집계 엔드포인트 응답과 **필드 단위로 동일**하다
- [ ] 블록마다 `status`가 있다
- [ ] `degradedBlocks[]`가 최상위에 있다
- [ ] 블록 엔드포인트에도 `lawConfigShown`·`disclaimer`가 있다
- [ ] `krStock` 응답에 양도차익 필드가 0건이다
- [ ] 금액이 전부 정수다
- [ ] `scenarioParams`에 `roundingMode`가 포함된다
- [ ] `snapshot/manual` 2회 호출 시 403이 그대로 전달된다
- [ ] 서명 URL이 응답에 담기고 파일이 BFF를 통과하지 않는다
- [ ] `law-config` PATCH 후 `recalculated: true`다
- [ ] `GET /api/app/tax/deadlines`가 100ms 이내에 응답한다

## Dependencies

- **선행:** `BFF-REQ-015`(조립 로직) · `SRV-REQ-017`
- **소비:** `FE-REQ-020`(F002 API) · `RN-REQ-014`(F002 API)
- **규칙:** `bff-architecture.md` · `rest-contract.md`

## Open Questions

- 블록 엔드포인트가 4개면 **토큰 검증이 4회** 일어난다. 사용자 ≤10명이면 무시할 수 있지만 측정 후 판단.
- `packages/core` 타입 공유 방법(BFF가 `salt-microFe` workspace 밖이다) — `BFF-REQ-006` Open Question과 동일.
