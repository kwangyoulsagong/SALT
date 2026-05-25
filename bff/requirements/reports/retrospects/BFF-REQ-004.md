---
id: BFF-REQ-004
spec: ../../specs/done/BFF-REQ-004.md
checklist: ../checklists/BFF-REQ-004.md
title: Investment Coach BFF > 익절/손절 플랜 화면 계약 회고
completed: 2026-05-25
---

## 요약

서버 profit plan을 보유 종목별 카드 계약으로 변환했다.

## 잘된 점

- optional symbol 정규화가 BFF에서 처리되어 backend query가 안정적이다.
- 서버 `plans[]`를 프론트 `cards[]`로 바꿔 화면 용어에 맞췄다.
- 단계형 손절/익절 계획을 그대로 전달해 UI가 계획 테이블이나 카드로 표시하기 쉽다.

## 개선 / 다음에는

- `plan.status`별 프론트 컬러/아이콘 기준은 아직 BFF 계약에 없다.
- 금액/비율 formatting은 프론트 책임으로 남아 있어 디자인 spec에서 보완이 필요하다.

## Quality Score

| 항목 | 점수 (1-5) |
|---|---|
| REST 계약 준수 | 5/5 |
| Backend 연동 안정성 | 4/5 |
| 타입 안전성 | 3/5 |
| 화면 계약 완성도 | 4/5 |
| 보안/운영 준비도 | 5/5 |
