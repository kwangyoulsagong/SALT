# 인증/보안 규칙

## 환경 변수

- 환경 변수는 `src/config/env.ts`의 Zod schema에 추가한다.
- secret, token, DB URL, 외부 API key를 코드나 문서에 하드코딩하지 않는다.
- 기본값은 안전한 값에만 둔다. secret류에는 임의 기본값을 넣지 않는다.

## 인증/인가

- JWT 생성/검증은 `src/utils/jwt.util.ts`를 사용한다.
- 비밀번호 처리는 `src/utils/password.util.ts`를 사용한다.
- 인증이 필요한 endpoint는 `authMiddleware`를 route에 연결한다.
- 사용자 리소스 접근은 인증된 `userId` 기준으로 제한한다.
- 관리자/소유자 권한이 필요한 경우 service에서 권한 조건을 명시한다.

## 입력/출력 보안

- 모든 외부 입력은 Zod DTO로 검증한다.
- 민감 정보는 로그와 응답에서 제외한다.
- `passwordHash`, refresh token secret, 외부 API key는 응답하지 않는다.
- 에러 메시지는 production에서 내부 구현 정보를 노출하지 않는다.

## Express 보안

- `helmet`, `cors`, body parser, logger, error middleware 순서를 유지한다.
- body size 제한이 필요한 endpoint는 route 단위 설정을 검토한다.
- 외부 webhook/API callback을 추가하면 인증 또는 서명 검증 방식을 문서화한다.
