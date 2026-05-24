---
name: validate
description: "Phase 3: SALT Server 타입, 빌드, API 계약, DB, 보안 영향을 검증한다"
---

# 3단계: 검증

## 기본 검증

변경 범위에 따라 실행한다.

```bash
cd salt-server
npm run prisma:generate
npm run build
```

## 정적 규칙 점검

- controller가 Prisma를 직접 호출하지 않는지 확인.
- route가 비즈니스 로직을 포함하지 않는지 확인.
- 요청 입력에 Zod DTO가 있는지 확인.
- 새 public endpoint에 Swagger JSDoc이 있는지 확인.
- Swagger가 route path, DTO, 응답 envelope과 일치하는지 확인.
- 목록 API에 페이지네이션 또는 `take` 제한이 있는지 확인.
- 루프 안 Prisma query로 N+1 query가 생기지 않는지 확인.
- 인증이 필요한 endpoint에 `authMiddleware`가 있는지 확인.
- 사용자 소유 리소스 query에 `userId` 조건이 있는지 확인.
- env 추가 시 `src/config/env.ts`가 갱신되었는지 확인.
- Prisma schema 변경 시 migration/generate/build 영향 확인.
- worker/external 변경 시 실패 처리와 로그 확인.

## 결과 보고

```text
## 검증 보고

| Check | Status | Details |
|---|---|---|
| Build | pass/fail/skipped | 내용 |
| Prisma Generate | pass/fail/skipped | 내용 |
| API Contract | pass/fail/skipped | DTO/Swagger/응답 |
| Auth/Security | pass/fail/skipped | 인증/인가/민감 정보 |
| DB Safety | pass/fail/skipped | migration/query/userId |
| Performance | pass/fail/skipped | N+1/pagination/select/batch |
| Worker/External | pass/fail/skipped | worker/외부 API 영향 |

## 오류
- 파일 — 에러 — 수정 제안
```
