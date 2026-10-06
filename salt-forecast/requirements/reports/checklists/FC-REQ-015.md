# FC-REQ-015 체크리스트 — 독립 데이터 2차: 온체인 · 도미넌스 (2026-10-06)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `preregistration/2026-10-06-onchain-regime.toml` · `2026-10-06-dominance.toml` | `9b13d91`(결과 · 첫 수집 전) 이후 무변경 · `onchain-regime@1` DB 1행 |
| FR-2 | `ingest/coinmetrics.py` | 픽스처 테스트 3(그날 + 2일 전엔 모른다 · 이미 받은 날 건너뜀 · 페이지 토큰). 실수집 MVRV 5,923 · 입출금 각 5,643 · 활성주소 · 해시레이트 각 5,940행, 두 번째 실행 0행 |
| FR-3 | `ingest/coingecko.py` | 픽스처 테스트 2(갱신 · 받은 시각 · 멈춘 원천은 실패). 실수집 3행/회 |
| FR-4 | `jobs/ingest_market.py` | `--only coinmetrics --only coingecko --dry-run` 3행(증분) · 실패 0 |
| FR-5 | `domain/onchain.py` · `scoring/onchain_regime.py` · `jobs/onchain_regime.py` | 단위 5 · 누수 2(t 뒤 공개 점을 오염해도 분위 · 배수 · z 동일) · 합성 2(급락을 아는 신호는 ΔMDD 통과 · 결정적). 실행 9.7초 |
| FR-6 | 서버 목표 비중 | 채택 없음 → 무변경(`salt-server` · `bff` · `salt-microFe` diff 0) |

## 판정 표 (기준 = target-weight@2 core σ 0.15, 2018-01-09 ~ 2026-10-05)

| 조건 | mvrv_cap | 통과 |
|---|---|---|
| (1) ΔMDD 95% CI 하한 > 0 | +0.5% [−3.5%, +1.1%] | ✗ |
| (2) ΔCalmar ≥ 0 | −0.02 [−0.12, +0.00] | ✗ |
| (3) 앞 · 뒤 절반 ΔCalmar ≥ 0 | −0.05 · +0.00 | ✗ |
| (4) 상한 주 ≥ 20 · 구간 ≥ 2 | 16주 · 2구간 | ✗ |

기준 곡선 CAGR +11.5% · MDD −36.0% = `target-weight@1` core 0.15 기록과 같다(배선 확인).

## validate (`python-style.md` §7)

- `ruff check` · `ruff format --check`(198 files) · `pyright` 0 · `lint-imports` 3 kept
- `pytest` 188 passed(스키마 계약 포함, `FORECAST_DATABASE_URL` 지정) · `tests/leakage` 22 passed
- `onchain_regime --dry-run --no-report --as-of 2026-10-06` 같은 판정

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `dominance@1` 라이브 통계 | 원천 이력 없음 · 등록이 엿보기 금지 | 2027-05-17 |
| 온체인 상한 라이브 재평가(`@2`) | 같은 과거 표본 재사용 금지 | 라이브 26주 이상 뒤(2027-04~) |
| 탐색 `eth_mvrv` | ETH 온체인 미수집 | 라이브 재등록 때 필요하면 수집 |
| Coin Metrics CC BY-NC 의 비상업 해당 여부 | 화면 표시 없음 · 판정 채택 없음이라 지금 영향 없음 | 상업 전환 또는 채택 시(리서치 OQ 5) |
| 운영 cron | 로컬 LaunchAgent(`ops/daily.sh`)만 — 운영 배포 없음 | 배포 시 |
| 데이터랩 · 뉴스 구조화 · LLM 가드 | 사용자 결정으로 이번 범위 밖 | 슬라이스 6 다음 묶음 |
