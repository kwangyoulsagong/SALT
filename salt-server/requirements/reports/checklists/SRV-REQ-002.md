---
id: SRV-REQ-002
spec: ../../specs/done/SRV-REQ-002.md
title: Investment Coach Server > 외부 주문 전 체크
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/trade-preflight` route 등록 | `salt-server/src/app.ts` | ✅ |
| 2 | body Zod 검증 | `trade-preflight.dto.ts` | ✅ |
| 3 | 사용자 portfolio/profile/market 조회 | `trade-preflight.service.ts` | ✅ |
| 4 | 손익비/최대손실/비중 계산 | `calculation` object | ✅ |
| 5 | stop/risk_reward/concentration checklist 생성 | `checklist` array | ✅ |
| 6 | `orderExecution: false` 포함 | service return object | ✅ |
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
