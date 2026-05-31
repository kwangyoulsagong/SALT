---
id: BFF-REQ-001
spec: ../../specs/done/BFF-REQ-001.md
title: Investment Coach BFF > AI Coach 화면 계약
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | preview/detail/profile/feedback/explain route 등록 | `bff/src/rest/routes/ai-coach.routes.ts` | ✅ |
| 2 | 인증 route는 `authMiddleware` 뒤에 배치 | `router.use(authMiddleware)` 이후 profile/feedback/preview/detail | ✅ |
| 3 | explain은 prototype public + 운영 전 TODO 표시 | `router.post("/explain", ...)` 주석 | ✅ |
| 4 | preview가 서버 `/ai-coach?symbol=&preview=true` 호출 | `app-ai-coach.service.ts` `getPreview` | ✅ |
| 5 | detail이 서버 AI Coach와 news를 조합 | `getDetail` | ✅ |
| 6 | decision card에 `score` 포함 | `mapDecision` | ✅ |
| 7 | 주문 실행 필드 미포함 | AI Coach view model | ✅ |
| 8 | BFF build | `npm run build` | ✅ |

## 검증 산출

```text
cd bff
npm run build
# OK
```
