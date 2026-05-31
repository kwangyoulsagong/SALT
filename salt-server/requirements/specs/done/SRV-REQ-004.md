---
id: SRV-REQ-004
title: Investment Coach Server > 익절/손절 플랜
priority: medium
labels: [기능 정의, API 연동]
created: 2026-05-25
---

## Summary

서버는 보유 종목별 손실 제한, 1차 익절, 추세 유지 단계 계획을 생성한다.

## Background

사용자는 수익 구간에서 너무 빨리 팔거나 손실 구간에서 계획 없이 버틸 수 있다. 서버는 보유 종목의 수익률과 평균 매수가를 기준으로 단계형 계획을 제공해야 한다.

## Requirements

- `GET /api/profit-plan`은 인증 사용자 기준으로 동작한다.
- optional `symbol` query가 있으면 해당 보유 종목만 조회한다.
- 보유 종목이 없으면 `status: empty`, 있으면 `status: active`를 반환한다.
- 각 plan은 `status`, `currentPrice`, `averageBuyPrice`, `unrealizedProfitRate`, `stages`, `warnings`, `generatedAt`을 포함한다.
- stages는 손실 제한, 1차 익절 검토, 추세 유지 구간을 포함한다.

## Acceptance Criteria

- [ ] route가 `/api/profit-plan`에 등록된다.
- [ ] 사용자별 portfolio holding query에 `userId`와 `assetType: crypto`가 포함된다.
- [ ] 수익률 기준으로 `take_profit_review`, `stop_loss_review`, `raise_stop_review`, `hold_plan` 상태를 구분한다.
- [ ] 주문 실행 side effect가 없다.

## Notes

- 구현 위치: `salt-server/src/modules/profit-plan/**`
