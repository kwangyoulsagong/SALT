---
id: BFF-REQ-005
spec: ../../specs/done/BFF-REQ-005.md
checklist: ../checklists/BFF-REQ-005.md
title: Investment Coach BFF > 신호 성과 화면 계약 회고
completed: 2026-05-25
---

## 요약

서버 signal performance 통계를 프론트 metrics/samples 계약으로 변환했다.

## 잘된 점

- query string 구성을 `URLSearchParams`로 처리해 symbol/signalKey 조합이 명확하다.
- 통계 필드를 `metrics`로 묶어 화면에서 성과 카드로 쓰기 쉽다.
- sample이 부족한 상태도 status와 null metric으로 표현할 수 있다.

## 개선 / 다음에는

- sample shape 타입을 명시하면 chart/table 소비 지점과 더 안정적으로 연결된다.
- 기간 필터가 필요해지면 별도 query 계약을 추가해야 한다.

## Quality Score

| 항목 | 점수 (1-5) |
|---|---|
| REST 계약 준수 | 5/5 |
| Backend 연동 안정성 | 4/5 |
| 타입 안전성 | 3/5 |
| 화면 계약 완성도 | 4/5 |
| 보안/운영 준비도 | 5/5 |
