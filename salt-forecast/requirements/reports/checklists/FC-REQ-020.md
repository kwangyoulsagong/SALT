# FC-REQ-020 체크리스트 — 국내 주식 전망 정확도 (P0 · 2026-10-09 / P1 · P2 · 2026-10-12)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `domain/pooled.py` · `scoring/pooled_gate.py` · `jobs/kr_backtest.py` · `jobs/kr_daily.py` | 4기간 Holm — 전부 미통과(p 0.11~0.36). 게이트 204행 renderable 0 |
| FR-2 | `domain/scoring.evaluate_gate(pooled_skill=…)` | 거부권 = 표본 · 신선도 · 보정 · 폭. `test_veto_only_ignores_symbol_iid_skill` |
| FR-3 | `domain/pooled.block_for` · `nonoverlap` | 블록 2~20주(PW). 4기간 모두 주 검정 · 비중첩 판정 일치 |
| FR-4 | `scoring/coverage.py` | 위 7~8% · 아래 1~4%(위치 0). σ̂ 3분위 표. **시총 버킷 미검증** — Python 에 시총 없음 |
| FR-5 | `scoring/pooled_gate.placebo` · `jobs/gate_audit.py` | 국내 새 게이트 관측 0 · 귀무 1.3. 옛 게이트 재현 73%. 코인 30% · p 0.080 |
| FR-6 | `domain/baselines.empirical_shape_zero` · `kr-ens-baseline@0.2.0` | 중앙값 0 · 상승 확률 0.5 테스트. 기준 대비 +0.01~0.46% |
| FR-7 (P1 · 2026-10-12) | `domain/kr_universe.py` · `models/engine.WalkForward(eligible=)` · `jobs/_data.load_kr_bars` · 사전등록 `preregistration/2026-10-09-kr-universe.toml` | 전 종목 5년 2,605종목 · 격자당 중앙값 973. 4기간 미통과 — d̄ −0.12~−0.56%(위치 0 이 기준보다 나쁨). 꼬리 위 5.4~5.7% · 아래 5.7~7.2%(P0 기울기 해소). 옛 게이트 거짓 발견 77% |
| FR-11 (P2) | `domain/har.py` · `models/kr_scale.py` · 사전등록 `preregistration/2026-10-12-kr-scale.toml` | 종가 HAR · + 범위 절제 4기간 모두 통과. QLIKE 종가 HAR 1주 −0.086(95% 음수) |
| FR-12 (P2) | `domain/har.fit_har` FHS · `kr-har-fhs@0.1.0` | 1 · 2주 통과 · 3 · 4주 미통과 — 위 꼬리 4% · 아래 6~8%(형태가 기울었다) |
| FR-13 (P2) | `models/engine.mondrian` · `RawForecast.bucket` | 코인 해시 불변(55,832행). FHS 대비 차이 ±0.1%p |
| FR-15 (P2) | `models/kr_stock.KR_PRODUCTION` · `jobs/kr_daily.py` | 판정 대상 1주 +2.00% · 2주 +1.34% 통과 · 플라시보 17%(p 0.085) → 챔피언 교체. 게이트 1주 662 · 2주 574 |

## 검증

- `ruff check` · `ruff format --check`(259) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체 통과(새 13개) · `tests/leakage` 28 통과
- P0: `kr_backtest` 49초(예산 5분) · `kr_daily --dry-run` 2.9초 · `gate_audit` 129초(감사 작업, 매일 아님)
- P2: `ruff format --check`(273) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 280 통과 · `tests/leakage` 32 통과(새 4: 미래 봉 · 당일 봉 · 적합 엠바고 · 재현) · `tests/models/test_engine_since.py`(국내 · 코인 전체 격자와 동일) · 코인 기준 모델 출력 해시 main 과 동일 · `kr_backtest` 84분 · 4.3GB · `kr_daily --dry-run` 46초 · 1.78GB · 실제 62초
- P1: 서버 백필 3회(맥 잠자기로 1회차 중단 → `caffeinate`) · `ingest_kr_stock` 286만 행 81초 · `kr_backtest` **41분**(예산 5분 초과 — 2,366종목 × 234주, 예산 표는 ~300종목 기준) · `kr_daily --dry-run` **163초**(예산 1분 초과) · `pytest tests/domain/test_kr_universe.py` 통과

## 미충족 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 3 · 4주 카드 | 판정 대상이 3 · 4주 미통과(형태 FHS 가 깎음). 범위 HAR 는 절제에서 통과했지만 판정 대상이 아니었다 | `kr-scale@2` 새 사전등록(형태 없는 범위 HAR) |
| 플라시보 근소 통과(p 0.085) | 거짓 발견 17% 로 기준은 넘었지만 귀무 95% 안 — 라이브로 확인 필요 | 라이브 26주 채점(2027-04 경) |
| 국내 카드 화면 | 서버 · BFF · FE 경로 없음(FEATURE-011 FR-83) | 화면 슬라이스(5d) |
| 범위 계열 QLIKE 가 기준보다 나쁨 | 스미어링으로 보정 전 척도가 위로 치우친 것으로 추정 — 미검증 | `kr-scale@2` 에서 스미어링 대신 QLIKE 적합 비교 |
| FR-8 | 상장폐지 원천 · 이용 조건 미확인 — 지금 후보는 현재 상장 종목뿐(남은 생존 편향) | `SRV-REQ-040` FR-41 원천 확인 뒤 |
| FR-9 · FR-10 · FR-14 | 상태별 억제 · 수정주가 재작성 · 국면 표 | 다음 슬라이스 |
| ACI · NexCP 보정(FR-13 나머지) | 등록 `kr-scale@1` 밖 | `kr-scale@2` |
| `kr_backtest` 성능 예산(84분 · 4.3GB) | 973종목 × 모델 7. 매일 작업만 줄였다 · cProfile 은 실행 잠금 때문에 끊음 | 다음 슬라이스 착수 전 프로파일 |
| `kr_daily` 실제 실행 62초(예산 1분) | DB 쓰기 약 16초 포함 | 같이 |
| 5종목 일봉 누락 | KIS 초당 한도(EGW00201) — 3회차에도 실패 | 밤 정기 백필(`kr-full-daily-candles`)이 재시도 |
| 커버리지 시총 버킷 · 국면 표(FR-14) | 시총 입력이 Python 에 없음. 표본이 2022-04~ 로 늘어 공매도 금지 구간이 들어왔다 | FR-14 |
| 코인 게이트 풀링화 | 사용자 결정 | 이 리포트 뒤 |
