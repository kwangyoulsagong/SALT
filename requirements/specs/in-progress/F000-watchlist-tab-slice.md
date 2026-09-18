---
id: SLICE-F000-WATCHLIST
title: "F000 관심 종목 탭 — 서버·BFF·프론트 수직 슬라이스"
priority: high
labels: [F000, slice, cross-area, contract, watchlist]
created: 2026-09-18
---

## Summary

`/investments` 의 **"관심 종목" 탭이 눌러도 빈 화면**이다. 서버에는 watchlist CRUD 가 있고
BFF 는 그것을 그대로 프록시하는데, 화면이 그 경로를 부르지 않는다. 이 슬라이스는 그 한 줄을
서버 → BFF → 프론트로 잇는다.

## Background

- 세 영역의 F000 REQ 는 **종류별로 쪼개져 있다**(`UI` · `FUNC` · `API` · `PERF`). 그래서
  "관심 종목 탭"이라는 하나의 사용자 가치는 REQ 세 개에 흩어져 있다. 이 문서는 그 부분집합을
  한 자리에 모아 **무엇이 이 브랜치의 범위인지**를 못 박는다. REQ 문서 자체는 옮기지 않는다 —
  각 REQ 에는 이 슬라이스가 건드리지 않는 FR 이 더 많다.
- 영역을 넘는 이유는 **계약 변경**이다(`pr-convention.md` §7). 관심 목록 응답 모양이 서버에서
  바뀌고, BFF 가 새 뷰모델 경로를 열고, 프론트가 그것을 소비한다. 영역별로 자르면 세 PR 중
  어느 것도 혼자서는 동작하지 않는다.

## 범위 — 각 REQ 의 어느 FR 인가

| 영역 | REQ | FR | 내용 |
|---|---|---|---|
| 서버 | `SRV-REQ-008` | FR-33 | 관심 목록 응답에 **현재가·변동률을 포함**한다. 화면이 별도 조회하지 않게 |
| 서버 | `SRV-REQ-008` | FR-30 (부분) | watchlist 유스케이스는 이미 `market` 컨텍스트에 있다. **동작을 바꾸지 않는다** |
| BFF | `BFF-REQ-007` | FR-40~43 | `/api/app/watchlist` 조립 · 가격 캐시 보정 · `priceStale` · 0건이면 빈 배열 |
| BFF | `BFF-REQ-008` | 신규 표 | `GET` `/api/app/watchlist` · `POST` · `DELETE /:id` |
| 프론트 | `FE-REQ-010` | FR-1 · FR-30~35 | 탭 본문 · 5개 표시 요소 · `지연` 배지 · 행 선택 · 별 동기화 · 색 토큰 |
| 프론트 | `FE-REQ-010` | FR-60·FR-61·FR-65 | 키보드 선택 · 행의 선택 가능 알림 · 별 `aria-label` |
| 프론트 | `FE-REQ-012` | 호출 배치 1행 | 관심 종목 = `/api/app/watchlist` (조회 + mutation) |

## 범위 밖 — 같은 REQ 안이지만 이 브랜치가 아니다

| 항목 | 왜 |
|---|---|
| `AssetType` 3값 확장 (`SRV-REQ-008` FR-32) | DB enum 이 `crypto`·`stock` 2값이다. 확장은 `DB-REQ-001`/`003` 이고 `ALTER TYPE` 락 측정이 따라온다 |
| 뉴스 프리뷰 실데이터 (FR-3/FR-22) | 별 판단이다. 같은 커밋에 섞으면 리뷰어가 둘 중 하나를 못 본다 |
| 하드코딩 시각 · 오타 · 반응형 · `period` 오타 (FE FR-2·4·7·8) | 이 탭과 무관한 수리 항목 |
| 동면 route 410 (`BFF-REQ-007` A절) | 이 슬라이스가 부르는 경로가 아니다 |
| `FilterTabs` `role="tablist"` (FR-63) | 실시간 탭의 필터에 걸린 항목이고 `@repo/ui` 제약 확인이 선행이다 |

## 계약

### 서버 `GET /api/investment/watchlist` (경로 유지, 응답 변경)

```jsonc
{ "success": true, "data": {
  "items": [{
    "id": "uuid", "assetType": "crypto", "symbol": "BTC", "name": "비트코인",
    "currentPrice": 158000000,      // number | null — Decimal 문자열이 아니다
    "priceChange24h": -1.23,        // number | null
    "priceUpdatedAt": "2026-09-18T02:00:00.000Z", // string | null
    "logoUrl": "https://…", "addedAt": "…"
  }],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}}
```

- **변경 전은 Prisma `Decimal` 이 JSON 문자열로 나갔고**(`"158000000"`), 행에 가격이 없으면
  `null` 이었다. 화면이 `toFixed` 를 부르면 그 자리에서 죽는다.
- 없거나 오래된 가격은 `market_assets` 의 **저장 시세로 보정**한다. 거래소를 부르지 않는다 —
  판단용 조회는 DB 값을 쓴다(`market/domain/ports.ts` `MarketAssetRepository.findQuotes`).

### BFF `GET /api/app/watchlist` (신규)

```jsonc
{ "items": [{
  "id": "uuid", "assetType": "crypto", "symbol": "BTC", "name": "비트코인",
  "currentPrice": 158000000, "changeRate": -1.23,
  "priceStale": false,            // 실시간 캐시에 없으면 true. 값은 서버 것을 쓴다
  "logoUrl": "https://…", "priceUpdatedAt": "…"
}] }
```

`POST /api/app/watchlist` `{ assetType, symbol, name }` → `201`,
`DELETE /api/app/watchlist/:id` → `204`.

## Acceptance Criteria

- [ ] 관심 종목 탭이 **빈 화면이 아니다**
- [ ] 목록에 종목명·심볼·현재가·변동률·자산군 배지·별(제거)이 있다
- [ ] `priceStale: true` 면 **"지연" 배지**가 붙는다
- [ ] 행을 누르면 우측 프리뷰가 그 종목으로 바뀐다 (실시간 탭과 같은 동작)
- [ ] 행 선택이 **키보드(Enter/Space)로도** 동작하고 `role`·`tabIndex` 가 있다
- [ ] 실시간 탭의 별과 관심 목록이 **같은 상태를 본다** — 추가/제거가 양쪽에 반영된다
- [ ] 별 버튼에 `aria-label` 이 있다
- [ ] 0건이면 빈 상태 문구가 나오고 **더미가 0건이다**
- [ ] 상승 `#FF2E55` / 하락 `#1677EE` 규칙이 실시간 테이블과 같다
- [ ] 서버 응답의 `currentPrice`·`priceChange24h` 가 **number 또는 null** 이다 (문자열 0건)
- [ ] 관심 목록이 0건이면 BFF 가 빈 배열을 준다
- [ ] 실시간 테이블 5컬럼·필터 3그룹·blink 2초·`limit=100` 이 그대로다 (변경 금지 목록)
- [ ] 세 영역 빌드·타입체크·lint 통과, `layer-check` 위반 0건

## Notes

- 뷰모델 타입은 BFF 가 소유하지만 `bff` 는 pnpm workspace 밖의 독립 npm 프로젝트라
  `@repo/core` 를 import 할 수 없다. 프론트가 `entities/market/model/types.ts` 에 같은 모양을
  선언하고, `@repo/core` 로 합치는 것은 `FE-REQ-024` 의 일이다(그 파일 상단 주석의 예고와 같다).
- 검증 결과는 루트 `requirements/reports/checklists/F000-watchlist-tab.md` 에 남긴다
  (`requirements/README.md` 워크플로 4).
