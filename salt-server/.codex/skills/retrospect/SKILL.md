---
name: retrospect
description: "Phase 5: SALT Server 작업 후 기술부채와 규칙 보완점을 정리한다"
argument-hint: <작업명 또는 변경 범위>
---

# 5단계: 회고

## 점검 항목

- 모듈 경계가 route/controller/service/dto로 유지됐는가.
- API 계약과 Swagger가 실제 구현과 맞는가.
- Prisma query가 사용자 권한과 성능을 고려했는가.
- env/secret/logging에서 보안 누수가 없는가.
- worker/external 작업이 실패와 중복 실행을 견디는가.
- 테스트 또는 검증 공백이 남았는가.

## 출력 형식

```text
## 회고
- 잘 유지된 점
- 남은 기술부채
- 다음에 보완할 규칙/문서
- 추가 검증 제안
```
