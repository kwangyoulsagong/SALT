# REST Contract

## Scope

`src/rest/**`, `src/services/**`, `src/utils/response.util.ts`, `src/utils/error.util.ts` 변경에 적용한다.

## 원칙

- 라우터는 경로, HTTP method, middleware 연결만 담당한다.
- 컨트롤러는 요청 파싱, 기본 검증, 서비스 호출, 성공/실패 응답 변환만 담당한다.
- 서비스는 backend API 호출, aggregation, 프론트 화면용 view model 구성을 담당한다.
- route/controller/service 간 순환 import를 만들지 않는다.
- REST endpoint는 `/health`, `/api/**`, `/api/app/**` 기존 prefix 체계를 유지한다.
- 프론트가 소비하는 응답 shape를 바꾸면 API 계약 변경으로 간주하고 `salt-microFe/**` 영향 여부를 확인한다.
- backend API path, request, response 의존성을 바꾸면 `salt-server/**` 영향 여부를 확인한다.

## 응답 규칙

- 기존 `success`, `data`, `message`, `error` envelope 패턴이 있는 route는 같은 패턴을 유지한다.
- 에러는 공통 error middleware 또는 `error.util.ts` 유틸 흐름을 우선 사용한다.
- 목록 응답은 pagination, sort, filter 정보가 필요하면 명시적으로 포함한다.
- 컨트롤러에서 backend raw response를 그대로 노출하지 말고 화면 계약에 맞춰 필요한 필드만 전달한다.

## 금지

- controller에서 axios/backendApi를 직접 호출하지 않는다.
- route 파일에 aggregation이나 비즈니스 로직을 넣지 않는다.
- 임시 mock 응답을 실제 route에 남기지 않는다. 필요하면 명확한 개발용 플래그를 둔다.
