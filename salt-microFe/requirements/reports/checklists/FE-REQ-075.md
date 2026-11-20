# FE-REQ-075 체크리스트 — 코인 등락 · 범위 이름표

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `domain-invest/src/pages/investment-detail/model/messages.ts` `statRange` · `statTradeValue` | [x] 1280 실화면 "당일 범위 · 24시간 거래대금" |
| FR-2 | 같은 파일 `metaDescription` · `pages/investments/model/metadata.ts` | [x] 메타 설명 "전일 대비 −0.19%" |
| FR-3 | `entities/market/model/types.ts` `SummaryChangeBasis.CryptoDay` · `messages.ts` · 소비처 셋(`MarketSummaryStrip` · `MarketSummaryCard` · `MarketBriefingPanel`) | [x] 요약 패널 "전일 대비" |
| FR-4 | `entities/market/model/messages.ts` `wide_move` · `entities/coach/model/messages.ts` `observedItem` | [x] |

| 검증 | 결과 |
|---|---|
| `pnpm check-types` · `lint` · `test` | 14 · 14 · 7 |
| 투자 zone 운영 빌드 · 1280 `/investments` · `/investments/BTC` | 통과 · 화면 "24시간" 0 · 페이지 오류 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 휴대폰 `/m` 상세 등락 줄 | 휴대폰 머리 등락 줄은 `FE-REQ-074`(PR #224)가 처음 만든다 — 그쪽에서 이미 "전일 대비" | #224 머지 |
| 시세 요약 칸 아래 "거래대금" | 틀리지 않다(24시간 값 · 창을 안 적었을 뿐) — 칸 폭이 좁아 그대로 | 필요하면 데스크톱 개편 REQ |
