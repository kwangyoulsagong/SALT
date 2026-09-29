# FC-REQ-010 체크리스트 — 국면 · 변동성 (F010 슬라이스 2)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 사전등록 | `preregistration/2026-09-29-regime-gate.toml`(커밋 `b9cc8d0`, 결과 전) · `jobs/regime_gate` · `store/rule_ic.register` 재사용 | DB `forecast.preregistration` `regime-gate@1` 1행. 첫 실행은 안전장치에서 **결과 계산 전** 멈춤(창 시작 경계 — 회고) → `472f50c` 뒤 재실행 |
| FR-2 HMM | `domain/hmm.py` | 테스트: 두 분산 상태 복원(σ 0.02 · 0.05 ±10%) · 필터 판별 > 95% · 시드 재현 · **미래를 바꿔도 과거 필터 확률 동일** |
| FR-3 월초 적합 | `domain/regime.fit_for_month` · `p_high_through` · `hmm_monthly(mapper=)` | 테스트: 적합 전 NaN · **미래 수익률을 3배로 바꿔도 그 전 p_high 동일**. 실행 84회 적합 |
| FR-4 곡선 | `strategy_returns` · `curve_stats` · `delta_mdd_ci` · `capture` | 테스트: 하루 늦은 노출 · 전환 비용 · MDD · 포착 · 같은 곡선 ΔMDD 0 · 노출 축소 ΔMDD > 0 |
| FR-5 이벤트일 | `event_rows` · `sigma_ratio_ci` · `reduction_factor` | 테스트: 발표 시각 봉 · 마감 정각 경계 · 축소 계수 0.05 내림 · 하한 0.5 · CI 1 포함이면 1 |
| FR-6 도달 | `first_touch` | 테스트: 같은 날 둘 다 → 손절 · 손실은 그날 종가(−5%, 문턱 −10% 아님) |
| FR-7 리포트 | `reports/regime-gate-regime-gate-1-2026-09-29.md` | 1차 6행 · 곡선 16행 · 이벤트 5행 · 도달 2행. 168초 |
| FR-8 매일 국면 | `jobs/market_regime` · `store/regime.py` · `ops/daily.sh` | 실 DB 1행(2026-09-29: trend_open · p_high 0.05 · 낙폭 −36% · 게이트 없음). 드라이런 as_of 2026-06-30(trend_open false · 낙폭 −49%). 테스트: **백테스트 경로의 p_high 와 같은 값** · 미래 봉이 있어도 같은 as_of 는 같은 행 · 게이트 없음 · 재료 없음 → 열림 |
| FR-9 BTC 베타 | `domain/regime.beta_by_symbol` · `jobs/volatility` · `store/volatility` | 실 DB 271 / 290종목(BTC 1.00 · ETH 1.18 · SOL 1.17 · DOGE 1.26 · XRP 1.54). 테스트: 늦게 상장한 종목 날짜 정렬 · 베타 2 복원 · 표본 부족 None |

## 1차 판정 (as_of 2026-09-29, 2019-10-03 ~ 2026-09-28, 실행 `472f50c`)

채택 **없음**. `both` BTC ΔMDD +37.4% [+1.4%, +48.7%] 이지만 상승 포착 0.47. 이벤트일 σ 비율 1.09 [0.86, 1.32] → 계수 1.
전체 표는 `FC-REQ-010` 결과 절 · 리포트.

## 검증

| 명령 | 결과 |
|---|---|
| `uv run ruff check .` · `ruff format --check .` | 통과 · 130 파일 |
| `uv run pyright` | 0 errors |
| `uv run lint-imports` | 3 kept |
| `uv run pytest -q`(DB 포함) | 117 passed |
| `uv run pytest tests/leakage -q` | 15 passed |
| 스키마 계약(`tests/store/test_schema_contract.py`, 실 DB) | 통과 — `market_regime` · `realized_vol.btc_beta` |
| `jobs.market_regime --dry-run --as-of 2026-06-30` | 1행 · 2.3초 |
| `jobs.volatility --dry-run --as-of 2026-06-30` | 290행 · 7.2초 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 게이트 재등록 `regime-gate@2` | 판정 밖 문턱 조정은 엿보기 | 원장 국면 재료가 쌓인 뒤 · 결과 전 근거 |
| 생존 편향 | 상장폐지 원천 없음 | 리서치 §10 슬라이스 7 |
| 삼중 장벽 클래스 비율 | 1차 판정 고정 지평 | 슬라이스 4 |
| 운영 DB 마이그레이션 · 매일 작업 첫 실행 | 로컬만 | 배포 시 |
