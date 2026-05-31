---
id: SRV-REQ-002
title: Investment Coach Server > 외부 주문 전 체크
priority: high
labels: [기능 정의, API 연동]
created: 2026-05-25
---

## Summary

서버는 외부 주문 전 손익비, 손실 한도, 포트폴리오 비중, 데이터 최신성을 계산한다.

## Background

SALT는 사용자의 주문을 실행하지 않고, 외부 앱에서 주문하기 전 리스크를 점검한다. 서버는 사용자 보유 자산과 프로필 한도를 기준으로 계산 결과와 경고를 반환해야 한다.

## Requirements

- `POST /api/trade-preflight`는 인증 사용자 기준으로 계산한다.
- body는 `symbol`, `entryPrice`, `stopPrice`, `takeProfitPrices`, `amount`, `mode`를 Zod로 검증한다.
- `riskRewardRatio`, `maxLossAmount`, `maxLossRate`, `projectedWeight`, `maxSingleAssetWeight`를 계산한다.
- `portfolioImpact`는 현재 총액, 기존 종목 가치, 추가 진입 후 총액/종목 가치/비중을 포함한다.
- `checklist`는 손절 기준, 손익비, 집중도 기준을 포함한다.
- 응답은 항상 `orderExecution: false`를 포함한다.

## Acceptance Criteria

- [ ] route가 `/api/trade-preflight`에 등록된다.
- [ ] 인증 사용자 `userId`로 portfolio/profile/market 데이터를 조회한다.
- [ ] 손절가 누락, 낮은 손익비, 비중 초과, stale price 경고가 반환된다.
- [ ] service는 Express request/response에 의존하지 않는다.
- [ ] 주문 실행 side effect가 없다.

## Notes

- 구현 위치: `salt-server/src/modules/trade-preflight/**`
