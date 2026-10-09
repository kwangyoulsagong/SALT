# FC-REQ-009 체크리스트 — 국내 주식 변동 범위 (2026-10-08)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `domain/calendar.py` · `models/engine.py` · `domain/baselines.py` · `scoring/evaluate.py` | 코인 실데이터 회귀: 격자 471주 · 마지막 30 as_of 백테스트 + 오늘 live = 52,768행 출력 해시 **변경 전후 동일**(`9526ed58…`). 코인 `daily --dry-run` 2,064행 · `regate --dry-run` 1,168행 |
| FR-2 | `ingest/krx_daily.py` · `store/kr_stock.py` · `jobs/ingest_kr_stock.py` | 24,785행 · 51종목 · 0.65초. 16:00 KST 전 봉 버림 테스트 |
| FR-3 | `KrxSessions` | `tests/domain/test_krx_calendar.py` 8개 — 실제 2026-10 달력(10-05 대체휴일 · 10-09 한글날): 격자 09-28 · **10-06(화)** · 10-12, 10-06 1주 라벨 끝 = 10-13 16:00 KST, 달력이 모르면 None. 실데이터 창 시작 2025-10-10(금 — 추석 주의 첫 거래일) |
| FR-4 | `domain/baselines.py` | 스케일 = σ√5, 코인 규칙(1.5일 상한)과 다름 테스트 |
| FR-5 | `models/kr_stock.py` | `forecast.model` 에 두 버전 · 파라미터 등록 |
| FR-6 | `jobs/kr_backtest.py` · `jobs/kr_daily.py` | 백테스트 51종목 × 78주(2025-04-14 ~ 2026-09-28) · 예측 29,580 · 7초. live 408행(51 × 4 × 2) · 2.7초 · 같은 날 재실행 612행 그대로(멱등). `tests/scoring/test_gates_krx.py` |
| FR-7 | `ops/daily.sh` · `domain/ops_health.py` | `test_ops_health` 통과 |
| FR-8 | `tests/leakage/test_kr_leakage.py` | 6개 통과 |

## 실데이터 재현 — 과거 날짜로 돌린 매일 작업 = 백테스트

`--as-of` 를 그날 15:00 KST(종가 공개 전)로 두고 매일 작업의 엔진을 돌려 전체 데이터 백테스트의 같은 as_of 행과 비교:
2026-03-03(화 — 03-02 대체휴일) · 06-29 · 09-07, **1,224행 분위수 최대 차이 0.0**. 처음엔 as_of 가 전 주 금요일로 잡혔다 —
개장일 표를 `synced_at <= as_of` 로 잘랐는데 서버가 재동기화마다 그 값을 새로 써서 과거 달력이 비었다. 필터를 빼고
"as_of 뒤 거래일을 알아도 전망이 같다" 누수 테스트로 바꿨다.

## 백테스트 결과 (`reports/kr-backtest-2026-10-08.md`)

| 기간 | 90% 커버리지 | 기준 대비 pinball | 방향 적중 / 항상 오른다 |
|---|---|---|---|
| 1주 | 87.9% | +0.39% | 52.0% / 54.8% |
| 2주 | 89.6% | +0.86% | 54.1% / 54.8% |
| 3주 | 90.5% | +0.96% | 54.4% / 57.9% |
| 4주 | 91.2% | +0.43% | 53.0% / 58.4% |

게이트 204(51 × 4, 전부 백테스트 판정): 전체 렌더 **11** · 범위 렌더 **166**. 막힘 — `skill_not_significant` 68 ·
`underperforms_baseline` 67 · `miscalibrated` 38 · `not_sharper_than_baseline` 20. 방향 판정은 항상 오른다보다 낮다 — 방향은 쓸 것이 없다.

## validate (`python-style.md` §7)

- `ruff check` · `ruff format --check` · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체 통과 · `pytest tests/leakage` 28 통과
- 스키마 계약 테스트 실제 DB 로 실행(`FORECAST_DATABASE_URL` 내보내고 — 기본 실행에선 건너뜀)
- `--dry-run`: `ingest_kr_stock` · `kr_backtest`(오늘 · `--as-of 2026-06-30` 64주) · `kr_daily`(오늘 · `--as-of 2026-06-30`)
- `v_forecast_card` 국내 주식 한 종목 `EXPLAIN (ANALYZE, BUFFERS)` 38.6ms(예산 50ms)

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 첫 live 채점(1주) | 10-08 as_of 1주 라벨 끝 = 10-15 16:00 KST | 2026-10-15 뒤 `daily.sh` |
| 첫 주 첫 거래일 live 행(게이트 표본) | 10-12(월) | 2026-10-12 `daily.sh` 뒤 `forecast.prediction` |
| `daily.sh` 경로로 두 작업이 도는 것 | 작업을 직접 돌렸다 — 스크립트 단계로는 안 돌렸다 | 다음 서버 `forecast-runner` 실행 뒤 `job_run` |
| 라이브 성적 | 라이브 52주 전엔 백테스트로 판정(코인과 같은 규칙) | 라이브 26주(중간 재평가) · 52주 |
| 화면 · 서버 읽기 경로(FR-83) | 범위 밖 — REQ "하지 않는 것" | 다음 슬라이스 |
| 운영 DB | 로컬만 | 배포 시 |
