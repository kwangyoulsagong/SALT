# 메타 모델 · 보정 — meta-model@1 (2026-09-29)

- 사전등록: `salt-forecast/preregistration/2026-09-29-meta-model.toml` · 실행 커밋 `1daf4ea`
- 행: 주 격자 451주 × 종목 263 = **42,654행** · 창 2018-01-22 ~ 2026-09-07
- 라벨: 삼중 장벽 20일(+2σ / −1σ) 상단 먼저 = 1. **양성 비율 12.3%** (+1 12% / 0 51% / −1 37%)
- 표본 선택: 지금 업비트 원화 마켓 종목만(상장폐지 없음 — **생존 편향**)

## 판정

| 조건 | 기준 | 값 | 결과 |
|---|---|---|---|
| CPCV AUC 하한 (선택 `logistic`) | > 0.52 | 0.652 [0.613, 0.691] | 통과 |
| 로그손실 차 (선택 − 규칙만) | CI 상한 < 0 | -0.0124 [-0.0231, -0.0013] | 통과 |
| 셔플 점검 (날짜 안 라벨 섞기) | CI 가 0.5 포함 | 0.609 [0.565, 0.651] | **못 넘음** |
| walk-forward ECE | ≤ 0.05 | 0.0342 | 통과 |
| walk-forward BSS (기준 = 학습 창 양성 비율) | CI 하한 > 0 | -0.0046 [-0.0253, +0.0189] | **못 넘음** |

결론: **채택 안 함** — 확률을 만들지 않는다. 규칙 점수 · 채점 성적만

### 진단 — 셔플 점검 (판정 무관)

- 날짜 안 셔플 라벨의 **종목 간** AUC 0.491 — 누수가 없으면 0.5
- 날짜까지 섞은 라벨의 풀링 AUC 0.495 [0.488, 0.503] — 누수가 없으면 0.5 포함
- 날짜별 실제 양성 비율 자체의 AUC 0.859 — 풀링 AUC 중 시점(시장 전체) 몫의 상한. 날짜 안 셔플은 이 몫을 남기므로 풀링 AUC 로 재면 누수가 없어도 0.5 가 안 나온다

## CPCV — 학습기 넷 (6군 · 2시험 · 15분할 · 경로 5 · 퍼지 20일 · 엠바고 7일)

| 학습기 | AUC | 95% CI | 로그손실 | 분할 AUC 최소 ~ 최대 |
|---|---|---|---|---|
| climatology | 0.451 | [0.380, 0.506] | 0.3739 | 0.500 ~ 0.500 |
| rule_only | 0.525 | [0.485, 0.556] | 0.3720 | 0.504 ~ 0.574 |
| logistic | 0.652 | [0.613, 0.691] | 0.3576 | 0.591 ~ 0.738 |
| lgbm | 0.650 | [0.612, 0.680] | 0.3586 | 0.584 ~ 0.687 |

- 선택: 로그손실 차(lgbm − logistic) +0.0007 [-0.0055, +0.0078] → **logistic** (CI 상한 < 0 일 때만 lgbm)
- 날짜별 종목 간 AUC 평균(부차): 0.592 (373주) — 풀링 AUC 에서 시점(시장 전체) 몫을 뺀 것

## walk-forward 보정 (4주 재학습 · 4년 창 · 직전 52주 OOS Beta 보정)

- 재학습 86회 · 보정기 84개 · 평가 38,255행 · 335주 · 시작 2020-04-13
- Brier 0.1083 = REL 0.00186 − RES 0.00134 + UNC 0.1074 (+ 구간 안 +0.00037)
- BSS 참고(전 기간 양성 비율 기준 — 그때는 몰랐던 값): -0.0082
- 보정 확률 AUC 0.591
- 마지막 보정기(2026-08-24): a 0.594 · b 0.000 · c -1.120 · 풀 10500행

