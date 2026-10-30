---
id: SRV-REQ-042
feature: F011
area: server
kind: API
title: "국내 주식 시장 요약 — 코인 요약 띠와 같은 모양(대표 지수 · 작은 칸 · 오늘의 시장)"
priority: high
created: 2026-10-30
source: 사용자 "국내주식도 주식 홈에서 코인처럼 주요 그게 보여야 하고 정보들 코인처럼 똑같이"
---

## Summary

`/investments` 코인 탭 위에는 시장 요약 띠(`SRV-REQ-036` `GetMarketSummary`)가 있다 — 대표 1(큰 스파크라인) + 작은 칸 9(3×3, 스파크라인 ·
등락) + 오늘의 시장 상자(상승 · 보합 · 하락 · 소식). 국내 주식 탭은 같은 자리에 **코스피 · 코스닥 큰 상자 두 개**(`KrIndexSummary`)뿐이다.
같은 응답 모양(`MarketSummaryView`)으로 국내 요약을 주어, 프론트가 **같은 띠 컴포넌트**로 그리게 한다. 무엇을 보일지는 서버가 정한다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/market/kr/summary` — 소유자 전용(국내 시세 규칙, 아니면 404) · 국내 기능 꺼짐이면 `UNAVAILABLE`(503). 응답은 `MarketSummaryView` 와 같은 열 + `assetClass: "kr_stock"` |
| FR-2 | **대표** = 설정 `KR_SUMMARY_FEATURED`(기본 코스피 지수). 값 · 등락은 `kr_index_quotes`, 스파크라인은 오늘 장중 지수 분 기록(`DB-REQ-035`) |
| FR-3 | **작은 칸** = 설정 `KR_SUMMARY_ITEMS`(기본: 코스닥 · 원/달러 · 보유 상위 → 관심 → 시총 상위 순으로 채워 9칸). 종목 칸 스파크라인은 저장된 국내 5분봉(`price_history kr_stock 5m`) — **요청 때 KIS 를 부르지 않는다**(국내 읽기 경로 원칙 · 80ms). 5분봉이 없는 종목은 `sparkline: null`(칸은 남는다) |
| FR-4 | 5분봉 수집 대상에 요약 칸 종목을 넣는다(지금 일부 종목만) — `kr-stock.worker` 유니버스 순서 맨 앞 |
| FR-5 | **오늘의 시장** = `breadth` 는 코스피 · 코스닥 상승 · 보합 · 하락 합(지수 행의 `advancers` 등), `headlines` 자리는 **다가오는 국내 일정 3건**(`SRV-REQ-041` FR-5 와 같은 읽기). 국내 뉴스는 수집하지 않으므로 소식 줄을 지어내지 않는다 — 일정이 없으면 빈 배열 |
| FR-6 | 태그 · 등락 금액 판정은 코인과 같은 도메인 함수(`MarketSummary.ts`) — 국내 등락은 전일 종가 대비(24시간 아님). 라벨 키를 `change24h` 그대로 쓰지 않고 `changeBasis: "prev_close"` 를 둔다 |
| FR-7 | `degraded` — 지수 분 기록 · 5분봉 중 못 받은 것이 있으면 `true`. 전체 실패시키지 않는다 |
| FR-8 | 성능 — DB 읽기만, 쿼리 4회 이하, 100ms. Swagger |

## 계약 영향

- DB `DB-REQ-035` · BFF `BFF-REQ-044` · 프론트 `FE-REQ-050`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
