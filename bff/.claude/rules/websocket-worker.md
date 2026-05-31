# WebSocket And Worker

## Scope

`src/websocket/**`, `src/workers/**`, `src/services/upbit-ws.service.ts`, `src/builder/**` 변경에 적용한다.

## WebSocket 원칙

- 연결 생명주기와 구독 상태는 `connection.manager.ts`에 모은다.
- 메시지 type 분기는 handler에서 처리하고 server는 연결, 인증, heartbeat, shutdown에 집중한다.
- client message는 JSON parse 실패, 알 수 없는 type, 누락 필드에 대해 에러 응답을 보낸다.
- guest 연결 허용 여부와 token 처리 방식은 명시적으로 유지한다.
- heartbeat interval은 env 설정을 사용한다.

## Worker 원칙

- worker 모듈은 import만으로 시작하면 안 된다.
- `npm run dev:worker` 또는 `start:worker`처럼 직접 실행될 때만 interval, socket, shutdown hook을 등록한다.
- interval 작업은 중복 실행과 backend 장애를 견뎌야 한다.
- 외부 API 구독은 중복 구독을 줄이고 현재 구독 상태를 기준으로 diff를 계산한다.
- worker와 WebSocket 프로세스가 같은 singleton state를 공유한다고 가정하지 않는다. 프로세스 경계가 있으면 별도 동기화 전략을 명시한다.

## Upbit/외부 API

- reconnect delay는 env 또는 한 곳의 상수로 관리한다.
- WebSocket close/error는 로그와 재연결 흐름을 가진다.
- 외부 API payload는 필요한 필드만 내부 타입으로 변환한다.
- 로그에는 token, Authorization, 사용자 민감 정보를 남기지 않는다.
