---
name: validate
description: "Phase 3: SALT BFF 타입, 빌드, REST, WebSocket, worker, 연동 계약을 검증한다"
---

# 3단계: 검증

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

## 정적 규칙 점검

- route가 비즈니스 로직을 포함하지 않는지 확인.
- controller가 backendApi/axios를 직접 호출하지 않는지 확인.
- backend API 계약 변경 여부를 확인.
- 프론트 응답 shape 변경 여부를 확인.
- worker import side effect가 없는지 확인.
- interval, reconnect, heartbeat, shutdown 흐름을 확인.
- env 추가 시 `src/config/env.ts`가 갱신되었는지 확인.
- token, Authorization, PII가 로그에 남지 않는지 확인.

## 결과 보고

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
