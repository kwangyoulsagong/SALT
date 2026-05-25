---
id: BFF-REQ-003
spec: ../../specs/done/BFF-REQ-003.md
checklist: ../checklists/BFF-REQ-003.md
title: Investment Coach BFF > 행동 코치 화면 계약 회고
completed: 2026-05-25
---

## 요약

서버 행동 분석 warnings를 프론트 카드와 추천 규칙 모델로 변환했다.

## 잘된 점

- 서버 `warnings[]`를 화면 중심 `cards[]`로 바꿔 UI가 단순해졌다.
- severity threshold가 명확해 danger/warning 표시 기준을 추적할 수 있다.
- 데이터 부족 상태도 empty가 아니라 추천 규칙과 evidence로 표현한다.

## 개선 / 다음에는

- severity 80 기준은 문서화됐지만 상수화되어 있지 않다.
- 카드 id/title/message 외에 action CTA가 필요해지면 별도 REQ로 확장하는 편이 낫다.

## Quality Score

| 항목 | 점수 (1-5) |
|---|---|
| REST 계약 준수 | 5/5 |
| Backend 연동 안정성 | 4/5 |
| 타입 안전성 | 3/5 |
| 화면 계약 완성도 | 4/5 |
| 보안/운영 준비도 | 5/5 |
