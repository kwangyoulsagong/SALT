# 검증 규칙

## 기본 명령

변경 범위에 따라 아래 명령을 실행한다.

```bash
cd salt-server
npm run build
npm run prisma:generate
```

DB schema 또는 Prisma Client 영향이 있으면 `npm run prisma:generate`를 먼저 실행한 뒤 build를 확인한다.

## 정적 점검

- controller가 Prisma를 직접 호출하지 않는지 확인한다.
- route가 비즈니스 로직을 포함하지 않는지 확인한다.
- 요청 입력에 Zod schema가 있는지 확인한다.
- 새 endpoint에 Swagger JSDoc이 있는지 확인한다.
- Swagger가 `.claude/rules/swagger.md`의 경로/DTO/응답 규칙과 맞는지 확인한다.
- 목록 API에 페이지네이션 또는 `take` 제한이 있는지 확인한다.
- 루프 안에서 Prisma query를 반복하는 N+1 패턴이 없는지 확인한다.
- 인증 endpoint에 `authMiddleware`가 연결되어 있는지 확인한다.
- 사용자 소유 데이터 query에 `userId` 조건이 있는지 확인한다.
- env 추가 시 `src/config/env.ts` schema가 갱신되었는지 확인한다.
- schema 변경 시 migration과 Prisma Client generate 필요 여부를 확인한다.
- worker 변경 시 자동 시작, 중복 실행, 에러 로그 영향을 확인한다.

## 보고 형식

```text
## 검증 보고

| Check | Status | Details |
|---|---|---|
| Build | pass/fail/skipped | 내용 |
| Prisma Generate | pass/fail/skipped | 내용 |
| API Contract | pass/fail | DTO/Swagger/응답 형식 |
| Auth/Security | pass/fail | 인증/인가/민감 정보 |
| DB Safety | pass/fail | migration/query/userId |
| Performance | pass/fail | N+1/pagination/select/batch |
| Worker/External | pass/fail/skipped | 주기 작업/외부 API 영향 |

## 오류
- 파일 — 에러 — 수정 제안
```
