---
id: SRV-REQ-004
spec: ../../specs/done/SRV-REQ-004.md
checklist: ../checklists/SRV-REQ-004.md
title: Investment Coach Server > 익절/손절 플랜 회고
completed: 2026-05-25
---

## 요약

보유 종목의 수익률과 평균 매수가를 기준으로 손실 제한, 1차 익절, 추세 유지 plan을 생성했다.

## 잘된 점

- 보유 종목이 없는 경우와 있는 경우의 status가 명확하다.
- 단계형 plan이 가격/action/ratio를 포함해 프론트가 카드나 표로 표현하기 쉽다.
- 주문 실행 없이 판단 보조 plan만 반환한다.

## 어려웠던 점 / 시행착오

- 전체 server build는 기존 타입 오류로 실패했다.
- Prisma generate는 `DATABASE_URL` 미설정으로 실패했다.

## 개선 / 다음에는

- 익절/손절 가격 계산식은 현재 단순 규칙이므로 사용자 risk profile과 market regime을 반영하는 후속 개선이 필요하다.
- stage ratio의 의미를 프론트 문구에서 명확히 설명해야 한다.

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
| 플랜 계산 완성도 | 4/5 |
| 검증 통과도 | 2/5 |