| 구간 | 행 | 평균 확률 | 실제 비율 |
|---|---|---|---|
| 1 | 3,826 | 2.6% | 5.4% |
| 2 | 3,826 | 4.7% | 6.5% |
| 3 | 3,826 | 6.2% | 10.4% |
| 4 | 3,826 | 7.6% | 13.4% |
| 5 | 3,826 | 8.9% | 12.5% |
| 6 | 3,825 | 10.3% | 12.5% |
| 7 | 3,825 | 12.3% | 12.9% |
| 8 | 3,825 | 15.1% | 15.7% |
| 9 | 3,825 | 18.7% | 16.1% |
| 10 | 3,825 | 26.9% | 17.0% |

## 피처 결측 비율

| 피처 | 값 있음 |
|---|---|
| rule_long | 100% |
| rule_scalp | 100% |
| mom_28d | 100% |
| rs_btc_5d | 100% |
| rs_btc_20d | 100% |
| vol_pct_365 | 93% |
| turnover_z_30 | 100% |
| drawdown_365 | 100% |
| btc_trend | 99% |
| hmm_p_high | 91% |
| funding_7d | 56% |

## 중요도 — `logistic` 전 기간 적합(부차)

| 피처 | 값 |
|---|---|
| vol_pct_365 | -0.537 |
| mom_28d | +0.356 |
| funding_7d_missing | +0.319 |
| rs_btc_20d | -0.318 |
| turnover_z_30 | +0.202 |
| rule_long | -0.153 |
| funding_7d | +0.107 |
| drawdown_365 | +0.105 |
| rule_scalp | +0.078 |
| hmm_p_high | +0.073 |
| btc_trend | +0.041 |
| rs_btc_5d | -0.012 |

## 부차 — 전략 참고 · DSR (화면에 가지 않는다)

주마다 walk-forward p 상위 20% − 전체 동일가중 7일 로그수익 − 왕복 0.1%. 시도 N = 4, 시도 샤프 분산은 순위가 있는 셋(climatology 는 상수 확률이라 순위 없음 — 사전등록과 다른 점). 무작위 최대 샤프 기대 SR0 = 0.087/주

| 학습기 | 주 | 샤프/주 | 연환산(×√52) | DSR |
|---|---|---|---|---|
| rule_only | 343 | -0.122 | -0.88 | 0.000 |
| logistic | 343 | +0.022 | +0.16 | 0.115 |
| lgbm | 343 | +0.019 | +0.14 | 0.103 |

## 부차 — BY-FDR (q = 0.05)

- 종목별 BSS > 0: 검정 262 · **통과 21** — 종목별 '잘 맞음' 배지는 통과 종목에만 만들 수 있다(이 슬라이스는 안 만든다)
- rule-ic@1 탐색표(국면 all): 검정 94 · **살아남음 37** (p 는 CI 정규 근사). 1차 판정은 바꾸지 않는다

