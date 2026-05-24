---
name: retrospect
description: "Phase 5: SALT BFF 작업 후 기술부채와 규칙 보완점을 정리한다"
argument-hint: <작업명 또는 변경 범위>
---

# 5단계: 회고

## 점검 항목

- REST route/controller/service 경계가 유지됐는가.
- 프론트 응답 계약과 backend 호출 계약이 명확한가.
- WebSocket message payload와 connection manager 책임이 명확한가.
- worker가 import side effect 없이 직접 실행 시에만 시작되는가.
- 외부 API 장애, reconnect, interval 중복 실행을 견디는가.
- env/secret/logging에서 보안 누수가 없는가.
- 테스트 또는 검증 공백이 남았는가.

## 출력 형식

```text
## 회고
- 잘 유지된 점
- 남은 기술부채
- 다음에 보완할 규칙/문서
- 추가 검증 제안
```
