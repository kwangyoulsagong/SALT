---
id: SLICE-F003-V2-S0
title: "F003 v2 순서 0 — 재기획(BTC + 코스피) · 원천 판정 · 관문 신설"
priority: medium
labels: [F003, pm, slice]
created: 2026-11-19
status: in-progress
---

## Summary

사용자 "F003 범위 = BTC + 국내 지수(코스피)". 기획서 `FEATURE-003` v2 절 · 전 영역 계획 `F003-v2-band-accumulation-global-plan.md`. 코드 변경 0 — 기획 · 원천 판정만.

## 판단

1. 국내 지수 밸류에이션 원천 = 한국은행 ECOS(코스피 PER · 배당 월 · 지수 · 시가총액 일). KRX 정보데이터시스템은 이용약관 제10조(자동 수집 금지) · KRX OPEN API 는 지수 PER 없음
2. 배수는 과거 검산 관문을 지났을 때만 — 코스피 PER 이 이익 저점에서 튄다(2020-03 14.7 · 2021-01 30.6)
3. 금액은 서버, 지표 · 검산은 예측, 화면은 투자 zone `/plan` — 온보딩 3단계 · 목표 화면 합계 · Puell 뺌

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-19 | 신규 |
