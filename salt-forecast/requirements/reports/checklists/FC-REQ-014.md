# FC-REQ-014 체크리스트 — 독립 데이터 1차: DVOL · 거래소 유의/주의 (2026-09-30)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `preregistration/2026-09-30-dvol-sigma.toml` · `2026-09-30-market-warning.toml` | `f368464`(결과 · 첫 수집 전) 이후 무변경 · `dvol-sigma@1` DB 1행 |
| FR-2 | `ingest/deribit.py` · `jobs/ingest_market.py --only deribit` | 픽스처 테스트 2(봉이 닫힌 뒤에만 · 0 버림 · 청크 중복 없음 — **청크 필터 버그를 테스트가 잡았다**, `since` → `start`). 실수집 BTC · ETH 각 2015행(2021-03-24 ~ 2026-09-28), 두 번째 실행 증분 14행 |
| FR-3 | `ingest/upbit.py` `market_warnings` · `store/market_warning.py` | 픽스처 테스트 2(KRW 만 · 주의 정렬 · 0건은 오류). 실수집 290종목 · 유의 7 · 주의 29, 두 번 실행 → 스냅샷 2벌(불변). 개수는 `RETURNING` 으로(첫 구현의 `rowcount` 는 −1 · 1 을 돌려줬다) |
| FR-4 | `domain/dvol_sigma.py` · `scoring/dvol_sigma.py` · `jobs/dvol_sigma.py` | 단위 5 · 누수 1(t 뒤 수익률 · DVOL 을 흔들어도 t 까지 후보 동일) · 합성 2(정보 있는 DVOL 은 CI 통과 · 잡음은 채택 없음 · 결정적). 실행 6.5초 |
| FR-5 | 서버 σ | 채택 없음 → 무변경(diff 0) |
| FR-6 | `salt-server/prisma/migrations/20260930100000_forecast_market_warning` | 로컬 적용 · 스키마 계약 테스트 통과 · `v_market_warning` 한 종목 EXPLAIN Bitmap Index Scan 0.248ms |

## 판정 표 (7일 ΔQLIKE, 음수 = 후보가 낫다)

| 후보 | BTC [1.25%, 98.75%] | ETH | 반기 | Calmar(σ 0.15) | 통과 |
|---|---|---|---|---|---|
| dvol_scaled | −0.084 [−0.258, +0.059] | −0.089 [−0.192, −0.005] | BTC 뒤 절반 +0.021 | 0.21 (ewma 0.29) | ✗ |
| blend | −0.085 [−0.193, −0.015] | −0.074 [−0.139, −0.029] | 둘 다 음 | 0.26 (ewma 0.29) | ✗ — (3)만 불통과 |

## validate (`python-style.md` §7)

- `ruff check` · `ruff format --check`(183 files) · `pyright` 0 · `lint-imports` 3 kept — **main 에서 깨져 있던 '층' 계약을 `1b515c5` 로 복구**(`store.target_weight_live` → `scoring` import)
- `pytest` 174 passed(스키마 계약 포함, `FORECAST_DATABASE_URL` 지정) · `tests/leakage` 20 passed
- `ingest_market --dry-run --only deribit --only upbit_warning` 306행 · `dvol_sigma --dry-run --as-of 2026-09-30` 같은 판정

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `market-warning@1` 라이브 통계 | 원천에 이력이 없다 — 등록이 8주 엿보기 금지 | 2026-11-25 |
| DVOL 라이브 재평가(`dvol-sigma@2`) | 같은 과거 표본 재사용 금지 | 라이브 26주 이상 쌓인 뒤(2027-04~) |
| 운영 cron 에서 두 소스 | 로컬 `ops/daily.sh` 의 `ingest_market` 에 들어 있다 — 운영 배포 없음 | 배포 시 |
| Coin Metrics · 도미넌스 · 데이터랩 · 뉴스 구조화 · LLM 가드 | 사용자 결정으로 이번 범위 밖 | 슬라이스 6 다음 묶음 |
