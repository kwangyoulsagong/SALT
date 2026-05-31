# API 계약 규칙

## REST 경로

- API는 `src/app.ts`에서 `/api/{resource}` prefix로 등록한다.
- 세부 경로는 모듈의 `*.routes.ts`에 둔다.
- HTTP method는 리소스 의미에 맞게 사용한다: 조회 `GET`, 생성 `POST`, 전체/부분 수정 `PUT/PATCH`, 삭제 `DELETE`.
- 기존 프론트 연동 경로를 바꾸면 `salt-microFe/**` 계약 영향도 함께 확인한다.

## DTO와 검증

- 요청 body/query/params 검증은 Zod schema를 사용한다.
- DTO 파일은 `*.dto.ts`로 두고 `z.infer` 타입을 export한다.
- controller는 service 호출 전에 schema로 입력을 검증한다.
- query string 숫자/boolean은 Zod transform으로 명시 변환한다.
- service 내부에서 신뢰할 수 없는 raw request 값을 다시 해석하지 않는다.

## 응답

- 성공 응답은 `ResponseUtil.success` 또는 `ResponseUtil.created`를 우선한다.
- 응답 envelope은 `{ success, message, data }` 형식을 유지한다.
- 에러 응답은 `errorMiddleware`와 `AppError` 계열에 맡긴다.
- password hash, token secret, 내부 provider response 같은 민감 값을 응답에 포함하지 않는다.

## Swagger

- 새 public endpoint는 `*.routes.ts`에 Swagger JSDoc을 추가한다.
- 세부 작성 규칙은 `.claude/rules/swagger.md`를 따른다.
- 실제 DTO와 Swagger schema가 어긋나지 않게 유지한다.

## 인증 사용자

- 인증이 필요한 route는 `authMiddleware`를 연결한다.
- controller에서 `req.user`를 사용할 때는 인증 middleware가 앞에 있는지 확인한다.
- 사용자별 데이터는 `userId` 조건을 Prisma query에 포함한다.
