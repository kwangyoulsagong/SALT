# 모듈 아키텍처 규칙

## 범위

`salt-server/src/**` 백엔드 코드에 적용한다. `node_modules`, `dist`, `coverage`, `.git`은 검색 대상에서 제외한다.

## 레이어

- `*.routes.ts`: Express Router, 경로, 미들웨어 연결, Swagger JSDoc.
- `*.controller.ts`: `Request`, `Response`, `NextFunction` 처리, Zod DTO 검증, service 호출, `ResponseUtil` 응답.
- `*.service.ts`: 비즈니스 로직, Prisma 쿼리, 외부 API 호출 조합.
- `*.dto.ts`: Zod schema와 `z.infer` 타입.
- `src/config`: env, database, logger, swagger 설정.
- `src/middleware`: 인증, 로깅, 에러 처리 등 Express middleware.
- `src/utils`: 에러, 응답, JWT, password 같은 공통 유틸.
- `src/external`: 외부 API client/service.
- `src/workers`: 주기 작업, 동기화, 크롤링, 정리 작업.

## 모듈 추가

- 새 도메인은 `src/modules/{domain}`에 `routes/controller/service/dto`를 함께 둔다.
- 새 route는 `src/app.ts`에 `/api/{resource}` prefix로 등록한다.
- controller에서 직접 Prisma를 호출하지 않는다.
- route 파일에 비즈니스 로직을 넣지 않는다.
- service에서 Express `Request`/`Response` 객체에 의존하지 않는다.
- 공통 로직이 두 모듈 이상에서 반복되면 `src/utils` 또는 별도 service로 분리한다.

## Import

- 같은 모듈 내부는 상대 경로를 사용한다.
- 공통 config/middleware/utils는 `../../config/*`, `../../utils/*` 등 기존 상대 경로 패턴을 따른다.
- 타입만 쓰면 `import type`을 사용한다.
- 순환 참조를 만들지 않는다.

## 에러 처리

- controller는 `try/catch`에서 `next(error)`로 전달한다.
- 비즈니스 에러는 `src/utils/error.util.ts`의 `AppError` 계열을 사용한다.
- 알 수 없는 에러를 임의로 삼키지 않는다.
