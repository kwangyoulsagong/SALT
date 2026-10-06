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

## 추가 확인 (2026-10-06, 사용자 요청 "다 확인")

| 확인 | 방법 | 결과 |
|---|---|---|
| 상한 주 독립 재계산 | 판정 코드를 쓰지 않고 SQL 로 월요일마다 "그때 알던" MVRV · 분위를 직접 계산 | 16주 · 날짜까지 리포트와 같다 |
| 사전등록 무결성 | DB `preregistration` content_sha256 vs 파일 sha256 · 커밋 시각 | 같다 · 등록 11:46 → 실행 코드 11:55:04 → 결과 11:55:33 |
| 재현 | 같은 as_of 두 번 · 커밋된 리포트와 비교 | 한 글자도 같다 |
| 과거 시점 재현 | `--as-of 2022-06-01` 로 돌린 상한 구간 vs 지금 실행의 2022-06 이전 구간 | 같다(뒤 데이터가 과거 판단을 바꾸지 않는다) |
| 매일 수집 환경 | LaunchAgent 와 같은 최소 환경(`env -i` · PATH 만)에서 `ingest_market --only coinmetrics --only coingecko --dry-run` | 실패 0 · 3행 |
| Coin Metrics 약관 · 한도 | Chrome 으로 공식 문서 `docs.coinmetrics.io/api/v4` | 무료 엔드포인트 키 불필요 · Creative Commons(by-nc/4.0 링크) · Community 10요청/6초/IP — 우리 초당 1 = 60% |
| CoinGecko 키 없는 호출 · 응답 모양 | Chrome 으로 `docs.coingecko.com` Global · Errors & Rate Limits | 키 없는 호출 공식 허용(IP 기준 한도 · 4xx 도 한도에 셈) · 필드 `market_cap_percentage` · `total_market_cap` · `updated_at` 파서와 같다 |
| CoinGecko 출처 표기 조건 | `brand.coingecko.com` 표기 안내 | **미확인** — 확장 권한이 없는 도메인. 화면 표시 없음이라 지금 의무 없음 → 표시 전 확인 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `dominance@1` 라이브 통계 | 원천 이력 없음 · 등록이 엿보기 금지 | 2027-05-17 |
| 온체인 상한 라이브 재평가(`@2`) | 같은 과거 표본 재사용 금지 | 라이브 26주 이상 뒤(2027-04~) |
| 탐색 `eth_mvrv` | ETH 온체인 미수집 | 라이브 재등록 때 필요하면 수집 |
| Coin Metrics CC BY-NC 의 비상업 해당 여부 | 화면 표시 없음 · 판정 채택 없음이라 지금 영향 없음 | 상업 전환 또는 채택 시(리서치 OQ 5) |
| 운영 cron | 로컬 LaunchAgent(`ops/daily.sh`)만 — 운영 배포 없음 | 배포 시 |
| CoinGecko 출처 표기 문구 | 표기 안내 페이지를 읽지 못했다(브라우저 권한) | 도미넌스를 화면에 표시하기로 할 때 |
| 새 원천의 첫 자동 수집 행 | 오늘 daily 는 새 원천 추가 전(11:34)에 이미 돌았다 — 최소 환경 dry-run 으로만 확인 | 2026-10-07 LaunchAgent 실행 로그 |
| 데이터랩 · 뉴스 구조화 · LLM 가드 | 사용자 결정으로 이번 범위 밖 | 슬라이스 6 다음 묶음 |
