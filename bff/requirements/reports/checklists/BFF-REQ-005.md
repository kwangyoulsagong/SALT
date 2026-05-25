---
id: BFF-REQ-005
spec: ../../specs/done/BFF-REQ-005.md
title: Investment Coach BFF > 신호 성과 화면 계약
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/app/signal-performance` route 등록 | `bff/src/rest/app.ts`, `signal-performance.routes.ts` | ✅ |
| 2 | 서버 `/signal-performance`로 인증 프록시 | `app-signal-performance.service.ts` | ✅ |
| 3 | query string을 `URLSearchParams`로 구성 | `new URLSearchParams()` | ✅ |
| 4 | 통계 필드를 `metrics`로 변환 | `metrics: { sampleCount, winRate, avgReturn, maxDrawdown }` | ✅ |
| 5 | samples/generatedAt 전달 | `get` return object | ✅ |
| 6 | BFF build | `npm run build` | ✅ |

## 검증 산출

```text
cd bff
npm run build
# OK
```
