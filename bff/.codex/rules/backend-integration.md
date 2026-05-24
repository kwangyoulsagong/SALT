# Backend Integration

## Scope

`src/services/backend-api.service.ts`와 backend API를 호출하는 서비스 변경에 적용한다.

## 원칙

- backend 호출은 `backend-api.service.ts` 또는 도메인 service에 격리한다.
- `BACKEND_API_URL` 기본값은 로컬 backend `/api` prefix와 맞춘다.
- 인증이 필요한 요청은 클라이언트 Authorization header를 backend로 전달하는 경로를 유지한다.
- backend 장애는 BFF 프로세스를 죽이지 않고 HTTP error 또는 빈 fallback 정책으로 변환한다.
- 외부 호출 timeout을 둔다. 무기한 대기하는 호출을 만들지 않는다.
- backend response shape에 의존하는 코드는 타입 또는 명확한 mapping 함수로 감싼다.

## 계약 변경 체크

- backend path/method/request body/query/header/status가 바뀌는지 확인한다.
- backend response 필드명이 바뀌면 BFF service와 프론트 소비 지점을 함께 확인한다.
- BFF에서 aggregation한 응답 shape가 바뀌면 `salt-microFe/**` 영향 여부를 확인한다.
- 새 env가 필요하면 `src/config/env.ts`, `.env` 문서화 여부를 확인한다.

## 실패 처리

- backend가 4xx를 주면 가능한 원 status/message를 보존한다.
- backend가 5xx, timeout, ECONNREFUSED이면 BFF 로그에 원인을 남기고 클라이언트에는 민감하지 않은 메시지를 반환한다.
- worker에서 backend 장애가 나도 interval이 중단되지 않게 처리한다.
