---
name: deliver
description: "Phase 4: SALT Server 변경 결과를 요약하고 검증/잔여 리스크를 정리한다"
argument-hint: <변경 요약 또는 PR 메모>
---

# 4단계: 전달

## 산출물

아래 형식으로 결과를 정리한다.

```text
## 변경 요약
- 파일 — 내용

## API/DB 영향
- endpoint/request/response/status 변경
- Prisma schema/migration 영향

## 검증
- 실행한 명령 — 결과
- 실행하지 못한 명령 — 이유

## 잔여 리스크
- 리스크 — 후속 조치
```

## 주의

- 검증하지 않은 내용을 완료로 쓰지 않는다.
- API 계약이 바뀌었으면 프론트 영향 파일이나 문서 갱신 필요 여부를 명시한다.
- migration이 있으면 적용 순서와 rollback 주의점을 적는다.
