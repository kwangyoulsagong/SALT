---
id: SLICE-F004-CHART-WEEK-TAB
title: "F004 슬라이스 19 — 상세 차트 1주 탭 (서버 · BFF · FE)"
priority: medium
labels: [F004, slice, server, bff, fe, chart]
created: 2026-10-30
---

## Summary

**F004 FR-27 의 마지막 칸 — 기간 탭 6개(1분~1주).** 상세 분석 차트는 탭 5개였고 1주가 빠진 이유는 서버 차트가
`minute` · `day` 만 줬기 때문이다(`chartTimeframes.ts` 주석). Upbit 에 주봉(`/candles/weeks`)이 있어 서버가 `week` 를 열고,
BFF 가 같은 목록으로 통과시키고, 프론트가 탭 한 줄을 더했다. 사용자 "새브랜치 파고 다음꺼 진행" — 마스터 인덱스 §4-1
순위 2 "F004 부분 FR" 중 웹에서 닫을 수 있는 것.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-008` | FR-50(`week`) | `ChartPeriod.Week` · `ExchangeQuotePort.weeklyCandles`(Upbit 주봉) · `GetChartData` 분기 |
| `SRV-REQ-009` | 차트 경로 | `period=week` 계약 · Swagger enum 3종 |
| `SRV-REQ-006` | Port | 조회 메서드 1 추가(주문 메서드 0 원칙 그대로) |
| `BFF-REQ-007` · `008` | FR-52 · FR-12(개정 3종) | `CHART_PERIODS` 에 `week` · 미들웨어 테스트 신설 |
| `FE-REQ-012` | FR-2(개정 3종) | `ChartPeriod.Week` |
| `FE-REQ-026` | FR-132 | 기간 탭 6개 — 완료 |
| `FE-REQ-034` · `029` | 기록 | 엔진 무변경 · 번들 137 kB 그대로 |
| 파일만 걸침 | — | `FE-REQ-009` · `010` · `011` · `037` · `041` · `BFF-REQ-035` · `SRV-REQ-024` · `036` · `040` · `DB-REQ-003` · `033` |

## 판단 — 리뷰가 볼 곳

1. **`week` 만 열고 `month` 는 열지 않는다.** 9월 결정("목록에만 넣으면 200 을 기대하게 되고 빈 배열이 온다 — 필요해질 때
   Port 와 함께 늘린다")을 그대로 따른다. 1주 탭은 소비 화면이 있고 `month` 는 없다. `month` 는 서버 · BFF 둘 다 422 그대로
2. **주봉 응답 모양 = 일봉.** `date`(그 주 월요일 KST) · OHLCV. 그래서 BFF 는 목록 한 줄, 프론트 정규화(`date` → `timestamp`) ·
   차트 엔진(`intraday=false` 날짜 축)은 0줄이다. 새 모양을 만들면 세 영역에 분기가 생긴다
3. **영역 3개를 한 PR 로.** 계약 변경(새 `period` 값)이라 한쪽만 머지되면 다른 쪽이 422 를 받는다(`pr-convention.md` §7).
   커밋은 영역별 셋 — 서버가 열고, BFF 가 통과시키고, 프론트가 쓴다. 되돌릴 때는 FE → BFF → 서버 역순
4. **주석의 REQ 인용 정정은 별도 커밋.** 서버 주석 4곳이 주기 근거를 `FE-REQ-010` FR-50 · 51(레이아웃 FR)로 적고 있었다 →
   `SRV-REQ-008`. 동작 무변경

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `month` 주기 | 소비 화면 없음 | 월봉을 쓰는 화면이 생길 때(`SRV-REQ-008` FR-50) |
| 국내 주식 상세 1주 | 국내 차트는 별도 경로(`KrStockChart` `1d` · `5m`, DB 일봉) — 주봉은 집계가 필요 | `FE-REQ-049` FR-10(코인 · 국내 같은 차트 패널) |
| RN 1주 탭 | 앱 미착수 | `RN-REQ-020` FR-105 |
| 주봉 실시간 봉 | BFF WS 는 1분 · 5분 · 1시간만 만든다 — "실시간 아님" 표시(`FE-REQ-034` FR-64 그대로) | 해당 없음(의도) |
| 200봉 이전 과거 이동 | 서버 차트에 `to` 파라미터 없음 | `FE-REQ-034` Open Questions 서버 후속 |

검증은 `requirements/reports/checklists/F004-chart-week-tab.md`, 회고는 `requirements/reports/retrospects/F004-chart-week-tab.md`.
