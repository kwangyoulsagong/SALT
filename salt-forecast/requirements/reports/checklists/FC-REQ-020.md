# FC-REQ-020 체크리스트 — 국내 주식 전망 정확도 (P0 · 2026-10-09)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `domain/pooled.py` · `scoring/pooled_gate.py` · `jobs/kr_backtest.py` · `jobs/kr_daily.py` | 4기간 Holm — 전부 미통과(p 0.11~0.36). 게이트 204행 renderable 0 |
| FR-2 | `domain/scoring.evaluate_gate(pooled_skill=…)` | 거부권 = 표본 · 신선도 · 보정 · 폭. `test_veto_only_ignores_symbol_iid_skill` |
| FR-3 | `domain/pooled.block_for` · `nonoverlap` | 블록 2~20주(PW). 4기간 모두 주 검정 · 비중첩 판정 일치 |
| FR-4 | `scoring/coverage.py` | 위 7~8% · 아래 1~4%(위치 0). σ̂ 3분위 표. **시총 버킷 미검증** — Python 에 시총 없음 |
| FR-5 | `scoring/pooled_gate.placebo` · `jobs/gate_audit.py` | 국내 새 게이트 관측 0 · 귀무 1.3. 옛 게이트 재현 73%. 코인 30% · p 0.080 |
| FR-6 | `domain/baselines.empirical_shape_zero` · `kr-ens-baseline@0.2.0` | 중앙값 0 · 상승 확률 0.5 테스트. 기준 대비 +0.01~0.46% |

## 검증

- `ruff check` · `ruff format --check`(259) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체 통과(새 13개) · `tests/leakage` 28 통과
- `kr_backtest` 49초(예산 5분) · `kr_daily --dry-run` 2.9초 · `gate_audit` 129초(감사 작업, 매일 아님)

## 미충족 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 통과 기준(거짓 발견 ≤ 20% 로 켜짐) | 4기간 미통과 — 켜진 카드가 없어 비율이 정의 안 됨 | 유니버스 확장(FR-7 · FR-8) 후 재측정 |
| FR-7~15 | P1(서버 전 종목 일봉 `SRV-REQ-040` FR-40) 먼저 | 슬라이스 5c 다음 커밋들 |
| 커버리지 시총 버킷 · 국면 표(FR-14) | 시총 · 국면 입력이 Python 에 없음 · 표본 기간이 공매도 금지 뒤뿐 | FR-7 · FR-14 |
| 코인 게이트 풀링화 | 사용자 결정 | 이 리포트 뒤 |
