---
id: BFF-REQ-003
spec: ../../specs/done/BFF-REQ-003.md
title: Investment Coach BFF > 행동 코치 화면 계약
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/app/behavior-coach` route 등록 | `bff/src/rest/app.ts`, `behavior-coach.routes.ts` | ✅ |
| 2 | 서버 `/behavior-coach`로 인증 프록시 | `app-behavior-coach.service.ts` | ✅ |
| 3 | `warnings[]`를 `cards[]`로 변환 | `cards: (data.warnings ?? []).map(...)` | ✅ |
| 4 | severity 80 이상 danger 변환 | `warning.severity >= 80 ? "danger" : "warning"` | ✅ |
| 5 | status/tags/recommendedRules/evidence 전달 | `get` return object | ✅ |
| 6 | BFF build | `npm run build` | ✅ |

## 검증 산출

```text
cd bff
npm run build
# OK
```
