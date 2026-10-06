# FC-REQ-013 체크리스트 — target-weight@2 · 라이브 원장 (2026-09-29)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `preregistration/2026-09-29-target-weight-v2.toml` | `2e28f15`(결과 전) 이후 무변경 · DB 1행 |
| FR-2 | `domain/target_weight.py` | 테스트: a = 0 이 @1 core 와 같음 · 두 묶음 σ 합 = 목표 · 주간 결과 = 일 시뮬레이션 합(비용 0) · 회전 비용 |
| FR-3 | `scoring/target_weight_v2.py` · `jobs/target_weight_v2.py` | 1차 10행 · 판정 ✗ ✗ · 탐색 3행 · 4.8초 |
| FR-4 | `salt-server` `targetWeight.ts` · `targetWeightRecord.ts` | 서버 테스트가 리포트 판정 줄 · CI 칸 대조 |
| FR-5 | `scoring/target_weight_live.py` · `store/target_weight_live.py` · `jobs/target_weight_live.py` · `ops/daily.sh` | 실행 1회 0행(첫 월요일 전) · `--as-of 2026-12-01` 드라이런 0행(미래 봉 없음 — 봉 없는 월요일을 쓰지 않는다) |
| FR-6 | `salt-server/prisma/migrations/20260929130000_forecast_target_weight_live` | 로컬 적용 · 스키마 계약 테스트 통과 |

## 판정 표 (0.15)

| a | ΔCalmar [98.75% CI] | CAGR (core) | ΔMDD | 통과 |
|---|---|---|---|---|
| 0.10 | −0.03 [−0.11, −0.00] | +10.1% (+11.5%) | −0.9%p | ✗ |
| 0.20 | −0.07 [−0.22, −0.01] | +8.7% (+11.5%) | −1.7%p | ✗ |

## validate (`python-style.md` §7)

- `ruff check` · `ruff format --check` · `pyright` 0 · `lint-imports` 3 kept
- `pytest` 162 passed(스키마 계약 포함, `FORECAST_DATABASE_URL` 지정) · `tests/leakage` 19 passed
- 누수: 리밸런스 t 비중은 t 뒤 봉을 흔들어도 같다(백테스트 · 라이브 둘 다) · 봉 없는 월요일은 기록하지 않는다

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~라이브 원장 실제 행 · late 판정~~ **비중 행 닫힘 2026-10-06** | 첫 실행 2026-10-06 02:34Z — 10-05 비중 5행(목표 0.1~0.5, 노출 0.30 · 0.44 · 0.59 · 0.89 · 1.00)이 써졌지만 **전부 late**(t + 26.5h). 로컬 서버(forecast-runner)가 09-30 뒤 내려가 있었다. 사전등록대로 원장에 남기고 성적에서 뺀다 — 30주 도달이 한 주 늦어진다 | 결과 행 2026-10-12 |
| 매주 월요일 24h 안 실행 | 원장은 서버가 떠 있을 때만 쌓인다 — 첫 주가 이 이유로 late | 배포 환경 확정 시(상시 실행) |
| 라이브 30주 성적 문장 | 등록 [live.display] | 2027-05-03 전후 |
| 생존 편향 제거 | 상장폐지 종목을 수집하지 않는다(사용자 결정) | 없음 — 리포트 · 화면 고지로 대신 |
| 알트 규칙 재등록 | 같은 표본 재사용 금지 | 라이브 표본이 쌓인 뒤 `@3` |
