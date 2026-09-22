# SRV-REQ-036 (F006 MARKET SUMMARY) — 검증 체크리스트

- 브랜치 `feat/fe-market-summary-strip` · 2026-09-22 · 상태 **in-progress**(머지 후 done)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 경로 · 모양 | pass | `market/presentation/investment.routes.ts` · `investment.controller.ts` `getMarketSummary`. 로컬 실측 BFF 경유 200 |
| FR-2 설정 · 순서 · 빈 값 기동 실패 | pass | `shared/config/env.ts` zod `.min(1)`. 테스트 "설정 순서대로" · "대표가 없으면 null" |
| FR-3 `wide_move` | pass | `domain/MarketSummary.ts` `summaryTagsOf` + 테스트 2 |
| FR-4 등락 금액 | pass | `change24hAmountOf` + 테스트 4. 실측 BTC −2,039,000(저장 시세 기준) |
| FR-5 스파크라인 캐시 · 부분 실패 | pass | 테스트 "1분 캐시" · "한 종목 실패는 그 항목만" |
| FR-6 저장 시세 | pass | `findViews` — 거래소 호출은 스파크라인뿐 |

게이트: `npm run build` pass · `npm test` **250/250**(신규 11) · `layer-check` 사후 실행 pass.

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 거래소 초당 제한에서 동시 7건 | 로컬 1회 호출은 통과. 캐시 만료 시각이 겹치면 7건이 한 번에 나간다(`pacer` 경유 여부 미확인) | 운영 로그 관찰 |
| 저장 시세가 오래됐을 때 | 요약은 배경 갱신을 하지 않는다 | REQ 범위 밖 표 |
