---
id: BFF-REQ-001
spec: ../../specs/done/BFF-REQ-001.md
checklist: ../checklists/BFF-REQ-001.md
title: Investment Coach BFF > AI Coach 화면 계약 회고
completed: 2026-05-25
---

## 요약

AI Coach 서버 응답을 프론트 preview/detail/profile/feedback/explain 화면 계약으로 변환했다. 서버 score는 `mapDecision`에서 decision card 필드로 보존된다.

## 잘된 점

- route/controller/service 책임이 분리되어 있고 controller는 envelope 응답만 담당한다.
- 인증 route와 public prototype explain route가 명확히 분리되어 있다.
- 서버 raw payload를 그대로 노출하지 않고 화면에 필요한 decision/evidence/profile 모델로 축소했다.
- `score`가 preview/detail decision card까지 전달되어 점수 기반 UI를 만들 수 있다.

## 개선 / 다음에는

- explain public endpoint는 운영 전 auth 또는 rate-limit 적용이 필요하다.
- response type을 `any` 대신 명시 타입으로 좁히면 backend contract drift를 더 빨리 잡을 수 있다.

## Quality Score

| 항목 | 점수 (1-5) |
|---|---|
| REST 계약 준수 | 5/5 |
| Backend 연동 안정성 | 4/5 |
| 타입 안전성 | 3/5 |
| 화면 계약 완성도 | 5/5 |
| 보안/운영 준비도 | 4/5 |
