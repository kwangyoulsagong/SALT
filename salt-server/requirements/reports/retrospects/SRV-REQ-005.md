---
id: SRV-REQ-005
spec: ../../specs/done/SRV-REQ-005.md
checklist: ../checklists/SRV-REQ-005.md
title: Investment Coach Server > 신호 성과 추적 회고
completed: 2026-05-25
---

## 요약

AI Coach insight 이후 가격 변화로 승률, 평균 수익률, 최대 낙폭과 샘플을 계산하는 API를 구현했다.

## 잘된 점

- feedback insight를 성과 계산에서 제외해 사용자 반응 기록과 신호를 분리했다.
- 샘플 수를 최대 20개로 제한해 응답 크기를 제어한다.
- 데이터 부족 상태를 `insufficient_data`로 표현한다.

## 어려웠던 점 / 시행착오

- 전체 server build는 기존 타입 오류로 실패했다.
- Prisma generate는 `DATABASE_URL` 미설정으로 실패했다.

## 개선 / 다음에는

- 현재 insight별 priceHistory 조회가 루프 안에서 실행되어 N+1 성격이 있다. 데이터가 늘어나면 batch query로 개선해야 한다.
- 기간별 성과, signalKey별 집계, mode별 집계는 별도 REQ로 분리하는 편이 좋다.

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
| 타입 안전성 | 4/5 |
| 성과 계산 완성도 | 4/5 |
| 검증 통과도 | 2/5 |
