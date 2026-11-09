---
id: SRV-REQ-042
feature: F011
area: server
kind: API
title: "국내 주식 시장 요약 — 코인 요약 띠와 같은 모양(대표 지수 · 작은 칸 · 오늘의 시장)"
priority: high
created: 2026-10-30
status: done (2026-11-02 — 원/달러 칸은 범위에서 뺌)
source: 사용자 "국내주식도 주식 홈에서 코인처럼 주요 그게 보여야 하고 정보들 코인처럼 똑같이"
---

## Summary

`/investments` 코인 탭 위에는 시장 요약 띠(`SRV-REQ-036` `GetMarketSummary`)가 있다 — 대표 1(큰 스파크라인) + 작은 칸 9(3×3, 스파크라인 ·
등락) + 오늘의 시장 상자(상승 · 보합 · 하락 · 소식). 국내 주식 탭은 같은 자리에 **코스피 · 코스닥 큰 상자 두 개**(`KrIndexSummary`)뿐이다.
같은 응답 모양(`MarketSummaryView`)으로 국내 요약을 주어, 프론트가 **같은 띠 컴포넌트**로 그리게 한다. 무엇을 보일지는 서버가 정한다.

> **구현 2026-11-02** (`feat/kr-market-summary` `8d210740`). 유스케이스 `market/application/GetKrMarketSummary.ts` · 도메인 `KrMarketSummary.ts` ·
> 경로 `krStock.routes.ts` `/summary`. 검증 `salt-server/requirements/reports/checklists/SRV-REQ-042.md`. 원/달러 칸은 범위에서 뺐다(FR-3).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `GET /api/market/kr/summary` — 소유자 전용(국내 시세 규칙, 아니면 404) · 국내 기능 꺼짐이면 `UNAVAILABLE`(503). 응답은 `MarketSummaryView` 와 같은 열 + `assetClass: "kr_stock"` | **완료** — 칸마다 `kind`(`index` · `stock`) 추가(지수 칸은 상세가 없어 링크가 없다) · `sparklineDate`(선이 그린 KST 날짜) |
| FR-2 | **대표** = 설정 `KR_SUMMARY_FEATURED`(기본 코스피 지수). 값 · 등락은 `kr_index_quotes`, 스파크라인은 오늘 장중 지수 분 기록(`DB-REQ-035`) | **완료** — 분 기록을 5분 칸 마지막 값으로 줄인다(종목 5분봉과 같은 간격, 390 → 78점). 고가 · 저가 · 거래대금도 지수 행에서(`DB-REQ-035` FR-5). 설정 지수는 조립 지점이 수집 대상(`KIS_SUMMARY_INDICES`)에 더한다 |
| FR-3 | **작은 칸** = 설정 `KR_SUMMARY_ITEMS`(기본: 코스닥 · ~~원/달러~~ · 보유 상위 → 관심 → 시총 상위 순으로 채워 9칸). 종목 칸 스파크라인은 저장된 국내 5분봉(`price_history kr_stock 5m`) — **요청 때 KIS 를 부르지 않는다**(국내 읽기 경로 원칙 · 80ms). 5분봉이 없는 종목은 `sparkline: null`(칸은 남는다) | **완료** — 코스닥 + 유니버스 순서 8종목 = 9칸. ~~원/달러~~ **없음**: KIS 환율 TR(`FHKST03030100` `FX@KRW`)이 모의 키를 거부한다(`EGW02004` 2026-11-02 실측). 예측 DB 의 ECB 일 기준 환율은 며칠 늦은 하루 값이라 장중 칸에 맞지 않는다 **사용자 결정 2026-11-02: 범위에서 뺌** — 실전 키는 쓰지 않는다(2026-10-29 결정, 계좌 노출). 모의 키로 안 되는 칸은 두지 않는다 |
| FR-4 | 5분봉 수집 대상에 요약 칸 종목을 넣는다(지금 일부 종목만) — `kr-stock.worker` 유니버스 순서 맨 앞 | **완료(코드 변경 없음)** — 요약 칸 종목 = 유니버스(보유 → 관심 → 시총) **앞 8개**라 5분봉 · 현재가 수집이 이미 그 종목부터 돈다. 실측 8종목 전부 당일 57봉 |
| FR-5 | **오늘의 시장** = `breadth` 는 코스피 · 코스닥 상승 · 보합 · 하락 합(지수 행의 `advancers` 등), `headlines` 자리는 **다가오는 국내 일정 3건**(`SRV-REQ-041` FR-5 와 같은 읽기). 국내 뉴스는 수집하지 않으므로 소식 줄을 지어내지 않는다(**2026-11-06** — F016 단계 B 가 KIS 시황/공시 제목 수집을 연다 `SRV-REQ-051` FR-1. 그때 이 칸을 다시 본다) — 일정이 없으면 빈 배열 | **완료** — 일정은 `headlines` 를 덮지 않고 **`schedule` 필드**로(모양이 다르다 — 기사 vs 일정). `headlines` 는 늘 빈 배열. 찾는 창 35일 |
| FR-6 | 태그 · 등락 금액 판정은 코인과 같은 도메인 함수(`MarketSummary.ts`) — 국내 등락은 전일 종가 대비(24시간 아님). 라벨 키를 `change24h` 그대로 쓰지 않고 `changeBasis: "prev_close"` 를 둔다 | **완료** — 태그 `summaryTagsOf` 그대로(임계 `KR_SUMMARY_WIDE_MOVE_RATE` 기본 5). 금액은 역산하지 않고 저장된 전일 대비 값. 열 이름은 코인과 같게 두고(같은 컴포넌트) 뜻은 `changeBasis` 가 말한다 |
| FR-7 | `degraded` — 지수 분 기록 · 5분봉 중 못 받은 것이 있으면 `true`. 전체 실패시키지 않는다 | **완료** — 일정 읽기 실패 · 선 없는 칸도 `degraded` |
| FR-8 | 성능 — DB 읽기만, ~~쿼리 4회 이하~~, 100ms. Swagger | **완료 · 정정 2026-11-02**: 쿼리 **8회를 2파동 병렬**(지수 행 · 분 기록 · 유니버스 3 · 일정 → 종목 시세 · 5분봉). 유니버스 해석을 줄이려면 수집 워커와 공유하는 캐시가 필요해 이 REQ 밖. 실측 30회 p50 15ms · p95 45ms(서버 직접). Swagger `KrSummaryItem` 스키마 생성 확인 |

