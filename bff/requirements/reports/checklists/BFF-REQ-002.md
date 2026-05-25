---
id: BFF-REQ-002
spec: ../../specs/done/BFF-REQ-002.md
title: Investment Coach BFF > 외부 주문 전 체크 화면 계약
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/app/trade-preflight` route 등록 | `bff/src/rest/app.ts`, `trade-preflight.routes.ts` | ✅ |
| 2 | 서버 `/trade-preflight`로 인증 프록시 | `app-trade-preflight.service.ts` | ✅ |
| 3 | `orderExecution: false` 포함 | `app-trade-preflight.service.ts` | ✅ |
| 4 | checklist severity 변환 | `item.passed ? "ok" : "warning"` | ✅ |
| 5 | calculation/portfolioImpact/warnings/dataFreshness 전달 | `check` return object | ✅ |
| 6 | BFF build | `npm run build` | ✅ |

## 검증 산출

```text
cd bff
npm run build
# OK
```
