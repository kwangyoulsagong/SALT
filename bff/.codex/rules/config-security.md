# Config And Security

## Scope

`src/config/**`, REST middleware, CORS/Helmet/Auth/logging/env 변경에 적용한다.

## Env

- env 접근은 `src/config/env.ts`를 통한다.
- 새 env는 기본값, 타입 변환, 로컬 실행 값을 함께 검토한다.
- `.env`는 커밋하지 않는다.
- 포트 기본값은 REST 4001, WebSocket 4002를 유지한다.

## 보안

- Helmet과 CORS 설정 변경은 프론트 origin, credential, WebSocket 사용 여부를 함께 확인한다.
- Authorization, token, cookie, refresh token, user PII를 로그에 남기지 않는다.
- 인증 middleware 변경은 backend 전달 header와 guest 허용 정책을 같이 확인한다.
- proxy route는 SSRF 위험이 없도록 backend base URL 밖으로 임의 URL을 전달하지 않는다.

## 로그

- 운영 로그는 원인 파악에 필요한 method/path/status/duration/error code 중심으로 남긴다.
- 외부 API 에러 전체 객체를 그대로 큰 로그로 남기는 것은 피하고 code/status/message 중심으로 정리한다.
- 반복 interval 에러는 로그 폭주 가능성을 고려한다.
