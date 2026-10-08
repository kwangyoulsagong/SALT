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
- 새로 구독할 심볼은 현재 구독 상태와 diff 로 고르되, **Upbit 에는 추가분이 아니라 전체 집합을 보낸다.**
  같은 연결의 새 구독 요청은 이전 구독을 **대체**한다(2026-09-21 실측) — 추가분만 보내면 나머지 시세가 끊긴다.
- worker와 WebSocket 프로세스가 같은 singleton state를 공유한다고 가정하지 않는다. 프로세스 경계가 있으면 별도 동기화 전략을 명시한다.

## Upbit/외부 API

- reconnect delay는 env 또는 한 곳의 상수로 관리한다.
- 외부 소켓은 **첫 구독 때 연다.** 생성자 · import 에서 열지 않는다 — 캐시만 읽는 REST 와 테스트가 소켓을 연다.
  `close()` 뒤에는 재연결하지 않는다.
- WebSocket close/error는 로그와 재연결 흐름을 가진다.
- 외부 API payload는 필요한 필드만 내부 타입으로 변환한다.
- 로그에는 token, Authorization, 사용자 민감 정보를 남기지 않는다.

## 국내 주식 실시간 (F011 · `BFF-REQ-040`)

- 업비트 경로(`subscribedSymbols` · `price-updater.worker`)와 **섞지 않는다.** 6자리 코드를 업비트 구독에 넣으면
  요청이 통째로 거부될 수 있다(실측 안 함 — 걸면 코인 시세까지 끊긴다). 구독은 `assetType: "kr_stock"` 으로 갈라 `kr-stream.manager` 가 갖는다
- 서버 SSE 는 **연결마다 그 연결의 토큰으로** 연다. 소유자 전용이라 하나를 열어 뿌리면 비소유자에게 간다
- 토큰은 중계 맵 · 연결 클로저에만 둔다. 소켓 객체 · 로그에 두지 않는다
- 연결 종료 · 하트비트 종료 · 프로세스 종료 세 곳에서 upstream 을 끊는다(`krStreamManager.release`)
- 열기 4xx · 503 꺼짐은 화면에 `error { assetType, code }` 를 주고 멈춘다. 다시 열어도 같은 답이다
