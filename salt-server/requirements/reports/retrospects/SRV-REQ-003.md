---
id: SRV-REQ-003
spec: ../../specs/done/SRV-REQ-003.md
checklist: ../checklists/SRV-REQ-003.md
title: Investment Coach Server > 행동 코치 회고
completed: 2026-05-25
---

## 요약

거래 내역 기반 행동 분석 insight를 생성하고, 상태/경고/추천 규칙/evidence를 반환하는 API를 구현했다.

## 잘된 점

- 거래 수 부족 상태를 명확히 분기해 빈 화면 대신 기본 규칙을 제공한다.
- insight tag 기반으로 over-trading, panic-sell, chasing-high 규칙을 생성한다.
- 사용자별 query에 `userId`와 `assetType` 조건이 들어가 있다.

## 어려웠던 점 / 시행착오

- 전체 server build는 기존 타입 오류로 실패했다.
- Prisma generate는 `DATABASE_URL` 미설정으로 실패했다.

## 개선 / 다음에는

- 행동 분석 생성이 GET 호출마다 실행되므로 캐시/만료 정책을 별도 점검해야 한다.
- recommendedRules는 문자열 배열이라 향후 CTA/딥링크가 필요하면 구조화가 필요하다.

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
| 행동 분석 UX 완성도 | 4/5 |
| 검증 통과도 | 2/5 |
