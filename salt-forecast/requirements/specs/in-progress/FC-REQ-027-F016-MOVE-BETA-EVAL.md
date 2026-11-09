---
id: FC-REQ-027
feature: F016
area: forecast
kind: DATA
title: "등락 분해 β(국내 지수 · 업종 · 코인 BTC) · 설명 품질 평가 표본 · 지표"
priority: medium
created: 2026-11-06
source: pm/requirements/specs/in-progress/FEATURE-016-why-moved.md
---

## Summary

`FEATURE-016` FR-2 의 β 와 FR-11 의 평가. 예측 배치가 일 1회 β 를 내고(export 뷰로 서버가 읽는다), 평가 표본 · 지표 도구를 둔다. 시점 고정(`time-and-leakage.md`) — β 는 그날 이전 자료로만.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 국내 β — 종목 × (소속 지수 · 업종 지수) 지난 120 거래일 일간 회귀(창 · 최소 표본은 설정). 표본 부족 = 행 없음(서버가 β=1) |
| FR-2 | 코인 — 기존 `v_realized_vol.btc_beta`(90일) 재사용. 새 계산 0 |
| FR-3 | export 뷰 `forecast.v_move_beta_export`(종목 · 자산군 · 지수 β · 업종 β · as_of · 표본 수) — 사용자 열 0 |
| FR-4 | 평가 표본 — 지난 1년 큰 등락일(국내 · 코인 각 N, 카드 조건과 같은 규칙) 추출 · 사람 표시 양식(사실 목록 + 문장 → 충실 · 인과 단정 · 지어냄) |
| FR-5 | 지표 — 인용 충실도 · 인과 단정 0 비율 · "소식 없음" 정직률 · 소식 매칭 비율 · 분해 몫 분포(시장 몫이 지배적인 날 비율). 리포트 `reports/move-explain-*.md` |
| FR-6 | ~~사전 등록 — ③ 켜기 문턱을 평가 전에 적는다~~ **2026-11-06 사용자 결정**: 켜기 조건이 아니다 — 운영 중 주간 리포트(충실도 · 정직률)와 "나빠짐" 기준만 적는다(끄기 판단용) |

## 진행 — 단계 C done(2026-11-09)

| FR | 상태 | 구현 |
|---|---|---|
| FR-1 국내 β | done | `domain/move_beta.py` `regression_betas` — 종목 일간 로그수익률 = a + β_시장 × 지수 + β_업종 × (업종 − 지수), 세 시계열 공통일만 · 끊김을 건너는 수익률 제외 · 창 120 / 최소 60(설정 `move_beta_*`). 업종 이력이 모자라면 시장 한 요인(시장 β 까지 버리지 않는다). 업종 = 중분류 우선(서버와 같은 표 테스트) |
| FR-2 코인 β | done | `realized_vol.btc_beta` as_of 이하 최신을 옮긴다(새 계산 0) |
| FR-3 export 뷰 | done | `forecast.v_move_beta_export` — + 평소 변동 σ60(일간 단순수익률 표준편차, 서버 카드 조건 재료 — 요청 때 집계하지 않게) |
| FR-4~6 | 단계 D 뒤 | — |

- 작업 `jobs/move_beta.py` — `daily.sh` 의 `volatility` 뒤. 2,920종목 11초(dry-run) · 국내 β 2,588 · 업종 β 794 · σ 2,595 · 코인 β 286
- 읽기 원천 `public.kr_sector_index_daily`(서버가 KIS 에서 받은 지수 · 업종 일별) · `kr_stock_master`(시장 · 업종) — `security-sources.md` 표 행
- 루트 `requirements/specs/done/F016-C-move-split-facts-slice.md`

## Acceptance Criteria

- [x] β 시점 고정 테스트(as_of 다음 날 자료 0) — `tests/leakage/test_move_beta_leakage.py`
- [x] 뷰가 사용자 열 0 · 서버 계정 읽기 권한만(로컬은 한 계정 — 운영 권한은 `DB-REQ-036`)
- [ ] 평가 리포트 한 번 — 국내 · 코인 표본 · 문턱 대비 결과

## 계약 영향

- 서버 `SRV-REQ-051`(β 읽기) · `SRV-REQ-052`(켜기 조건) · DDL 주인(`ADR-007` — S5 전 `salt-server/prisma`)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규(to-do) |
| 2026-11-06 | 사용자 결정 — 평가는 켜기 문턱이 아니라 운영 모니터링 |
| 2026-11-09 | in-progress — 단계 C(FR-1~3) done. σ60 을 export 뷰에 더함(카드 조건 재료) |
