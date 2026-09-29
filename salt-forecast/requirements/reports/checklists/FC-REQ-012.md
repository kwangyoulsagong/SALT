# FC-REQ-012 체크리스트 — 목표 비중 안내 규칙 과거 성적 (F010 슬라이스 5)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 사전등록 | `preregistration/2026-09-29-target-weight.toml`(`766e08d`, 결과 전) · `store/rule_ic.register` 재사용 | DB `forecast.preregistration` `target-weight@1` 1행(`new: true`). 등록 뒤 파일 무변경 |
| FR-2 규칙 · 시뮬레이션 | `domain/target_weight.py` | 테스트 11: 고정 벡터 4(서버와 같은 값) · 역변동성이면 w·σ 균등 · 합 ≤ 1 · 음수 없음(무작위 200) · σ 없으면 현금 · t+1 부터 적용 · 흘러간 비중 · 회전 비용 · 첫 리밸런스 전 현금 · 실패 사례 순서(선별 없음) · 같은 거리면 작은 목표 · 부트스트랩 재현 |
| FR-3 실행 | `scoring/target_weight.py` | 누수 테스트 1: 봉 300 뒤를 크게 흔들어도 그 전 리밸런스 행 목표(core · core_alts) · 알트 목록 동일 |
| FR-4 작업 · 리포트 | `jobs/target_weight.py` · `reports/target-weight-target-weight-1-2026-09-29.md` | 실행 코드 `84f69b2`(리포트 헤더) · 8.5초 · 13 기록 |
| FR-5 서버 상수 | `salt-server/src/coach/domain/policy/targetWeightRecord.ts` | 서버 테스트가 리포트 1차 표(core 5행) 값 · claims · 실패 사례 달을 대조 — 통과 |

## 검증

| 명령 | 결과 |
|---|---|
| `uv run ruff check .` · `ruff format --check .` | 통과 |
| `uv run pyright` | 0 errors |
| `uv run lint-imports` | 3 kept |
| `uv run pytest -q` | 149 passed · 1 skipped(스키마 계약 — env 없음, 이 슬라이스 DDL 변경 없음) |
| `uv run pytest tests/leakage -q` | 18 passed(+1) |
| `jobs.target_weight --as-of 2026-09-29` | 8.5초 · 사전등록 1행 · 리포트 |
| `jobs.target_weight --dry-run --no-report --as-of 2026-06-30` | 11초 · 판정 같음(core 0.15 덜 빠짐 ✓ · 타이밍 ✗, CAGR +9.4% · MDD −36.1%) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 라이브 채점 | 등록이 백테스트 기록으로 정했다 | `target-weight@2` |
| 서버 σ 와 백테스트 σ 의 초기값 차이 | 서버 `v_realized_vol.ewma` 는 첫 30일 평균으로, 백테스트는 첫 관측 제곱으로 시작한다 — λ 0.94 라 수백 일 뒤엔 차이가 사라진다(BTC · ETH 는 수천 일) | 이력이 짧은 알트는 서버가 240일 미만을 막아 영향이 없다 |
| 생존 편향 | 상장폐지 원천 없음 | 리서치 §10 슬라이스 7 |
