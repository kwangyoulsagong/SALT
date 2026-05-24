# SALT BFF Codex 하네스

`bff/**` Backend For Frontend 작업에 적용한다. `salt-microFe/**`, `salt-server/**`는 사용자가 프론트 연동 또는 백엔드 API 계약 변경을 명시하지 않으면 수정하지 않는다.

## 프로젝트 개요

- 런타임: Node.js + TypeScript strict
- 프레임워크: Express 5
- REST API: `src/rest/**`, 기본 포트 4001
- WebSocket: `src/websocket/**`, 기본 포트 4002
- Worker: `src/workers/**`, 실시간 가격 구독/DB 업데이트
- 외부 연동: Upbit WebSocket, `BACKEND_API_URL`의 SALT backend
- 설정/로그: `src/config/env.ts`, `src/config/logger.ts`

## 명령어

```bash
npm run dev
npm run dev:rest
npm run dev:ws
npm run dev:worker
npm run build
npm run start:rest
npm run start:ws
npm run start:worker
```

## 구조 원칙

- BFF 작업은 `bff/**` 범위에서 수행한다.
- 검색은 `node_modules`, `dist`, `.git`을 제외하고 필요한 하위만 본다.
- REST는 `src/rest/routes`, `src/rest/controllers`, `src/services` 책임을 분리한다.
- 라우터는 path와 middleware 연결만 담당한다.
- 컨트롤러는 요청 파싱, 서비스 호출, 응답 변환만 담당한다.
- 서비스는 backend API aggregation, view model 구성, 외부 API 호출을 담당한다.
- WebSocket 연결/세션 관리는 `src/websocket/managers`, 메시지 처리는 `src/websocket/handlers`에 둔다.
- worker는 직접 실행될 때만 주기 작업을 시작한다. import side effect로 interval, socket, shutdown hook이 중복 생성되지 않게 한다.
- BFF 응답은 프론트 화면 계약이다. 응답 shape 변경 시 `salt-microFe/**` 영향 여부를 확인한다.
- Backend 호출 path/request/response 변경 시 `salt-server/**` 계약 영향 여부를 확인한다.

## 규칙 인덱스

- `.codex/rules/rest-contract.md` — REST route/controller/service/응답 계약
- `.codex/rules/backend-integration.md` — backend API 프록시/aggregation 규칙
- `.codex/rules/websocket-worker.md` — WebSocket, Upbit, worker 실행 규칙
- `.codex/rules/config-security.md` — env, CORS, 로그, 비밀값 규칙
- `.codex/rules/validation.md` — 타입/빌드/런타임 검증

## 스킬

`.codex/skills/` 하위 6종을 사용한다.

- `plan` — 요구사항 분석 + BFF 구현 계획
- `orchestrate` — 계획 실행
- `validate` — 타입/빌드/REST/WS/worker 검증
- `deliver` — 변경 요약/문서/커밋 준비
- `retrospect` — 회고/기술부채 정리
- `pipeline` — 위 5단계 순차 실행

작업 전 관련 rule을 먼저 읽고, 변경 후 가능한 검증 명령을 실행한다.
