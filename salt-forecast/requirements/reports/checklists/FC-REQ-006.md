# FC-REQ-006 체크리스트 — 실현 변동성

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 as_of 입력 | `domain/volatility.estimate` → `CloseSeries.as_of` · `jobs/volatility` UTC 자정 | 누수 테스트: as_of 뒤 봉을 흔들어도 결과 동일(GARCH 경로 포함) |
| FR-2 EWMA | `ewma_forecasts` | 테스트: ±2% 반복 → 분산 0.0004 · f[t] 가 r[t] 이후를 안 봄 |
| FR-3 GARCH 도전자 | `fit_garch` · `garch_forecasts` — 분산 목표 + 격자 30×50 → 11×11 | 테스트: 모의 α 0.10 · β 0.85 복원(±0.04 · ±0.06) · 1단계 점화식 손계산 |
| FR-4 QLIKE 채점 | `qlike` · 기준 `rolling_forecasts`(60일) | 실행: 225종목 채점 — `reports/realized-vol-2026-09-24.md` |
| FR-5 게이트 | 240일 · 3일 · 기준 대비 | 테스트: 이력 부족 · 시세 끊김 · 값이 0 이 아니라 null. 실행: 통과 182 · 이력 64 · 기준 43 |
| FR-6 멱등 | `store/volatility.upsert_realized_vol` `(symbol, as_of)` | 실 DB 2회 실행 → 289행 그대로 |
| FR-7 매일 배치 | `ops/daily.sh` `volatility` | 코드 확인(배치 자체는 다음 매시 트리거에서 돈다 — 미실측) |
| FR-8 서버 읽기 | `v_realized_vol` · `PrismaForecastReader.realizedVolatility` | 실 DB: BTC 0.4094(as_of 2026-09-24) · ETH null(막힘) · 없는 종목 null. 쿼리 28ms(첫 연결) · 0.5ms. `EXPLAIN ANALYZE` 0.027ms(인덱스 `realized_vol_latest`) |

## 검증

- `ruff check` · `ruff format --check` · `pyright`(0) · `lint-imports`(3 kept) · `pytest`(스키마 계약 포함, DB 연결로 실행) · `tests/leakage` 13건
- `--dry-run --as-of 2026-06-30`: 289종목 · 3.5초 · 통과 179 · 이력 77 · 기준 33
- 실행(as_of 2026-09-24): 289행 · 4.0초
- 서버: `tsc --noEmit` · `eslint` · `npm test` 410/0
- 마이그레이션 `20260924170000_forecast_realized_vol` 로컬 적용

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `POST /api/coach/size-check` 응답에 변동성 타깃 실값 | 인증 토큰 발급을 자동 모드가 막음 — 리더 메서드까지만 실 DB 로 확인 | 슬라이스 3 화면 QA |
| 매일 배치에서의 실행 | 트리거는 서버 워커의 매시 호출 — 이 브랜치에선 수동 실행만 | 머지 뒤 첫 `ops/daily.log` |
| GARCH 승격 | 채점 창으로 고르면 검증이 아니다 | FR-9 (26주 라이브) |
| ETH 등 43종목 값 없음 | EWMA 가 기준에 진다 — 게이트대로 막음 | FR-9 또는 게이트 기준 재결정 시 |
