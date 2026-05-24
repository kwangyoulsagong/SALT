# SALT Server Codex 하네스

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
- 검색은 `node_modules`, `dist`, `coverage`, `.git`을 제외하고 필요한 하위만 본다.
- 모듈은 `src/modules/{domain}` 하위에 `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.dto.ts` 패턴을 따른다.
- 라우터는 경로/미들웨어/Swagger 선언만 담당한다.
- 컨트롤러는 요청 파싱, DTO 검증, 서비스 호출, 응답 변환만 담당한다.
- 서비스는 비즈니스 로직과 Prisma/external 호출을 담당한다.
- 공통 설정은 `src/config`, 공통 미들웨어는 `src/middleware`, 공통 유틸은 `src/utils`에 둔다.
- 외부 API 연동은 `src/external` 또는 도메인 전용 service에 격리한다.
- 백그라운드 작업은 `src/workers`에 둔다.

## 규칙 인덱스

- `.codex/rules/module-architecture.md` — 모듈/레이어 구조
- `.codex/rules/api-contract.md` — REST API, DTO, Swagger, 응답 규칙
- `.codex/rules/swagger.md` — Swagger JSDoc 작성 규칙
- `.codex/rules/prisma-database.md` — Prisma schema, migration, 쿼리 규칙
- `.codex/rules/performance.md` — N+1 query, 페이지네이션, batch, 워커 성능 규칙
- `.codex/rules/auth-security.md` — 인증/인가/보안/비밀값 규칙
- `.codex/rules/workers-external.md` — 워커와 외부 API 연동 규칙
- `.codex/rules/validation.md` — 타입/빌드/정적 검증

## 스킬

`.codex/skills/` 하위 6종을 사용한다.

- `plan` — 요구사항 분석 + 서버 구현 계획
- `orchestrate` — 계획 실행
- `validate` — 타입/빌드/API/DB 영향 검증
- `deliver` — 변경 요약/문서/커밋 준비
- `retrospect` — 회고/기술부채 정리
- `pipeline` — 위 5단계 순차 실행

작업 전 관련 rule을 먼저 읽고, 변경 후 가능한 검증 명령을 실행한다.