| 항목 | 모드 | 지평 | 라벨 | IC | p | BY |
|---|---|---|---|---|---|---|
| change24h | long_term | 1 | barrier | +0.042 | 0 | 살아남음 |
| change24h | long_term | 1 | fixed | +0.038 | 0 | 살아남음 |
| change24h | long_term | 7 | barrier | +0.021 | 2.7e-11 | 살아남음 |
| change24h | long_term | 7 | fixed | +0.028 | 3.3e-14 | 살아남음 |
| change24h | long_term | 30 | barrier | +0.008 | 0.021 | — |
| change24h | long_term | 30 | fixed | +0.017 | 4.8e-07 | 살아남음 |
| change24h | scalp | 1 | barrier | -0.042 | 0 | 살아남음 |
| change24h | scalp | 1 | fixed | -0.038 | 0 | 살아남음 |
| change24h | scalp | 7 | barrier | -0.021 | 2.7e-11 | 살아남음 |
| change24h | scalp | 7 | fixed | -0.028 | 3.3e-14 | 살아남음 |
| change24h | scalp | 30 | barrier | -0.008 | 0.021 | — |
| change24h | scalp | 30 | fixed | -0.017 | 4.8e-07 | 살아남음 |
| fear_greed | market | 1 | fixed | +0.050 | 0.064 | — |
| fear_greed | market | 7 | fixed | +0.062 | 0.24 | — |
| fear_greed | market | 30 | fixed | +0.073 | 0.41 | — |
| funding_7d | any | 1 | barrier | -0.012 | 0.00097 | 살아남음 |
| funding_7d | any | 1 | fixed | +0.022 | 2.2e-08 | 살아남음 |
| funding_7d | any | 7 | barrier | -0.017 | 0.012 | — |
| funding_7d | any | 7 | fixed | +0.016 | 0.07 | — |
| funding_7d | any | 30 | barrier | -0.025 | 0.022 | — |
| funding_7d | any | 30 | fixed | +0.010 | 0.5 | — |
| mom_28d | any | 1 | barrier | +0.005 | 0.14 | — |
| mom_28d | any | 1 | fixed | -0.042 | 0 | 살아남음 |
| mom_28d | any | 7 | barrier | +0.010 | 0.18 | — |
| mom_28d | any | 7 | fixed | -0.033 | 0.00047 | 살아남음 |
| mom_28d | any | 30 | barrier | +0.034 | 0.0042 | — |
| mom_28d | any | 30 | fixed | -0.032 | 0.024 | — |
| rsi_d1 | long_term | 1 | barrier | +0.028 | 0 | 살아남음 |
| rsi_d1 | long_term | 1 | fixed | +0.040 | 0 | 살아남음 |
| rsi_d1 | long_term | 7 | barrier | -0.000 | 0.92 | — |
| rsi_d1 | long_term | 7 | fixed | +0.026 | 0.00012 | 살아남음 |
| rsi_d1 | long_term | 30 | barrier | -0.023 | 0.00046 | 살아남음 |
| rsi_d1 | long_term | 30 | fixed | +0.022 | 0.0083 | — |
| rsi_d1 | scalp | 1 | barrier | +0.028 | 0 | 살아남음 |
| rsi_d1 | scalp | 1 | fixed | +0.040 | 0 | 살아남음 |
| rsi_d1 | scalp | 7 | barrier | -0.000 | 0.92 | — |
| rsi_d1 | scalp | 7 | fixed | +0.026 | 0.00012 | 살아남음 |
| rsi_d1 | scalp | 30 | barrier | -0.023 | 0.00046 | 살아남음 |
| rsi_d1 | scalp | 30 | fixed | +0.022 | 0.0083 | — |
| sentiment | long_term | 1 | barrier | +0.033 | 0 | 살아남음 |
| sentiment | long_term | 1 | fixed | +0.009 | 0.024 | — |
| sentiment | long_term | 7 | barrier | +0.027 | 1.2e-11 | 살아남음 |
| sentiment | long_term | 7 | fixed | +0.006 | 0.18 | — |
| sentiment | long_term | 30 | barrier | +0.017 | 0.0013 | 살아남음 |
| sentiment | long_term | 30 | fixed | -0.008 | 0.19 | — |
| sentiment | scalp | 1 | barrier | -0.033 | 0 | 살아남음 |
| sentiment | scalp | 1 | fixed | -0.009 | 0.024 | — |
| sentiment | scalp | 7 | barrier | -0.027 | 1.2e-11 | 살아남음 |
| sentiment | scalp | 7 | fixed | -0.006 | 0.18 | — |
| sentiment | scalp | 30 | barrier | -0.017 | 0.0013 | 살아남음 |
| sentiment | scalp | 30 | fixed | +0.008 | 0.19 | — |
| taker_buy_ratio_7d | any | 1 | barrier | -0.006 | 0.048 | — |
| taker_buy_ratio_7d | any | 1 | fixed | -0.002 | 0.54 | — |
| taker_buy_ratio_7d | any | 7 | barrier | -0.002 | 0.76 | — |
| taker_buy_ratio_7d | any | 7 | fixed | +0.007 | 0.33 | — |
| taker_buy_ratio_7d | any | 30 | barrier | +0.002 | 0.87 | — |
| taker_buy_ratio_7d | any | 30 | fixed | +0.020 | 0.087 | — |
| total_score | long_term | 1 | barrier | +0.044 | 0 | 살아남음 |
| total_score | long_term | 1 | fixed | +0.045 | 0 | 살아남음 |
| total_score | long_term | 7 | barrier | +0.014 | 0.0012 | 살아남음 |
| total_score | long_term | 7 | fixed | +0.028 | 2.6e-06 | 살아남음 |
| total_score | long_term | 30 | barrier | -0.008 | 0.14 | — |
| total_score | long_term | 30 | fixed | +0.015 | 0.03 | — |
| total_score | scalp | 1 | barrier | -0.031 | 0 | 살아남음 |
| total_score | scalp | 1 | fixed | -0.018 | 4.7e-08 | 살아남음 |
| total_score | scalp | 7 | barrier | -0.024 | 1e-13 | 살아남음 |
| total_score | scalp | 7 | fixed | -0.018 | 9.1e-07 | 살아남음 |
| total_score | scalp | 30 | barrier | -0.020 | 5.3e-07 | 살아남음 |
| total_score | scalp | 30 | fixed | -0.007 | 0.048 | — |
| total_score_whale | long_term | 1 | barrier | +0.013 | 0.22 | — |
| total_score_whale | long_term | 1 | fixed | -0.004 | 0.69 | — |
| total_score_whale | long_term | 7 | barrier | +0.001 | 0.95 | — |
| total_score_whale | long_term | 7 | fixed | -0.016 | 0.21 | — |
| total_score_whale | long_term | 30 | barrier | -0.021 | 0.36 | — |
| total_score_whale | long_term | 30 | fixed | -0.014 | 0.68 | — |
| total_score_whale | scalp | 1 | barrier | -0.017 | 0.11 | — |
| total_score_whale | scalp | 1 | fixed | -0.010 | 0.42 | — |
| total_score_whale | scalp | 7 | barrier | -0.022 | 0.034 | — |
| total_score_whale | scalp | 7 | fixed | -0.024 | 0.089 | — |
| total_score_whale | scalp | 30 | barrier | -0.021 | 0.017 | — |
| total_score_whale | scalp | 30 | fixed | -0.020 | 0.06 | — |
| whale_flow | long_term | 1 | barrier | +0.006 | 0.58 | — |
| whale_flow | long_term | 1 | fixed | -0.012 | 0.29 | — |
| whale_flow | long_term | 7 | barrier | -0.009 | 0.44 | — |
| whale_flow | long_term | 7 | fixed | -0.014 | 0.33 | — |
| whale_flow | long_term | 30 | barrier | -0.021 | 0.18 | — |
| whale_flow | long_term | 30 | fixed | -0.026 | 0.081 | — |
| whale_flow | scalp | 1 | barrier | +0.006 | 0.58 | — |
| whale_flow | scalp | 1 | fixed | -0.012 | 0.29 | — |
| whale_flow | scalp | 7 | barrier | -0.009 | 0.44 | — |
| whale_flow | scalp | 7 | fixed | -0.014 | 0.33 | — |
| whale_flow | scalp | 30 | barrier | -0.021 | 0.18 | — |
| whale_flow | scalp | 30 | fixed | -0.026 | 0.081 | — |
| whale_net_7d | any | 1 | barrier | +0.025 | nan | — |
| whale_net_7d | any | 1 | fixed | +0.078 | 0.0052 | — |
| whale_net_7d | any | 7 | barrier | +0.052 | nan | — |
| whale_net_7d | any | 7 | fixed | -0.039 | nan | — |
