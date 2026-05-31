---
id: SRV-REQ-005
spec: ../../specs/done/SRV-REQ-005.md
title: Investment Coach Server > 신호 성과 추적
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/signal-performance` route 등록 | `salt-server/src/app.ts` | ✅ |
| 2 | query Zod 검증 | `signal-performance.dto.ts` | ✅ |
| 3 | 사용자 AI Coach insight 최대 100건 조회 | `take: 100` | ✅ |
| 4 | feedback insight 제외 | `payload.kind === "coach_feedback"` branch | ✅ |
| 5 | entry/latest 가격 비교로 returnRate 계산 | `signal-performance.service.ts` | ✅ |
| 6 | samples 최대 20개 반환 | `samples.slice(0, 20)` | ✅ |
| 7 | Prisma generate | `npm run prisma:generate` | ⚠️ `DATABASE_URL` 미설정으로 실패 |
| 8 | Server build | `npm run build` | ⚠️ 기존 타입 오류로 실패 |

## 검증 산출

```text
cd salt-server
npm run prisma:generate
# FAIL: Missing required environment variable: DATABASE_URL

npm run build
# FAIL: 기존 투자/포트폴리오 타입 오류
```
