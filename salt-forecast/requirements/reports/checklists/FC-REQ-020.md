# FC-REQ-020 체크리스트 — 국내 주식 전망 정확도 (P0 · 2026-10-09 / P1 · 2026-10-12)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `domain/pooled.py` · `scoring/pooled_gate.py` · `jobs/kr_backtest.py` · `jobs/kr_daily.py` | 4기간 Holm — 전부 미통과(p 0.11~0.36). 게이트 204행 renderable 0 |
| FR-2 | `domain/scoring.evaluate_gate(pooled_skill=…)` | 거부권 = 표본 · 신선도 · 보정 · 폭. `test_veto_only_ignores_symbol_iid_skill` |
| FR-3 | `domain/pooled.block_for` · `nonoverlap` | 블록 2~20주(PW). 4기간 모두 주 검정 · 비중첩 판정 일치 |
| FR-4 | `scoring/coverage.py` | 위 7~8% · 아래 1~4%(위치 0). σ̂ 3분위 표. **시총 버킷 미검증** — Python 에 시총 없음 |
| FR-5 | `scoring/pooled_gate.placebo` · `jobs/gate_audit.py` | 국내 새 게이트 관측 0 · 귀무 1.3. 옛 게이트 재현 73%. 코인 30% · p 0.080 |
| FR-6 | `domain/baselines.empirical_shape_zero` · `kr-ens-baseline@0.2.0` | 중앙값 0 · 상승 확률 0.5 테스트. 기준 대비 +0.01~0.46% |
| FR-7 (P1 · 2026-10-12) | `domain/kr_universe.py` · `models/engine.WalkForward(eligible=)` · `jobs/_data.load_kr_bars` · 사전등록 `preregistration/2026-10-09-kr-universe.toml` | 전 종목 5년 2,605종목 · 격자당 중앙값 973. 4기간 미통과 — d̄ −0.12~−0.56%(위치 0 이 기준보다 나쁨). 꼬리 위 5.4~5.7% · 아래 5.7~7.2%(P0 기울기 해소). 옛 게이트 거짓 발견 77% |

## 검증

- `ruff check` · `ruff format --check`(259) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체 통과(새 13개) · `tests/leakage` 28 통과
- P0: `kr_backtest` 49초(예산 5분) · `kr_daily --dry-run` 2.9초 · `gate_audit` 129초(감사 작업, 매일 아님)
- P1: 서버 백필 3회(맥 잠자기로 1회차 중단 → `caffeinate`) · `ingest_kr_stock` 286만 행 81초 · `kr_backtest` **41분**(예산 5분 초과 — 2,366종목 × 234주, 예산 표는 ~300종목 기준) · `kr_daily --dry-run` **163초**(예산 1분 초과) · `pytest tests/domain/test_kr_universe.py` 통과

## 미충족 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 통과 기준(거짓 발견 ≤ 20% 로 켜짐) | P0 · P1 모두 4기간 미통과 — 켜진 카드가 없어 비율이 정의 안 됨 | P2 도전자(FR-15)가 풀링 검정을 이길 때 |
| FR-8 | 상장폐지 원천 · 이용 조건 미확인 — 지금 후보는 현재 상장 종목뿐(남은 생존 편향) | `SRV-REQ-040` FR-41 원천 확인 뒤 |
| FR-9~15 | P2 척도 · 형태 · 보정 도전자 | 슬라이스 5c 다음 커밋들 |
| `kr_backtest` · `kr_daily` 성능 예산 | 대상이 51 → 973종목(중앙값)으로 늘었다. 프로파일 전 | P2 착수 전 cProfile |
| 5종목 일봉 누락 | KIS 초당 한도(EGW00201) — 3회차에도 실패 | 밤 정기 백필(`kr-full-daily-candles`)이 재시도 |
| 커버리지 시총 버킷 · 국면 표(FR-14) | 시총 입력이 Python 에 없음. 표본이 2022-04~ 로 늘어 공매도 금지 구간이 들어왔다 | FR-14 |
| 코인 게이트 풀링화 | 사용자 결정 | 이 리포트 뒤 |
