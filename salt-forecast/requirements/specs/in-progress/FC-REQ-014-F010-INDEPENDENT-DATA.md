---
id: FC-REQ-014
feature: F010
area: forecast
kind: FUNC
title: "F010 슬라이스 6 — 독립 데이터 1차: Deribit DVOL(dvol-sigma@1) · 업비트 거래 유의/주의 스냅샷(market-warning@1)"
priority: high
created: 2026-09-30
source: pm/requirements/specs/in-progress/FEATURE-010-judgment-engine-v2.md 기능 요구 7 · 리서치 §7-4 · §10 슬라이스 6
---

## Summary

리서치 §10 슬라이스 6(독립 데이터) 중 **공개 API 2종**만 먼저 한다(사용자 결정 2026-09-30). 업비트 공지 JSON 은
2026-09-23 결정대로 쓰지 않는다(`security-sources.md` §1). Coin Metrics · 도미넌스 · 데이터랩 · 뉴스 구조화는 뒤 슬라이스.

1. **DVOL** — 리서치 분류는 "방향 0 · 사이징"이다. 그래서 방향이 아니라 **목표 비중 σ 를 더 잘 맞히나**를 사전등록
   `dvol-sigma@1`(`f368464`, 결과 전)로 쟀다. **결과: 채택 없음.** `blend`(EWMA 와 보정 DVOL 의 분산 평균)는 7일 실현 분산
   예측에서 두 종목 모두 EWMA 를 이겼지만(ΔQLIKE BTC −0.085 · ETH −0.074, 98.75% 상한 < 0, 반기 둘 다 음),
   그 σ 로 목표 비중을 돌리면 Calmar 가 0.29 → 0.26 으로 떨어져 판정 (3)을 못 넘었다. σ 는 EWMA 그대로, 서버 · 화면 무변경.
2. **업비트 `market_event`** — 공식 API 지만 **지금 상태만** 준다(이력 없음). 백테스트가 불가능해서 매일 불변 스냅샷을 쌓고
   `market-warning@1` 로 라이브 통계를 등록했다(첫 확인 2026-11-25). 투자유의 종목 판정 미발행은 이 통계와 무관한 **정책**이다
   (리서치 §11 · `SRV-REQ-024`).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 사전등록 `dvol-sigma@1` · `market-warning@1` 결과 · 첫 수집 전 커밋 | 완료(`f368464`) |
| FR-2 | `ingest/deribit.py` — DVOL 1D close, observed = 봉 시작 · available = 시작 + 1일, 500일 청크, 0 이하 버림. `series_point` 의 `dvol:BTC` · `dvol:ETH`(2021-03-24~, 각 2015행). `ingest_market --only deribit` 증분(마지막 관측 − 7일부터) | 완료(`237fc28`) |
| FR-3 | `UpbitDaily.market_warnings` — KRW 마켓 `warning` · 켜진 caution 알파벳 순, 0건이면 `SourceError`. `store/market_warning.insert_snapshot` 불변 INSERT(DO NOTHING · RETURNING 개수). `fetched_at` 은 `--as-of` 와 무관하게 실제 받은 시각. `ingest_market --only upbit_warning` | 완료(`237fc28`) — 첫 스냅샷 290종목 · 유의 7 · 주의 29 |
| FR-4 | `domain/dvol_sigma.py`(라벨 `forward_rv` · 보정 `dvol_scale` · 후보 · QLIKE · 블록 부트스트랩) + `scoring/dvol_sigma.py` + `jobs/dvol_sigma` — 리포트 `reports/dvol-sigma-dvol-sigma-1-2026-09-30.md` | 완료(실행 코드 `b751e05`, 6.5초, 리포트 `0b24f6c`) |
| FR-5 | 판정 반영 — 채택 없음 → 서버 목표 비중 σ 무변경(`v_realized_vol.ewma`) | 완료(변경 없음) |
| FR-6 | DB 계약 `DB-REQ-029` FR-22 — `forecast.market_warning_snapshot`(UPDATE 트리거 금지) · `v_market_warning`(종목별 최신) | 완료(마이그레이션 `20260930100000`, 로컬 적용) |
| FR-7 | `market-warning@1` 라이브 통계 작업(켜짐 사건 뒤 1 · 7일 초과수익) | 대기 — 2026-11-25 전에는 계산하지 않는다(엿보기 금지) |

## 등록과 실행이 어긋난 곳

- 등록 [protocol] period 의 "대략 2022-04 하순"은 어림이 틀렸다. 시작일은 같은 문단의 규칙(모든 후보가 값을 갖는 첫 t)과
  [candidates] 의 "유효한 s 250일 이상"으로 정해져 **2021-12-29** 다(DVOL 첫 봉 + 30일 + 250일). 규칙 문장대로 실행했고
  어림 날짜에 맞추려고 창을 자르지 않았다.

## 하지 않는 것

- 같은 과거 표본으로 후보(가중 · 보정 창)를 바꿔 `dvol-sigma@2` 를 등록하지 않는다 — 라이브 표본(2026-10-01~)으로만
- DVOL 을 화면에 표시(피처 · 채점 전용)
- 업비트 공지 JSON 호출

## Changelog

- 2026-09-30: 초판 · FR-1~6 완료. `dvol-sigma@1` 채택 없음
