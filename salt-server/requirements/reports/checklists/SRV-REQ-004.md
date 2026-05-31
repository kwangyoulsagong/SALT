---
id: SRV-REQ-004
spec: ../../specs/done/SRV-REQ-004.md
title: Investment Coach Server > 익절/손절 플랜
validated: 2026-05-25
---

## Checklist

| # | 요구사항 | 구현 위치 | 상태 |
|---|---|---|---|
| 1 | `/api/profit-plan` route 등록 | `salt-server/src/app.ts` | ✅ |
| 2 | query Zod 검증 | `profit-plan.dto.ts` | ✅ |
| 3 | 사용자 crypto holding 조회 | `profit-plan.service.ts` | ✅ |
| 4 | empty/active 상태 반환 | `status: plans.length ? "active" : "empty"` | ✅ |
| 5 | 단계형 손절/익절/추세 유지 plan 생성 | `stages` array | ✅ |
| 6 | 수익률별 status 구분 | status 계산식 | ✅ |
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
