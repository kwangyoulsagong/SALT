---
name: deliver
description: "Phase 4: SALT BFF 변경 결과를 요약하고 검증/잔여 리스크를 정리한다"
argument-hint: <변경 요약 또는 PR 메모>
---

# 4단계: 전달

## 산출물

아래 형식으로 결과를 정리한다.

```text
## 변경 요약
- 파일 — 내용

## 계약 영향
- Front response/message 영향
- Backend API path/request/response/header 영향

## 검증
- 실행한 명령 — 결과
- 실행하지 못한 명령 — 이유

## 잔여 리스크
- 리스크 — 후속 조치
```

## 주의

- 검증하지 않은 내용을 완료로 쓰지 않는다.
- BFF dev 서버를 띄웠다면 필요한 경우 포트와 URL을 명시한다.
- backend 미기동으로 생긴 `ECONNREFUSED`는 BFF 자체 실패와 구분해서 보고한다.
