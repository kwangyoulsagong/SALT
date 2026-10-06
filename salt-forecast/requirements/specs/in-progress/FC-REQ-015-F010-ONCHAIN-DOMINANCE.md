---
id: FC-REQ-015
feature: F010
area: forecast
kind: FUNC
title: "F010 슬라이스 6 2차 — Coin Metrics BTC 온체인(onchain-regime@1) · CoinGecko 도미넌스 스냅샷(dominance@1)"
priority: high
created: 2026-10-06
source: pm/requirements/specs/in-progress/FEATURE-010-judgment-engine-v2.md 기능 요구 7 · 리서치 §7-2 · §7-4 · §7-6
---

## Summary

슬라이스 6 다음 묶음 중 **온체인 · 도미넌스**만 한다(사용자 결정 2026-10-06). 데이터랩 · 뉴스 구조화 · LLM 가드는 뒤에 한다.

1. **Coin Metrics Community(BTC)**: 리서치 분류는 MVRV = "국면 · 상한(설명), 예측 변수 아님 · 사이클 n≈4"다. 그래서 방향 IC 를 재지 않고
   **목표 비중(core)에 과열 상한을 씌우면 덜 빠지면서 덜 벌지 않나**를 사전등록 `onchain-regime@1`(`9b13d91`, 결과 전)로 쟀다.
   **결과: 채택 없음.** 상한이 2021 상반기에만 걸리고 2021-10 · 2024-03 고점에서는 안 걸렸다(MVRV 2.93 vs 분위 3.07 · 2.78 vs 2.92 — 리서치의 "ETF 이후 임계 이동").
   ΔMDD +0.5% [−3.5, +1.1] · ΔCalmar −0.02 · 상한 16주. 목표 비중 규칙 · 서버 · 화면 무변경, 온체인은 매일 수집만.
2. **도미넌스**: 무료 이력 원천이 없다(CoinGecko 이력은 PRO 전용 · Coin Metrics 무료 시가총액 135종엔 SOL · BNB 가 없다).
   과거를 만들지 않고 매일 스냅샷 → `dominance@1` 라이브 통계를 결과 전에 등록했다(첫 확인 2027-05-17).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 사전등록 `onchain-regime@1` · `dominance@1` 결과 · 첫 수집 전 커밋 | 완료(`9b13d91`) |
| FR-2 | `ingest/coinmetrics.py` — BTC `CapMVRVCur` · `FlowInExNtv` · `FlowOutExNtv` · `AdrActCnt` · `HashRate` 1d. observed = 그날, available = 그날 + 2일(게시 시각 없음, 보수적). 증분은 메트릭별 마지막 관측 **다음 날부터만**(flash 값이 나중에 고쳐져도 처음 본 값을 지킨다). `series_point` `cm:btc:*` | 완료(`ac33e24`) — 2010-07 ~ 2026-10-04, 5,643~5,940행/메트릭, 두 번째 실행 0행 |
| FR-3 | `ingest/coingecko.py` — `/global` BTC · ETH 도미넌스 · 전체 시가총액. observed = `updated_at`, available = 받은 시각(`--as-of` 무관). 갱신 6시간 넘게 멈추면 실패. `series_point` `cg:*` | 완료(`ac33e24`) |
| FR-4 | `ingest_market` SOURCES 에 `coinmetrics` · `coingecko` — `ops/daily.sh` 로 매일 돈다(LaunchAgent) | 완료 |
| FR-5 | `domain/onchain.py`(확장 분위 · 상한 배수 · 순유입 z · 구간 수) + `scoring/onchain_regime.py` + `jobs/onchain_regime` — 리포트 `reports/onchain-regime-onchain-regime-1-2026-10-06.md` | 완료(실행 코드 `1d7334b`, 9.7초, 리포트 `d8de4ea`) |
| FR-6 | 판정 반영 — 채택 없음 → 서버 목표 비중 무변경(target-weight@2 그대로) | 완료(변경 없음) |
| FR-7 | `dominance@1` 라이브 통계 작업(도미넌스 4주 변화 vs 다음 주 알트 − BTC) | 대기 — 2027-05-17 전에는 계산하지 않는다(엿보기 금지) |

## 등록과 실행이 어긋난 곳

- 탐색 `eth_mvrv` 는 돌리지 않았다 — ETH 온체인을 수집하지 않았다(등록 [data] 가 BTC 만 정의). 리포트 "알아둘 것"에 적었다.
- 등록 [protocol] period 는 "2018-01-01 뒤 첫 리밸런스"다. 첫 리밸런스(2018-01-08)에 이미 상한이 걸려 있었다 — 그 주는 창 첫 행(01-09) 전 비중이라 곡선에 들어가지만 구간 표에 01-08 로 보인다.

## 하지 않는 것

- 같은 과거 표본으로 분위 · 배수를 바꿔 `onchain-regime@2` 등록 — 라이브 표본으로만
- 온체인 · 도미넌스 화면 표시(CC BY-NC · 출처 표기 조건 — 피처 · 채점 전용)
- 거래소 입출금을 판정에 쓰기(원천이 주소 라벨을 소급 적용한다)
- 도미넌스 과거 대용치(무료 시가총액 합) — 2021 뒤 알트 몫이 체계적으로 작다

## Changelog

- 2026-10-06: 초판 · FR-1~6 완료. `onchain-regime@1` 채택 없음
