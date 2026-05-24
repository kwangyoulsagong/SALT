# Validation

## 기본 검증

변경 범위에 따라 실행한다.

```bash
cd bff
npm run build
```

런타임 변경이면 가능한 범위에서 실행한다.

```bash
cd bff
npm run dev:rest
npm run dev:ws
npm run dev:worker
curl -sS http://localhost:4001/health
```

## 정적 점검

- `tsconfig.json`이 `bff/src/**/*` 범위만 컴파일하는지 확인한다.
- `dist`, `node_modules`, `.env`가 git 추적 대상이 아닌지 확인한다.
- worker import side effect가 없는지 확인한다.
- REST route/controller/service 책임이 섞이지 않았는지 확인한다.
- backend 계약 변경 여부와 프론트 응답 계약 변경 여부를 확인한다.
- env 추가 시 `src/config/env.ts`와 로컬 실행 문서가 갱신됐는지 확인한다.
- WebSocket/worker 변경 시 포트 충돌, heartbeat, shutdown, reconnect 흐름을 확인한다.

## 보고 형식

```text
## 검증 보고

| Check | Status | Details |
|---|---|---|
| Build | pass/fail/skipped | 내용 |
| REST Health | pass/fail/skipped | 내용 |
| WebSocket | pass/fail/skipped | 내용 |
| Worker | pass/fail/skipped | 내용 |
| Backend Contract | pass/fail/skipped | 내용 |
| Front Contract | pass/fail/skipped | 내용 |
| Security/Config | pass/fail/skipped | 내용 |

## 오류
- 파일 — 에러 — 수정 제안
```
