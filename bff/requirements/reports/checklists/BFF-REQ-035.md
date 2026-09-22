# BFF-REQ-035 (F006 MARKET SUMMARY) — 검증 체크리스트

- 브랜치 `feat/fe-market-summary-strip` · 2026-09-22 · 상태 **in-progress**(머지 후 done)

| FR | 판정 | 근거 |
|---|---|---|
| FR-1 공개 · `/:symbol` 앞 | pass | `rest/routes/market.routes.ts`. 토큰 없이 `curl localhost:4001/api/app/market/summary` 200 |
| FR-2 뷰모델 · 계산 없음 | pass | `services/market-summary.viewmodel.ts` + 테스트 4 |
| FR-3 에러 | pass | 컨트롤러 `next(error)` — error middleware |
| FR-4 WS 등락 금액 | pass | `services/upbit-ws.service.ts`. 실측 `price_update` `change24hAmount: -2125000` |

게이트: `npm run build` pass · `npm test` **77/77**(신규 6).

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 서버 5xx · 타임아웃 시 502/504 실측 | 서버를 내려 보지 않았다(코드상 기존 error middleware) | 다음 BFF 장애 스모크 |
| 계약 사본 두 곳(BFF 뷰모델 · 프론트 타입) | `bff` 가 workspace 밖(`BFF-REQ-008` FR-13 과 같은 사정) | `packages/core` 공유 시 |
