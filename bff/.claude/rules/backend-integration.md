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

- backend가 4xx를 주면 가능한 원 status/message를 보존한다. **보존은 error middleware 한 곳이 한다**
  (`toUpstreamClientError` — status · `code` · `message` · `errors` · `Retry-After` · 본문 `retryAfterSeconds`). 컨트롤러는
  `next(error)` 만 하고 `error.response` 를 직접 잡지 않는다 — 셋이 따로 잡다가 옮기는 필드가 갈라졌다.
- **로그 레벨은 status 로 가른다** — 서버 4xx 는 `warn`(인터셉터 · error middleware 둘 다), 5xx · 응답 없음만 `error`. logger 둘째 인자는 객체다(문자열이면 원인이 버려진다).
- backend가 5xx, timeout, ECONNREFUSED이면 BFF 로그에 원인을 남기고 클라이언트에는 민감하지 않은 메시지를 반환한다.
- worker에서 backend 장애가 나도 interval이 중단되지 않게 처리한다.

## 서버 MSA 이전 — BFF 가 스위치다 (2026-10-30, `ADR-006` · `BFF-REQ-045`)

서버가 Express → Kotlin 도메인 서비스로 옮겨 가는 동안(S0~S7) **BFF 는 Node 그대로, 프론트 계약 무변경**이 합격 기준이다.
지금 코드는 `BACKEND_API_URL` 하나 — 아래는 `BFF-REQ-045` 착수 기준이다.

- 서버 경로 prefix → `legacy`(Express) | `platform`(Kotlin) | `shadow` 를 **설정 파일 하나**에서 정한다. 재시작 없이 재로딩, 되돌리기 = 값 하나. 서비스 주소를 코드에 박지 않는다
- `shadow` 는 legacy 응답을 돌려주고 같은 요청을 platform 에 비동기로 보내 차이만 기록한다. **쓰기 경로는 그림자 금지**(읽기만)
- 골든 JSON 녹화 · 비교는 BFF 가 부르는 서버 API 전부. 시간 · ID 같은 변동 필드는 정규화 규칙으로. 1주 무차이가 스위치 조건
- 응답을 뷰모델로 조립하는 자리는 그대로 BFF 서비스 — 서버가 나뉘었다고 프론트가 여러 서비스를 직접 부르지 않는다
- 추적 ID 는 BFF 가 만들어 서버에 넘긴다(OpenTelemetry). S3 기간엔 옛 HS · 새 JWKS 토큰 둘 다 받는다
- 서버 쪽 규칙은 `salt-server/.claude/rules/msa-services.md` §6 · §7
