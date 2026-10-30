---
id: BFF-REQ-044
feature: F011
area: bff
kind: API
title: "국내 주식 시장 요약 중계 — 코인 요약과 같은 뷰모델"
priority: high
created: 2026-10-30
source: salt-server/requirements/specs/to-do/SRV-REQ-042-F011-KR-MARKET-SUMMARY.md
---

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/market/kr/summary` → 서버 `GET /api/market/kr/summary`. 뷰모델은 코인 `GET /api/app/market/summary` 와 **같은 타입**(`packages/core`) + `assetClass` · `changeBasis` |
| FR-2 | 404 · 503 그대로. BFF 캐시 없음(소유자 판정 응답 — `performance-bff.md` §4) |
| FR-3 | 원 단위 반올림은 서버가 한 값 그대로 — BFF 는 금액을 바꾸지 않는다 |
| FR-4 | 실시간 — 작은 칸 종목 가격은 기존 국내 WS 중계(`assetType: kr_stock`)로. 지수는 1분 재조회(프론트) |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
