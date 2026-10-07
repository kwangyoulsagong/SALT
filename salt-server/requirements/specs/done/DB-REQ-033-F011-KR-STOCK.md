---
id: DB-REQ-033
feature: F011
area: db
kind: SCHEMA
title: "F011 국내 주식 스키마 — AssetType kr_stock · 마스터 · 현재가 · 외부 토큰 · 개장일 달력"
priority: high
created: 2026-10-07
source: pm/requirements/specs/in-progress/FEATURE-011-kr-stock-kis.md §서버/DB
---

## Summary

마이그레이션 `20261007140000_kr_stock_foundation`(추가만). `DB-REQ-003` 이 미뤄 둔 `AssetType` 확장을 `kr_stock` 값 추가로 닫는다 —
`stock` 은 미국 주식 의미를 유지한다(Shared Kernel 세 값 `crypto · kr_stock · us_stock` 과 맞춘다).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'kr_stock'` — 국내 주식 일봉 · 5분봉은 `price_history(asset_type=kr_stock)` 재사용, unique 키 그대로 | 완료 |
| FR-2 | `kr_stock_master`(code PK · 표준코드 · 이름 · 시장 · 그룹 · 업종 · 기준가 · 상장주수 · 전일 시총 원 · 거래정지 · 관리 · 경고 · 과열 · 우선주 · 상장일 · 상폐일 · 동기화 시각) · 인덱스 `(group_code, market_cap)` — 시총 상위 N 역순 스캔 | 완료 |
| FR-3 | `kr_stock_quotes`(code PK → master FK cascade) — 현재가 · 대비 · 등락률 · 누적량 · 거래대금 · 시총 · 기준가 · 상하한 · 상태/경고 코드 · 거래정지 · PER/PBR/EPS/BPS · 52주 · 외국인 소진율 · `feed` · 갱신 시각 | 완료 |
| FR-4 | `external_api_tokens`(provider, token_type PK) — 접근 토큰 · WS 승인키. 평문(소유자 1인 운영 — Open Question) | 완료 |
| FR-5 | `market_holidays`(market, date PK) — 개장 · 거래일 · 영업일 · 결제일 플래그 · 출처(`kis` · `candles` · `probe`). KIS 원문을 역산 · 관측이 덮지 않는다. 전망(`salt-forecast`)이 읽을 표 | 완료 |
| FR-6 | 정밀도 — 금액 `Decimal(38,10)` · 비율(등락률 · PER · PBR · 소진율) `(18,8)` | 완료 |

## 왜 `MarketAsset` 이 아닌가

`MarketAsset` 을 읽는 코인 경로 — `markDelistedExcept`(업비트 목록에 없으면 비활성) · `activeSymbols()`(1분 시세 · 지표) ·
`findPage` · `breadth` · 고래 — 가 `asset_type` 을 거르지 않는다. 국내 주식 행이 거기 들어가면 6시간마다 꺼지고, 업비트에 6자리
코드를 묻고, 비소유자 시장표에 섞인다. 코인 쿼리 8곳을 고치는 대신 표를 나눠 회귀를 0 으로 둔다.

## 롤백

`DROP TABLE kr_stock_quotes, kr_stock_master, external_api_tokens, market_holidays;`. enum 값은 Postgres 에서 뺄 수 없다 —
`kr_stock` 행을 지우고(`price_history` 국내 주식 행) 값은 미사용으로 둔다. 원장 3종 기존 행 영향 0.
