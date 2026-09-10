# SALT Server Claude 하네스

`salt-server/**` 백엔드 작업에 적용한다. `salt-microFe/**`, `bff/**`는 사용자가 API 계약 변경 또는 연동 변경을 명시하지 않으면 수정하지 않는다.

## 프로젝트 개요

- 런타임: Node.js + TypeScript strict
- 프레임워크: Express 5
- 데이터베이스: PostgreSQL + Prisma
- 검증: Zod DTO
- 인증: JWT access/refresh token
- 문서: Swagger JSDoc + `swagger-ui-express`
- 워커: `src/workers/**`의 주기 작업과 시세/뉴스/인사이트 처리

## 명령어

```bash
npm run dev
npm run build
npm start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## 구조 원칙

- 서버 작업은 `salt-server/**` 범위에서 수행한다.
- 서버 요구사항과 API spec은 `salt-server/requirements/specs/{to-do,in-progress,done}/`에서 관리하고, 검증/회고/학습 리포트는 `salt-server/requirements/reports/`에 둔다.
- 검색은 `node_modules`, `dist`, `coverage`, `.git`을 제외하고 필요한 하위만 본다.
- **컨텍스트 우선 DDD를 따른다.** 최상위가 Bounded Context이고 그 안에 4층이 들어간다: `{context}/{domain,application,infrastructure,presentation}`.
- 컨텍스트 이름은 `.claude/rules/server-architecture.md` §2 **레지스트리**를 따르고, 프론트 FSD 슬라이스 이름과 동일하다.
- 의존 방향: `presentation → application → domain ← infrastructure`. **선형이 아니다** — `application`과 `infrastructure`는 서로에게 의존하지 않는다.
- **`domain`은 `@prisma/client`·`express`·`zod`를 import하지 않는다.** 유일한 예외는 `decimal.js`.
- **클래스 하나 = 유스케이스 하나.** `application`의 서비스는 동사로 시작한다(`ImportUpbitCsv`, `SolveHarvestCandidates`).
- 컨텍스트 밖으로 열리는 것은 `{context}/application/api/`뿐이다.
- 공통 설정은 `src/shared/config`, 공통 미들웨어는 `src/shared/presentation`, 공통 유틸은 `src/shared/lib`에 둔다.
- 외부 API 연동은 `{context}/infrastructure/`에 격리한다. **주문·출금 API를 부르는 코드를 만들지 않는다.**
- 백그라운드 작업은 `src/workers`에 두고, **스케줄과 락만** 담당하고 `application`의 유스케이스를 부른다.
- 레이어·컨텍스트 위반은 `.claude/hooks/layer-check.mjs`가 쓰기 시점에 차단한다.

> **전환 중.** 현재 코드는 `src/modules/{domain}` 4파일 패턴이다. 전환 근거와 순서는 `SRV-REQ-006`(DDD 전환)에 있다. 새 컨텍스트는 DDD로 쓰고, 기존 모듈은 그 REQ 순서로 옮긴다.

## 규칙 인덱스

### 아키텍처 (DDD)
- `.claude/rules/server-architecture.md` — 컨텍스트 우선 DDD · **컨텍스트 레지스트리** · 의존 방향
- `.claude/rules/ddd-shared.md` — Shared Kernel (`Money` VO가 핵심)
- `.claude/rules/ddd-domain.md` — Aggregate · VO · Port · 금액 불변식
- `.claude/rules/ddd-application.md` — 유스케이스 · 트랜잭션 경계 · 공개 API
- `.claude/rules/ddd-infrastructure.md` — Port 구현 · Prisma 매핑 · 외부 클라이언트 · ACL
- `.claude/rules/ddd-presentation.md` — 컨트롤러 · 응답 규약(`degraded`·`reconciliation`·렌더 게이트) · SSE

### 성능
- `.claude/rules/performance-server.md` — 예산 · 트랜잭션 · 스냅샷 분리 · 워커
- `.claude/rules/performance-database.md` — Decimal · 인덱스 · 실행계획 · 락 · 보존

### 관례
- `.claude/rules/module-architecture.md` — (구) 모듈 4파일 패턴 — `server-architecture.md`로 대체됨
- `.claude/rules/api-contract.md` — REST API, DTO, Swagger, 응답 규칙
- `.claude/rules/swagger.md` — Swagger JSDoc 작성 규칙
- `.claude/rules/prisma-database.md` — Prisma schema, migration, 쿼리 규칙
- `.claude/rules/performance.md` — N+1 query, 페이지네이션, batch, 워커 성능 규칙
- `.claude/rules/auth-security.md` — 인증/인가/보안/비밀값 규칙
- `.claude/rules/workers-external.md` — 워커와 외부 API 연동 규칙
- `.claude/rules/validation.md` — 타입/빌드/정적 검증

## 스킬

`.claude/skills/` 하위 6종을 사용한다.

- `plan` — 요구사항 분석 + 서버 구현 계획
- `orchestrate` — 계획 실행
- `validate` — 타입/빌드/API/DB 영향 검증
- `deliver` — 변경 요약/문서/커밋 준비
- `retrospect` — 회고/기술부채 정리
- `pipeline` — 위 5단계 순차 실행

작업 전 관련 rule을 먼저 읽고, 변경 후 가능한 검증 명령을 실행한다.
