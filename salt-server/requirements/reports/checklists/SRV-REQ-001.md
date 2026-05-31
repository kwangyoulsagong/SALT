---
id: SRV-REQ-001
spec: ../../specs/done/SRV-REQ-001.md
title: Investment Coach Server > AI Coach 점수 기반 판단
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/ai-coach` route 등록 | `salt-server/src/app.ts` | ✅ |
| 2 | DTO를 Zod로 검증 | `ai-coach.dto.ts` | ✅ |
| 3 | 인증 route는 `authMiddleware` 뒤에 배치 | `ai-coach.routes.ts` | ✅ |
| 4 | 후보별 `score` 계산 | `ai-coach-score.engine.ts` | ✅ |
| 5 | payload에 recommendation/candidates score 포함 | `ai-coach-explainer.ts` | ✅ |
| 6 | profile 조회/저장 구현 | `AIInvestmentCoachService.getProfile/updateProfile` | ✅ |
| 7 | feedback을 `coach_feedback` insight로 기록 | `recordFeedback` | ✅ |
| 8 | explain public TODO 표시 | `ai-coach.routes.ts` | ✅ |
| 9 | Prisma generate | `npm run prisma:generate` | ⚠️ `DATABASE_URL` 미설정으로 실패 |
| 10 | Server build | `npm run build` | ⚠️ 기존 portfolio/whale/rebalance 타입 오류로 실패 |

## 검증 산출

```text
cd salt-server
npm run prisma:generate
# FAIL: Missing required environment variable: DATABASE_URL

npm run build
# FAIL: portfolio-rebalance.service.ts, whale-signal.service.ts,
# portfolio.service.ts 기존 타입 오류
```
