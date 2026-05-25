---
id: SRV-REQ-001
spec: ../../specs/done/SRV-REQ-001.md
checklist: ../checklists/SRV-REQ-001.md
title: Investment Coach Server > AI Coach 점수 기반 판단 회고
completed: 2026-05-25
---

## 요약

AI Coach 후보 생성, 점수화, 판단 payload, 프로필, 피드백, Gemini 해설 endpoint를 구현했다. 점수는 `recommendation.score`, `candidates[].score`, decision card 전달 경로에서 추적된다.

## 잘된 점

- `AICoachScoreEngine`이 점수 계산을 분리해 근거별 positive/negative factor를 추적할 수 있다.
- `AICoachExplainer`가 score와 factor를 payload에 보존해 BFF/프론트 계약으로 넘길 수 있다.
- profile/feedback/explain이 같은 AI Coach route 안에서 책임별로 나뉘어 있다.
- 주문 실행 side effect 없이 판단 보조와 기록만 수행한다.

## 어려웠던 점 / 시행착오

- `prisma:generate`는 `DATABASE_URL` 환경변수가 없어 실행되지 않았다.
- server build는 기존 `portfolio-rebalance`, `whale-signal`, `portfolio` 타입 오류 때문에 실패했다. 이번 REQ 구현 파일만의 오류로 특정되지는 않았다.

## 개선 / 다음에는

- `defaultMode`, `notificationLevel`은 현재 unsupported persisted field로 반환되므로 DB persistence 여부를 별도 REQ에서 결정해야 한다.
- score range와 confidence 계산식을 API 문서에 더 명확히 고정할 필요가 있다.

## 검증 산출

```text
npm run prisma:generate # FAIL: DATABASE_URL missing
npm run build           # FAIL: existing type errors outside this module path
```

## Quality Score

| 항목 | 점수 (1-5) |
|---|---|
| API 계약 준수 | 5/5 |
| 모듈 구조 | 5/5 |
| 타입 안전성 | 3/5 |
| 점수 계약 완성도 | 5/5 |
| 검증 통과도 | 2/5 |
