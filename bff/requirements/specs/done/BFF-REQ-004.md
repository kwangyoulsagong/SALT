---
id: BFF-REQ-004
title: Investment Coach BFF > 익절/손절 플랜 화면 계약
priority: medium
labels: [API 연동, 계약 정의]
created: 2026-05-25
---

## Summary

BFF는 서버 profit plan을 보유 종목별 카드 목록으로 변환한다.

## Background

사용자는 진입보다 청산과 손실 제한 계획을 더 명확히 관리해야 한다. 프론트는 보유 종목별 현재 가격, 평균 매수가, 수익률, 단계별 액션과 경고가 필요하다.

## Requirements

- `GET /api/app/profit-plan`은 인증 토큰을 서버에 전달하고 `/profit-plan`을 호출한다.
- `symbol` query가 있으면 대문자로 정규화해 서버에 전달한다.
- 응답은 `status`와 `cards[]`를 포함한다.
- 각 card는 `symbol`, `status`, `currentPrice`, `averageBuyPrice`, `profitRate`, `stages`, `warnings`, `generatedAt`을 포함한다.

## Acceptance Criteria

- [ ] BFF route가 `/api/app/profit-plan`에 등록된다.
- [ ] query symbol은 대문자 symbol로 전달된다.
- [ ] 서버 `plans[]`가 프론트 `cards[]`로 변환된다.
- [ ] 주문 실행 관련 필드는 없다.

## Notes

- 구현 위치: `bff/src/rest/routes/profit-plan.routes.ts`, `bff/src/rest/controllers/profit-plan.controller.ts`, `bff/src/services/app-profit-plan.service.ts`
