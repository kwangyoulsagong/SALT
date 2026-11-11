# 판단 라벨 등급 — judgment-tier@1 · 2026-11-11

사전등록 `salt-forecast/preregistration/2026-11-11-judgment-tier.toml` 그대로 돌린 결과(git `996117c2`). 규칙 `mode-decision@2` 행만.
spread = 후보 초과 순수익 − 피하기 초과(같은 날 같은 칸 동일가중 대비) · 95% CI = 날짜 군집 부트스트랩 2,000회.
`backtest_price_only` 는 등급 근거가 아니다(보고만). 과거 검산은 '검증됨'을 만들지 않는다.

## 등급

| 시장 | 모드 | 등급 | 이유 | 정한 출처 | 라이브 유효 n / 620 | Holm p | 두 반 spread |
|---|---|---|---|---|---|---|---|
| crypto | scalp | reference | no_candidate | — | 7 | — | — · — |
| crypto | long_term | reference | no_candidate | — | 0 | — | — · — |
| kr | scalp | reference | no_candidate | — | 0 | — | — · — |
| kr | long_term | reference | no_candidate | — | 2 | — | — · — |

## 칸 × 출처

| 시장 | 모드 | 출처 | 행 | 날 | 후보 | 피하기 | 유효 n | spread | 95% CI | 단측 p | 버린 회차 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| crypto | scalp | live | 92 | 23 | 0 | 10 | 7 | — | — | — | 0 |
| crypto | scalp | backtest_full | 0 | 0 | 0 | 0 | 0 | — | — | — | 0 |
| crypto | scalp | backtest_price_only | 11720 | 42 | 0 | 1496 | 82 | — | — | — | 0 |
| crypto | long_term | live | 3 | 1 | 0 | 0 | 0 | — | — | — | 0 |
| crypto | long_term | backtest_full | 117 | 13 | 0 | 23 | 12 | — | — | — | 0 |
| crypto | long_term | backtest_price_only | 0 | 0 | 0 | 0 | 0 | — | — | — | 0 |
| kr | scalp | live | 0 | 0 | 0 | 0 | 0 | — | — | — | 0 |
| kr | scalp | backtest_full | 0 | 0 | 0 | 0 | 0 | — | — | — | 0 |
| kr | scalp | backtest_price_only | 99870 | 994 | 0 | 14859 | 2851 | — | — | — | 0 |
| kr | long_term | live | 50 | 1 | 0 | 2 | 2 | — | — | — | 0 |
| kr | long_term | backtest_full | 51305 | 953 | 0 | 15311 | 2761 | — | — | — | 0 |
| kr | long_term | backtest_price_only | 0 | 0 | 0 | 0 | 0 | — | — | — | 0 |

후보가 0 건인 칸은 spread 가 없다(`no_candidate`) — mode-decision@2 는 등록 시점까지 후보 판단을 낸 적이 없다(사전등록에 미리 적음).
표본 선택: 서버가 지금 모으는 종목만(생존 편향 — signal-skill@1 리포트와 같다).
