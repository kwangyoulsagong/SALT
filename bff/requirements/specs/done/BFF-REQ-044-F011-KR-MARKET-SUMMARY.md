---
id: BFF-REQ-044
feature: F011
area: bff
kind: API
title: "국내 주식 시장 요약 중계 — 코인 요약과 같은 뷰모델"
priority: high
created: 2026-10-30
status: done (2026-11-02)
source: salt-server/requirements/specs/done/SRV-REQ-042-F011-KR-MARKET-SUMMARY.md
---

> **구현 2026-11-02** (`feat/kr-market-summary` `2018f8c6`). `app-kr-stock.service.ts` `getSummary` · `kr-stock.viewmodel.ts` `toKrMarketSummaryVM` ·
> 경로 `/api/app/market/kr/summary`. 검증 `bff/requirements/reports/checklists/BFF-REQ-044.md`.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/app/market/kr/summary` → 서버 `GET /api/market/kr/summary`. 뷰모델은 코인 `GET /api/app/market/summary` 와 **같은 타입**(`packages/core`) + `assetClass` · `changeBasis` | **완료 · 정정 2026-11-02**: 같은 **이름 · 뜻**(`name` · `currentPrice` · `change24h` · `change24hAmount` · `tags` · `sparkline` · `high24h` …) + `kind` · `sparklineDate` · `schedule`. ~~같은 타입(`packages/core`)~~ — BFF 는 pnpm 워크스페이스 밖이라 코인 뷰모델도 BFF · 프론트 두 곳이다(`market-summary.viewmodel.ts` 머리). 국내 계약 타입은 `@repo/core/marketKr` `KrMarketSummary` 에 한 벌, 화면 칸 모양으로 옮기는 것은 프론트 `toMarketSummaryItem` |
| FR-2 | 404 · 503 그대로. BFF 캐시 없음(소유자 판정 응답 — `performance-bff.md` §4) | **완료** — 기존 국내 읽기 규칙 그대로: 404 는 올리고, 503 `KR_STOCK_DISABLED` 는 200 `disabled`, 그 밖의 5xx · 계약 깨짐은 `unavailable` |
| FR-3 | 원 단위 반올림은 서버가 한 값 그대로 — BFF 는 금액을 바꾸지 않는다 | **완료** — 모르는 태그 · 일정 종류는 버리고, 점 하나 선은 `null`, 서버 `degraded` 는 그대로 |
| FR-4 | 실시간 — 작은 칸 종목 가격은 기존 국내 WS 중계(`assetType: kr_stock`)로. 지수는 1분 재조회(프론트) | **완료(BFF 변경 없음)** — 기존 `kr-stream.manager` 를 프론트가 종목 칸 코드로 구독 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 구현 · done. FR-1 "같은 타입(packages/core)" 을 "같은 이름 · 뜻 + 국내 계약은 core 한 벌"로 정정. 테스트 6(뷰모델 5 · 서비스 1) |
| 2026-11-06 | F016 단계 A — 국내 요약 뷰모델에 `marketActions`(모르는 kind 버림 · 모양이 틀린 행은 계약 오류). 주인 `BFF-REQ-051` FR-2 · 루트 `requirements/specs/done/F016-A-market-status-tags-slice.md` |
