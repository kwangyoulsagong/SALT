---
id: FE-REQ-050
feature: F011
area: frontend
kind: UI
title: "국내 주식 탭 요약 띠를 코인과 같게 — 대표 지수 · 작은 칸 9 · 오늘의 시장"
priority: high
created: 2026-10-30
source: 사용자 스크린샷(국내 탭 코스피 · 코스닥 큰 상자 두 개) · "국내주식도 … 코인처럼 똑같이 해야하고"
---

## Summary

국내 탭은 지금 `KrIndexStrip` → `KrIndexSummary`(코스피 · 코스닥 상자 2개, 각 화면 절반 폭)다. 코인 탭의 `MarketSummaryStrip`
(대표 + 3×3 + 오늘의 시장)과 **같은 컴포넌트**를 데이터 소스만 바꿔 쓴다 — `market-board` 의 원칙("자산군은 데이터 소스만 바꾼다")을 요약 띠까지.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `MarketSummaryStrip` 이 `assetClass` 를 받아 코인 · 국내 요약 조회를 고른다. 국내는 `GET /api/app/market/kr/summary`(`BFF-REQ-044`) |
| FR-2 | 칸 링크 — 종목은 `/investments/{코드}`, 지수 · 환율 칸은 링크 없음(셰브론 없음) |
| FR-3 | 등락 표기 — `changeBasis: prev_close` 면 "전일 대비" 라벨(코인은 24시간) |
| FR-4 | 오늘의 시장 상자 — 상승 · 보합 · 하락 막대 + **다가오는 국내 일정 3건**(날짜 · 종류 · D-day). 일정 0건이면 소식 줄 자리를 숨긴다 |
| FR-5 | 머리 띠(`judgment-overview` — 목표 비중 · 위험 · 판정 성적표)도 국내 탭에 — 성적표는 `kr_stock.` 그룹만, 목표 비중 칸은 국내 값이 없으면 칸을 숨긴다(코인 숫자를 국내 탭에 두지 않는다) |
| FR-6 | 실패 · 503 · 404 면 띠를 그리지 않는다(코인 FR-8 과 같다). 불러오는 동안 자리 고정 |
| FR-7 | `KrIndexSummary` 큰 상자는 지운다(지수는 대표 · 작은 칸으로 들어간다) — 주인 REQ `FE-REQ-041` FR-31 Changelog |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
