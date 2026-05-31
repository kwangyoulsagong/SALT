---
id: BFF-REQ-002
spec: ../../specs/done/BFF-REQ-002.md
checklist: ../checklists/BFF-REQ-002.md
title: Investment Coach BFF > 외부 주문 전 체크 화면 계약 회고
completed: 2026-05-25
---

## 요약

서버 trade preflight 결과를 주문 실행 없는 UI checklist 계약으로 변환했다.

## 잘된 점

- `orderExecution: false`를 명시해 주문 실행 기능이 아님을 계약에 고정했다.
- 서버 checklist를 UI severity로 변환해 프론트 렌더링 부담을 줄였다.
- 계산 결과와 포트폴리오 영향을 그대로 보존해 사용자가 외부 주문 전 리스크를 확인할 수 있다.

## 개선 / 다음에는

- warning severity가 서버와 BFF 양쪽에 흩어져 있어 장기적으로 공통 enum 계약을 둘 수 있다.
- request body 타입을 명시하면 프론트 입력 검증과 더 쉽게 맞출 수 있다.

## Quality Score

| 항목 | 점수 (1-5) |
|---|---|
| REST 계약 준수 | 5/5 |
| Backend 연동 안정성 | 4/5 |
| 타입 안전성 | 3/5 |
| 화면 계약 완성도 | 5/5 |
| 보안/운영 준비도 | 5/5 |
