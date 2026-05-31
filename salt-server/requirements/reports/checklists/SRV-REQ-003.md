---
id: SRV-REQ-003
spec: ../../specs/done/SRV-REQ-003.md
title: Investment Coach Server > 행동 코치
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/behavior-coach` route 등록 | `salt-server/src/app.ts` | ✅ |
| 2 | 인증 사용자 기준 동작 | `behavior-coach.controller.ts`, `behavior-coach.service.ts` | ✅ |
| 3 | 행동 분석 생성 호출 | `generateBehaviorAnalysis(userId)` | ✅ |
| 4 | 거래 3건 미만 insufficient_data 처리 | `txCount < 3` branch | ✅ |
| 5 | active/stable 상태 구분 | service return object | ✅ |
| 6 | recommendedRules 생성 | `buildRules` | ✅ |
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