## 계약 영향

- DB `DB-REQ-035` · BFF `BFF-REQ-044` · 프론트 `FE-REQ-050`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | 구현 · in-progress. FR-3 원/달러 미구현(모의 키 거부) · FR-4 코드 변경 없음 · FR-5 `schedule` 필드 · FR-8 쿼리 수 정정. 같은 커밋에서 KIS 지수 고가 · 저가 · 거래대금(`KisClient.indexQuote`) · 분 기록 쓰기(`PollKrIndices`) · 정리 작업(`PruneKrIndexTicks`, 워커 15:50) |
| 2026-11-02 | done. FR-3 원/달러 칸을 범위에서 뺌(사용자 "안되는 것들은 빼 실전키 안할거니까" — 실전 키 미사용은 2026-10-29 결정) |
| 2026-11-06 | 서버 S2c(notification, 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md`): 파일만 걸침 — `composition.ts` 에서 notification 조립 삭제 · coach 통보를 `OutboxDecisionChangeNotifier` 로 |
| 2026-11-06 | 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`): 변경 없음(이 REQ 몫) — 같은 파일 `composition.ts` 에서 온보딩 조립 · 플랫폼 클라이언트 삭제 `7f2ba1ed` |
| 2026-11-06 | F016 기획 — 국내 소식 원천(KIS 시황/공시 제목)이 `SRV-REQ-051` FR-1 로 계획됨. FR-5 "국내 뉴스 수집 안 함"에 언제 바뀌나 표기 |
| 2026-11-06 | F016 단계 A — 요약 응답에 `marketActions`(오늘 시장 조치, 못 읽으면 빈 배열 + `degraded`). 주인은 `SRV-REQ-051` FR-3 · 루트 `requirements/specs/done/F016-A-market-status-tags-slice.md` |
| 2026-11-06 | 파일만 걸침(F016 단계 B) — `composition.ts`(머리에 이 REQ) 에 등락 원천 저장소 · 광고성 패턴 조립(`SRV-REQ-051`). 요약 띠 무변경. 루트 `requirements/specs/done/F016-B-kr-news-flows-slice.md` |
| 2026-11-09 | 조립 지점에 예측 뷰 어댑터 둘 · 카드 문턱 설정(F016 단계 C) — 요약 띠 무변경 |
