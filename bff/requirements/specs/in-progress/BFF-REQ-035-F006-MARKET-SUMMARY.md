---
id: BFF-REQ-035
feature: F006
area: bff
kind: API
title: "시장 요약 띠 뷰모델 + WS 시세 등락 금액"
priority: high
labels: [bff, market, viewmodel, websocket]
created: 2026-09-22
---

## Summary

`GET /api/app/market/summary` — 서버 `SRV-REQ-036` 을 화면 계약으로 좁힌다. 그리고 WS `price_update` 에
거래소 등락 금액(`signed_change_price`)을 `change24hAmount` 로 싣는다 — 띠의 등락 금액이 실시간으로 따라간다.

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `GET /api/app/market/summary` 공개. **`/:symbol`(인증)보다 앞에** 등록한다 — 뒤면 `summary` 가 심볼로 잡혀 401 | Must |
| FR-2 | 뷰모델: `name`(한글 이름, 없으면 심볼) · 모르는 태그 코드 버림 · 점 2개 미만 스파크라인은 `null`. **계산 없음** | Must |
| FR-3 | 실패는 error middleware(서버 4xx 보존 · 그 외 502/504) | Must |
| FR-4 | WS `price_update.data.change24hAmount` = 거래소 `signed_change_price`. 추가 필드 — 기존 소비처 영향 없음 | Must |

## Changelog

- 2026-09-22 신설 (`FE-REQ-037` 서버 소유 전환)
