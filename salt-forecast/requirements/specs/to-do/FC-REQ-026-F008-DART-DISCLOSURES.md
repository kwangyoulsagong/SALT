---
id: FC-REQ-026
feature: F008
area: forecast
kind: DATA
title: "DART 공시 수집 O6 — 주요사항보고 · 자사주 · 임원 · 주요주주 소유 보고 → 온톨로지 · 규칙 사건 분류"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md
---

## Summary

사용자 결정(2026-10-30): *"1번은 필요하자나"* — **DART 공시 수집을 쓴다.** 2026-10-08 "DART 안 함"은 로고용 도메인 조회 맥락이었고,
FEATURE-008 FR-22 · 23 · 27 에 "DART 미사용"으로 넓게 옮겨 적힌 것을 이 결정으로 바로잡는다. 투자 동결 범위 안이다 — 기존 FR 이고 새 FR 이 아니다.

온톨로지(`FC-REQ-022` O1)가 선 뒤에 시작한다. 공시는 사람 · 기관 · 보유 관계라서 그래프 없이 넣으면 또 흩어진 테이블이 된다.

## FR

| FR | 내용 | FEATURE-008 |
|---|---|---|
| FR-1 | 키 — **무료**(금융감독원 오픈API, 회원가입 후 인증키 발급 · 이용료 0). 서버에 이미 있는 `DART_API_KEY` 슬롯을 forecast 에도(같은 키, `.env`). 키 없으면 잡이 건너뛰고 `ops_check` 에 남김 | — |
| FR-2 | 대상 — 국내 추적 유니버스(`kr_stock_master` export 뷰) 종목의 고유번호(corp_code) 매핑 · 월 1회 갱신 | — |
| FR-3 | 공시 목록 증분 수집(일 1회 + 장 마감 뒤 1회) — 접수번호 · 보고서명 · 접수일시 · 제출인. 접수일시를 `observed_at`, 수집 시각을 `ingested_at` | FR-27 |
| FR-4 | 자사주 취득 · 처분(결정 · 결과) → `company` —`traded`→ 자기 자신 · 수량 · 금액 fact | FR-22 |
| FR-5 | 임원 · 주요주주 특정증권 소유상황 보고 · 대량보유(5%) → `person`/`institution` —`holds`/`traded`→ `company` · 변동 수량 fact | FR-23 |
| FR-6 | 사건 분류 규칙 먼저 — 주요사항보고서 유형 → fact kind(≈30종, 표를 REQ 부록으로). LLM 분류 0. 분류 안 되는 보고서는 `kind:other` 로 남기고 피처 · 화면에 쓰지 않는다 | FR-27 |
| FR-7 | 실적 — 잠정실적 · IR 개최 공시는 `FC-REQ-021` 2단계가 같은 수집 결과를 읽는다(중복 수집 0) | FR-70 |
| FR-8 | 호출 한도 — 오픈API 일일 한도(공식 문서 값 확인 후 기록) 의 50% 이하로 페이서. 원문 문서(XML · ZIP) 보관은 하지 않고 필요한 필드만 | — |
| FR-9 | 누수 — 피처 · 반응 통계는 `ingested_at` 이 아니라 **공시 접수 시각 이후** 봉부터(`time-and-leakage.md` §1). 장중 접수면 그날 봉은 접수 전 가격 포함 → 다음 봉 기준 |
| FR-10 | 화면 노출은 이 REQ 범위 밖 — 기존 사건 카드 · 해설이 온톨로지를 읽을 때 따라온다. 반응 분포는 소유자 전용(ADR-003) |

## Acceptance Criteria

- [ ] 키 없음 · 한도 초과 · 장애 시 다른 잡 정상(격리)
- [ ] 재수집 2회 후 엔티티 · 관계 중복 0
- [ ] 누수 테스트 — 접수 전 봉에 공시 피처 0
- [ ] 분류 표 부록 · `other` 비율 기록

## 계약 영향

- DDL(온톨로지 테이블 재사용 — 새 테이블은 corp_code 매핑 1개) · `FC-REQ-021` 2단계 시작 조건 해소

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) — DART 사용 결정 |
