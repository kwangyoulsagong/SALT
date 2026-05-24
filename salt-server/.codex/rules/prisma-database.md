# Prisma/Database 규칙

## Prisma Client

- Prisma client는 `src/config/database.ts`의 default export를 사용한다.
- controller나 route에서 Prisma를 직접 호출하지 않는다.
- 트랜잭션이 필요한 다중 write는 `prisma.$transaction` 사용을 검토한다.

## Schema

- DB 컬럼명은 기존처럼 `@map`, `@@map`으로 snake_case 테이블/컬럼에 매핑한다.
- 관계에는 필요한 `onDelete` 정책을 명시한다.
- 자주 조회하는 조건에는 `@@index`를 검토한다.
- 복합 유니크 제약은 Prisma schema에 `@@unique`로 표현한다.

## Migration

- schema 변경은 migration 파일과 함께 관리한다.
- migration 이름은 변경 의도를 드러내는 영문 snake_case로 둔다.
- 기존 migration을 수정하지 않는다. 새 변경은 새 migration으로 추가한다.
- schema 변경 후 `npm run prisma:generate`와 가능한 경우 `npm run build`를 실행한다.

## Query

- 사용자 소유 리소스 조회/수정/삭제는 `userId` 조건을 반드시 포함한다.
- 목록 API는 페이지네이션 또는 limit을 둔다.
- 응답에 필요 없는 필드는 `select`로 제외한다.
- N+1 쿼리가 생기면 `include`, `select`, batch query, transaction을 검토한다.
- 세부 성능 규칙은 `.codex/rules/performance.md`를 따른다.
- Decimal/Date 값을 API 응답으로 보낼 때 프론트 계약과 직렬화 형태를 확인한다.

## 데이터 안전

- 삭제는 cascade 영향과 참조 관계를 확인한다.
- 외부 시세/뉴스 같은 volatile 데이터 저장은 중복 키와 upsert 전략을 먼저 정한다.
- seed성 데이터와 runtime 데이터 생성을 혼동하지 않는다.
