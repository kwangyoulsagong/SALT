---
id: BFF-REQ-002
title: Investment Coach BFF > 외부 주문 전 체크 화면 계약
priority: high
labels: [API 연동, 계약 정의]
created: 2026-05-25
---

## Summary

BFF는 서버 trade preflight 계산 결과를 외부 주문 전 확인 화면에서 쓰는 checklist view model로 변환한다.

## Background

SALT는 주문을 실행하지 않는다. 사용자가 외부 거래소/증권 앱으로 이동하기 전에 손절가, 손익비, 비중 한도, 데이터 최신성을 점검해야 한다.

## Requirements

- `POST /api/app/trade-preflight`는 인증 토큰을 서버에 전달하고 `/trade-preflight`를 호출한다.
- 응답에는 `orderExecution: false`를 포함한다.
- 서버 checklist item의 `passed` 값을 기반으로 UI severity를 `ok` 또는 `warning`으로 변환한다.
- `calculation`, `portfolioImpact`, `warnings`, `dataFreshness`는 화면에서 검토할 수 있게 전달한다.

## Acceptance Criteria

- [ ] BFF route가 `/api/app/trade-preflight`에 등록된다.
- [ ] 응답에 주문 실행 성공/실패 상태가 없다.
- [ ] checklist item에 UI severity가 포함된다.
- [ ] backend error는 controller에서 삼키지 않고 공통 error middleware로 전달된다.

## Notes

- 구현 위치: `bff/src/rest/routes/trade-preflight.routes.ts`, `bff/src/rest/controllers/trade-preflight.controller.ts`, `bff/src/services/app-trade-preflight.service.ts`
