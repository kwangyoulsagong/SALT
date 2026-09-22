---
id: SRV-REQ-036
feature: F006
area: server
kind: API
title: "시장 요약 띠 — GET /api/investment/market/summary"
priority: high
labels: [server, market, api, config]
created: 2026-09-22
---

## Summary

투자 화면 시장 요약 띠(`FEATURE-006` FR-64~67)의 **무엇을 보여 줄지**를 서버가 정한다. 종목 · 순서는 설정,
태그 · 24시간 등락 금액은 `market` 도메인, 스파크라인은 거래소 5분봉. 공개 경로다.

## 왜

프론트가 종목 목록과 태그 임계를 상수로 들고 있으면 바꿀 때마다 화면을 배포해야 하고, 등락 금액은 프론트가
가격 × 변동률로 계산하게 된다(공통 수용 기준 3 위반). 2026-09-22 사용자 지적 — "summary 는 서버에서 줘야지".

## Requirements

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `GET /api/investment/market/summary` → `{ featured, items[], sparklineWindowMinutes, degraded }`. 공개 경로 | Must |
| FR-2 | 종목 · 순서 = 설정 `MARKET_SUMMARY_SYMBOLS`(쉼표, 첫 심볼이 `featured`). 기본 `BTC,ETH,XRP,SOL,DOGE,ADA,TRX,SUI,AVAX,LINK`(대표 1 + 9). 빈 값이면 기동 실패. 목록에 없는(비활성) 심볼은 빠진다 | Must |
| FR-3 | 태그 코드 `wide_move` = `|change24h| ≥ MARKET_SUMMARY_WIDE_MOVE_RATE`(기본 5). **방향을 말하는 태그를 만들지 않는다** | Must |
| FR-4 | `change24hAmount` = 현재가 − 현재가 / (1 + 변동률) — 도메인 `change24hAmountOf`. 원 단위 반올림은 컨트롤러 한 곳. 값이 없거나 −100% 이하면 `null` | Must |
| FR-5 | `sparkline` = 거래소 5분봉 30개 종가(시간순). **1분 캐시**, 종목별 실패는 그 항목만 `null` + `degraded: true`(오래된 캐시가 있으면 그것) | Must |
| FR-7 | 항목에 `high24h` · `low24h` · `tradeValue24h`(원 단위 반올림). `breadth` = 활성 종목의 24시간 오름 · 내림 · 그대로 수(DB `count` 셋). 실패는 `null` + `degraded` | Must |
| FR-8 | `headlines` = 대표 종목 최근 뉴스 최대 3건(`SymbolNewsPort`, 9건 받아 매체 꼬리 " - 매체"를 떼고 같은 제목을 합친다 — 도메인 `pickHeadlines`). 실패는 빈 배열 + `degraded` | Must |
| FR-6 | 가격 · 변동률은 **저장 시세**(거래소를 부르지 않는다). 실시간은 BFF WS 가 맡는다 | Must |

## 범위 밖

| 항목 | 사유 |
|---|---|
| 사유 태그 · 지수 · 환율 · 일정 | 소스 없음 (`FE-REQ-037` 범위 밖과 같다) |
| 요약 전용 가격 갱신 | 저장 시세가 오래됐으면 오래된 값이 첫 화면에 나간다 — WS 가 곧 덮는다. 목록(`overview`)처럼 배경 갱신을 붙일지는 관찰 후 |

## Changelog

- 2026-09-22 신설 (`FE-REQ-037` 서버 소유 전환)
- 2026-09-22 개정 — FR-7 · FR-8(분위기 · 뉴스 · 고가/저가/거래대금), 기본 종목 10개. 화면이 비어 보인다는 피드백
