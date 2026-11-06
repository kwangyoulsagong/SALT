---
id: DB-REQ-041
feature: F016
area: db
kind: SCHEMA
title: "등락 원천 · 분해 · 설명 스냅샷 표(market · coach)"
priority: high
created: 2026-11-06
source: pm/requirements/specs/in-progress/FEATURE-016-why-moved.md
---

## Summary

`FEATURE-016` 표. 주인은 market(원천) · coach(스냅샷) — Express Prisma(S5 · S6 전), 이전 단계에서 Flyway 로(`DB-REQ-036` FR-4). 금액 열 0(%p · 수량 · 원 단위 수급은 NUMERIC).

## FR

| FR | 표 | 주인 | 내용 |
|---|---|---|---|
| FR-1 | `kr_news_title` | market | 원천 일련번호 PK · 제공처 · 시각 · 제목 · 대분류 · 관련 코드(최대 10 → 별 연결 표 `kr_news_title_symbol`) · 광고성 표시. **본문 열 0**. 보관 30일(정리 워커 나눠 지우기) · 인덱스 (종목 · 시각 desc) |
| FR-2 | `kr_vi_event` | market | (종목 · 발동 시각) 유일 · 정적/동적 · 해제 시각 · 발동가 · 괴리율 · 횟수 |
| FR-3 | `kr_market_action` | market | 시장(코스피 · 코스닥) · kind(circuit_breaker · sidecar) · 단계 · 방향 · 시작 · 끝 · source(feed · inferred) |
| FR-4 | `kr_sector_index_quote` · `kr_sector_index_daily` | market | 업종 코드 · 값 · 등락 · 시각 / 일별 종가 |
| FR-5 | `kr_flow_intraday` | market | 종목 · 시각 · 외국인 · 기관 · 개인 · 프로그램 순매수(수량 · 금액 NUMERIC). 하루 지나면 일별 표(`kr_stock_investor_flows`)가 정본 — 7일 보관 |
| FR-6 | `kr_stock_quotes` 열 추가 | market | `vi_code` · `caution_flag` · `managed_flag` · `liquidation_flag` · `short_overheat_flag` · `last_trade_at` — 2단계 아님(추가만) |
| FR-7 | 코인 마켓 경보 | market | 기존 코인 마켓 표에 유의 · 주의 플래그 열 추가(어느 표인지는 착수 때 — `MarketAsset` 의 고래 · 폭 경로가 `asset_type` 을 거르지 않는 문제 `DB-REQ-033` 확인) |
| FR-8 | `move_explanation` | coach | 종목 · 자산군 · 거래일 · 사실 지문 · 문장 · 인용 id 배열 · 모델 · 게이트 · 생성 시각. 불변(UPDATE 차단 트리거 — 판정 원장과 같은 방식) · (종목 · 거래일 · 지문) 유일 |
| FR-9 | 교차 스키마 조인 0 — coach 는 market 공개 API 로만 읽는다(`msa-services.md` §5) | — | — |

## Acceptance Criteria

- [ ] 마이그레이션 목적 하나씩(표 추가 · 열 추가 분리) · 롤백 SQL
- [ ] 본문 열 0(스키마 grep) · `move_explanation` UPDATE 실패 테스트
- [ ] 새 쿼리 EXPLAIN(종목 · 시각 인덱스)

## 계약 영향

- `SRV-REQ-051` · `SRV-REQ-052` · `DB-REQ-036` 부록 A(주인 표에 행 추가)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규(to-do) |
