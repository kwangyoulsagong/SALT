---
id: BFF-REQ-004
spec: ../../specs/done/BFF-REQ-004.md
title: Investment Coach BFF > 익절/손절 플랜 화면 계약
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/app/profit-plan` route 등록 | `bff/src/rest/app.ts`, `profit-plan.routes.ts` | ✅ |
| 2 | 서버 `/profit-plan`로 인증 프록시 | `app-profit-plan.service.ts` | ✅ |
| 3 | optional symbol 대문자 정규화 | `query.symbol.toString().toUpperCase()` | ✅ |
| 4 | 서버 `plans[]`를 `cards[]`로 변환 | `cards: (data.plans ?? []).map(...)` | ✅ |
| 5 | profitRate/stages/warnings/generatedAt 전달 | card mapping | ✅ |
| 6 | BFF build | `npm run build` | ✅ |

## 검증 산출

```text
cd bff
npm run build
# OK
```
