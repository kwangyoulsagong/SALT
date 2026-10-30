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
| FR-7 | `kr_index_quotes`(code PK — KIS 업종 코드) — 값 · 전일 대비(포인트 `Decimal(18,4)`) · 등락률 `(18,8)` · 상승 · 보합 · 하락 종목 수 · 갱신 시각. 지수 2~3행이라 인덱스는 PK 뿐(슬라이스 6 · `SRV-REQ-040` FR-49) | 완료 2026-10-26(`20261026180000_kr_index_investor_flows`) |
| FR-8 | `kr_stock_investor_flows`((code, trade_date) PK → master FK cascade) — 개인 · 외국인 · 기관 순매수 수량 `BIGINT` · 금액 원 `Decimal(38,10)` · 수집 시각. 읽기는 한 종목 최근 N거래일(`code = ? ORDER BY trade_date DESC LIMIT N`)이라 PK 가 그대로 받는다 — 별도 인덱스 없음. 쓰기는 종목마다 `unnest` 한 문장 upsert(같은 키는 덮는다 — 잠정치 → 확정치). 크기: 유니버스 약 50종목 × 거래일 하나씩 늘어 1년 약 12,500행(슬라이스 6 · `SRV-REQ-040` FR-50) | 완료 2026-10-26(같은 마이그레이션) |
| FR-9 | `kr_stock_quotes` 시간외 단일가 칸 5개 — `after_hours_price` · `after_hours_change`(원 `Decimal(38,10)`) · `after_hours_change_rate`(`(18,8)`) · `after_hours_volume`(`BIGINT`) · `after_hours_at`(받은 회차 시각). 전부 nullable 추가라 기존 행 · 쓰기 경로 무변경. 쓰기는 회차마다 `unnest` 한 문장 `UPDATE … FROM`(정규장 칸은 건드리지 않는다 · 현재가 행이 없는 종목은 버린다). 읽기는 기존 시세 조회가 같은 행에서 함께 읽어 쿼리 수 무변경(슬라이스 6b · `SRV-REQ-040` FR-52) | 완료 2026-10-27(`20261027120000_kr_stock_after_hours` · 로컬 적용) |

## 왜 `MarketAsset` 이 아닌가

`MarketAsset` 을 읽는 코인 경로 — `markDelistedExcept`(업비트 목록에 없으면 비활성) · `activeSymbols()`(1분 시세 · 지표) ·
`findPage` · `breadth` · 고래 — 가 `asset_type` 을 거르지 않는다. 국내 주식 행이 거기 들어가면 6시간마다 꺼지고, 업비트에 6자리
코드를 묻고, 비소유자 시장표에 섞인다. 코인 쿼리 8곳을 고치는 대신 표를 나눠 회귀를 0 으로 둔다.

## 롤백

`DROP TABLE kr_stock_investor_flows, kr_index_quotes, kr_stock_quotes, kr_stock_master, external_api_tokens, market_holidays;`(슬라이스 6 두 표만 되돌리면 앞의 둘만). enum 값은 Postgres 에서 뺄 수 없다 —
`kr_stock` 행을 지우고(`price_history` 국내 주식 행) 값은 미사용으로 둔다. 원장 3종 기존 행 영향 0.

## Changelog

- 2026-10-27: 슬라이스 6b — FR-9 `kr_stock_quotes` 시간외 칸 5개(nullable 추가만 · 로컬 적용 · 롤백 SQL 은 마이그레이션 머리). 새 인덱스 없음 — 기존 PK 행에서 함께 읽고 쓴다
- 2026-10-26: 슬라이스 6 — FR-7 `kr_index_quotes` · FR-8 `kr_stock_investor_flows`(새 표 2개, 기존 표 무변경 · 로컬 적용). 실행 계획: 지수는 2~3행 PK, 투자자는 PK 접두 `code` + 정렬 `trade_date DESC` 로 받는다
- 2026-10-23: 슬라이스 5f(`SRV-REQ-040` FR-42) — `price_history` 국내 일봉에 쿼리 두 개 추가(종목별 첫 · 마지막 창 종가 `LATERAL` · 한 종목 이력 교체 삭제 CTE + upsert). **DDL 없음** — 기존 유니크 `(symbol, timeframe, timestamp)` 인덱스를 쓴다(실행계획은 `SRV-REQ-040` 체크리스트)
- 2026-10-07: 초판 · FR-1~6 완료
- 2026-10-23: `kr_stock_master.is_liquidation BOOLEAN NOT NULL DEFAULT false`(`20261023120000_kr_stock_master_liquidation`) — 정리매매(`FC-REQ-020` FR-9). 추가만 · 롤백 = 컬럼 DROP · 로컬 적용 · 마스터 1회 동기화로 3종목 Y
- 2026-10-08: `kr_stock_quotes` 에 `open_price` · `high_price` · `low_price`(Decimal 38,10, nullable) — 마이그레이션 `20261008100000_kr_stock_quote_ohlc`(로컬 `migrate deploy` 적용). 열 추가만이라 롤백은 `DROP COLUMN` 셋, 기존 행 영향 0. 사유: 화면 5열(최고가 · 최저가)이 코인과 같아야 한다(`SRV-REQ-040` FR-29)
- 2026-10-08: `kr_stock_master` 에 `homepage` · `homepage_checked_at` · `logo_source` · `logo_checked_at`(전부 nullable) — 마이그레이션 `20261008120000_kr_stock_logo_source`(로컬 `migrate deploy` 적용). 로고 **출처만** 저장하고 주소(키 포함)는 저장하지 않는다 — 키가 바뀌어도 행을 고치지 않는다. 롤백은 `DROP COLUMN` 넷, 기존 행 영향 0. 사유: 흐린 로고를 종목마다 판정(`SRV-REQ-040` FR-32)

- 2026-10-26: F011 슬라이스 7d(`SRV-REQ-040` FR-47) — **DDL 없음.** `price_history` 국내 일봉(`asset_type='kr_stock'`, `timeframe='1d'`)을 전 종목 단면으로 읽는 쿼리 추가(`krDailyReturnProfiles`, 6개월 약 32만 행 · 병렬 순차 스캔 0.58초 — `asset_type` 단독 인덱스 없음, 결과는 코치 어댑터가 구간 캐시). 인덱스는 더하지 않았다(쓰기 잦은 3백만 행 표 · 요청은 달마다 한 번)
- 2026-10-30: 파일만 걸침 — `market/domain/ports.ts` 에 `WatchlistRepository.listAll` · `HoldingProbe` · 행 `isHeld?`. 스키마 · 마이그레이션 없음(`@@index([userId, assetType])` 로 충분) — F000 종목 검색 슬라이스. 루트 `requirements/specs/in-progress/F000-asset-search-slice.md`
