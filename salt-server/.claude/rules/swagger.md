# Swagger 작성 규칙

## 범위

`salt-server/src/modules/**/*.routes.ts`의 Swagger JSDoc에 적용한다. Swagger 설정은 `src/config/swagger.ts`에서 `./src/modules/**/*.routes.ts`만 스캔한다.

## 기본 원칙

- 새 public endpoint를 추가하면 같은 route 파일에 Swagger JSDoc을 함께 작성한다.
- Swagger 문서는 실제 Express path, method, DTO schema, 응답 형식과 일치해야 한다.
- summary와 description은 한국어를 우선한다.
- tags는 도메인 단위로 일관되게 쓴다. 예: `Auth`, `Goals`, `Portfolio`, `Investment`.
- 인증이 필요한 endpoint는 `security`에 `bearerAuth`를 명시한다.

## 경로와 파라미터

- Swagger path는 `src/app.ts`에 등록된 prefix를 포함한 전체 API 경로로 작성한다.
- path parameter는 `parameters`에 `in: path`, `required: true`로 선언한다.
- query parameter는 `in: query`로 선언하고 DTO transform 결과 타입에 맞춘다.
- 페이지네이션 파라미터는 `page`, `limit`을 명시하고 기본값/최대값이 있으면 description에 적는다.

## 요청 본문

- body가 있는 endpoint는 `requestBody.required`와 `content.application/json.schema`를 작성한다.
- `*.dto.ts`의 Zod schema와 required 필드, enum, min/max, format을 맞춘다.
- 날짜 문자열은 `type: string`, `format: date-time`을 사용한다.
- 금액/수량 등 숫자는 `type: number` 또는 `integer`를 구분한다.
- 민감 필드 예시는 실제 secret/token 값을 쓰지 않는다.

## 응답

- 성공 응답은 실제 `ResponseUtil` envelope에 맞춰 `success`, `message`, `data` 구조를 문서화한다.
- 생성 endpoint는 `201`, 조회/수정/삭제 성공은 실제 구현 status에 맞춘다.
- 검증 실패 `400`, 인증 실패 `401`, 권한 실패 `403`, 미존재 `404`, 충돌 `409` 등 주요 오류를 필요한 만큼 선언한다.
- 배열 응답은 `type: array`와 `items`를 명시한다.
- 페이지네이션 응답은 `pagination.page`, `pagination.limit`, `pagination.total`, `pagination.totalPages`를 문서화한다.

## 보안

- `passwordHash`, refresh token secret, 외부 API key, 내부 provider 원문 응답을 schema나 example에 포함하지 않는다.
- access token/refresh token 응답이 있는 경우 값은 형식 예시만 둔다.
- 사용자별 리소스 endpoint는 path/query의 `userId`를 신뢰하지 말고 bearer token 기반임을 문서에 드러낸다.

## 유지보수

- DTO를 바꾸면 Swagger schema도 같은 변경에서 갱신한다.
- route prefix를 바꾸면 Swagger path와 프론트 API 호출 경로 영향도 확인한다.
- deprecated endpoint가 생기면 Swagger에 `deprecated: true`와 대체 endpoint를 적는다.
