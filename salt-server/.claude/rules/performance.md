# 성능 최적화 규칙

## 범위

`salt-server/src/**`의 API, Prisma query, 외부 API, worker 작업에 적용한다.

## Prisma Query

- 목록 API는 반드시 페이지네이션 또는 명시적인 `take` 제한을 둔다.
- `findMany`에는 필요하면 `orderBy`를 명시해 결과 순서를 안정화한다.
- 응답에 필요 없는 필드는 `select`로 제외한다.
- 관계 데이터가 필요할 때만 `include`를 사용하고, 중첩 include는 필요한 필드만 `select`한다.
- `count`와 목록 조회처럼 독립 쿼리는 `Promise.all`로 병렬 처리할 수 있다.
- 여러 write가 하나의 일관된 작업이면 `prisma.$transaction`을 검토한다.

## N+1 Query 방지

- 루프 안에서 `findUnique`, `findFirst`, `findMany`, `count`, `update`를 반복 호출하지 않는다.
- 여러 id/symbol/userId를 조회해야 하면 `where: { id: { in: ids } }` 또는 해당 키의 `in` query로 한 번에 가져온다.
- 루프별 집계가 필요하면 Prisma groupBy, 사전 조회 후 Map 구성, 또는 batch query를 우선한다.
- 관계를 반복 조회해야 하면 `include/select` 또는 별도 batch query로 모아 가져온다.
- N+1 회피를 위해 `Promise.all`로 단순 병렬화만 하는 것은 근본 해결이 아니다. DB 부하와 connection pool을 먼저 고려한다.

## 페이지네이션과 제한

- 기본 `limit`을 두고, 사용자 입력 limit에는 최대값을 둔다.
- offset pagination(`skip/take`)이 커질 수 있는 endpoint는 cursor pagination을 검토한다.
- 대시보드/피드/랭킹처럼 최신 일부만 필요한 API는 `take`를 작게 유지한다.
- worker에서 전체 테이블을 순회해야 하면 batch size와 진행 기준을 명시한다.

## 인덱스와 정렬

- `where`와 `orderBy`에 자주 쓰는 필드는 Prisma schema의 `@@index`를 검토한다.
- 복합 조건은 복합 index 순서가 query 패턴과 맞는지 확인한다.
- `contains` 검색이나 정렬 비용이 큰 query는 데이터 규모와 대체 전략을 검토한다.

## 외부 API와 Worker

- 외부 API 호출은 timeout, retry, rate limit을 고려한다.
- 대량 외부 호출은 batch 크기와 동시성 제한을 둔다.
- `Promise.all`로 무제한 병렬 호출하지 않는다. batch 처리 또는 제한된 concurrency를 사용한다.
- worker는 중복 실행되어도 데이터가 깨지지 않도록 upsert/idempotent 전략을 둔다.
- 실패한 batch는 로그를 남기고 다음 batch 또는 다음 주기 실행이 가능해야 한다.

## 캐싱과 중복 계산

- 시세, 기술 지표, 뉴스, 인사이트처럼 자주 읽고 상대적으로 덜 변하는 데이터는 저장/갱신 주기를 먼저 확인한다.
- 요청마다 계산 비용이 큰 값은 materialized field, worker 사전 계산, cache TTL을 검토한다.
- 캐시를 추가하면 invalidation 조건과 stale 허용 범위를 문서화한다.

## 응답 크기

- 대용량 JSON, 긴 원문 뉴스, 외부 provider 원문은 기본 목록 응답에서 제외한다.
- 상세 API와 목록 API의 응답 필드를 분리한다.
- 클라이언트가 쓰지 않는 필드는 API 계약에 추가하지 않는다.

## 검증

- 성능 관련 변경은 쿼리 수, 병렬 호출 수, 최대 반환 행 수를 설명할 수 있어야 한다.
- Prisma schema 변경이 필요한 최적화는 migration과 `npm run prisma:generate` 필요 여부를 확인한다.
- 대량 데이터 경로는 작은 데이터만 보고 통과시키지 말고 최악 입력 크기를 함께 검토한다.
