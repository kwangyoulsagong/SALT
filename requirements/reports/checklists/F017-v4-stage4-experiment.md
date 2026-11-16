# 체크리스트 — F017 v4 순서 4 예측 실험 H1 · H3 (2026-11-16)

슬라이스 `requirements/specs/in-progress/F017-v4-stage4-experiment-slice.md` · 브랜치 `feat/f017-v4-s4-forward-test`

## 검증 — 돌린 것

| 항목 | 결과 |
|---|---|
| `uv run ruff check .` · `ruff format --check .` | 통과 · 423 파일 |
| `uv run pyright` | 0 errors |
| `uv run lint-imports` | 3 kept · 0 broken |
| `uv run pytest -q`(실 DB — 스키마 계약 포함) | exit 0 |
| `uv run pytest tests/leakage -q` | 통과 — 새 시험 둘(H1 행 t 뒤 RV · 수익을 바꿔도 t 까지 HAR · 기준 셋 · 컨포멀 같음 / H3 t 뒤 봉 · 제목을 더해도 사건 · 거래량 · 소식 수 같음) |
| 새 단위 시험 | H1 15 · H3 13 · jsonb 1 |
| 변이 시험(scratchpad 사본 — `git checkout` 안 씀) | **7/7 잡힘** — 퍼지 제거 · 컨포멀에 열린 라벨 · EWMA 에 다음 봉 · 판정 날짜 당일(처음엔 살아남음 → 경계 시험 더함) · σ 에 오늘 · 국내 소식 창 주말 · 플라시보 무시 |
| 마이그레이션 `20261116180000_forecast_experiment_h1_h3` | 로컬 `prisma migrate deploy` 적용(추가만) · 계약 시험 통과 |
| `jobs.vol_range --dry-run` · 실행 | 13~16초(로드 15초가 대부분) · RSS 661MB · 1차: 코인 h1 · h5 forward(QLIKE HAR 0.493 · 0.403 vs 최선 기준 0.627 · 0.515, Holm p ≤ 0.0075, 덮임 80.5 · 95.0 / 79.8 · 94.7%, 플라시보 못 넘음) · 국내 `history_short` |
| 전진 예측 기록 | 580행(코인 240 × 2 · 국내 50 × 2) · 다시 돌려도 580 · 기록 시각 하나(첫 기록 보존) |
| `jobs.move_news` 실행 | 7초 · 사건 226 기록(국내 3 · 코인 223 — 11-14 KST 코인 전반 급락 198) · 과거 참고 전부 below_min |
| NaN jsonb 결함 | 첫 실 실행에서 `detail` 의 NaN 을 Postgres 가 거절 → `store/jsonb.dumps`(null 로) · 시험 1 |
| `ops/daily.sh` | `zsh -n` 통과 · `event_window` 뒤 `move_news` · `vol_range` |
| `node scripts/check-done.mjs` | 통과 |
| **확인 2회차**(사용자 "검증 다함?") — 전진 채점 경로 시험 | 채점 · 판정 표본 함수가 시험 0 이었다 → `tests/scoring/test_experiment_forward.py` 5(H1 열린 예측 채점 · 늦은 기록 · 안 닫힘 · RV 빈 날 · 없는 종목 / 판정 표본 = 등록 뒤 · 제때 · 닫힘 / H3 기록 한 번 · since 경계 · 5봉 전 다시 채점 · 쿨다운 · 비용 뒤 / 제목 거르기) · 변이 **7/7**(M8 ~ M14) |
| 과거 as_of dry-run(`python-style.md` §7) | `vol_range` · `move_news --dry-run --as-of 2026-06-30` 통과 |
| 재현 | 같은 as_of 두 번 → 리포트 바이트 같음(머리 코드 · 시각 줄 제외) |
| 같은 원인 결함 — 단타 방향 확률 판정 날짜 | `is_look` 이 그날만 판정해 맥이 잠들면 건너뜀 → 그 뒤 첫 실행이 판정 · 같은 날 두 번째는 안 함(`last_run`). 경계 시험 6 · 변이 M15 잡힘 · `short_direction test --dry-run` 48초 |
| 서버 | `prisma validate` · `migrate status`(최신) · `npm test` 1605 통과 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 첫 채점(라벨 닫힘) | 오늘 기록한 예측 · 사건의 라벨이 아직 안 닫혔다 | 2026-11-17 daily 회차(코인 h1) · 11-21(h5) |
| 국내 H1 1차 판정 | 새 맥 국내 일봉 백필 중(2024-11 ~, 등록 때 2021-10 ~) | 국내 5년 백필 끝(`salt-backfill-plan`) |
| 판정(전진) | 등록 판정 날짜 | 2027-01-12 · 02-11 · 03-13 |
| H3 과거 참고 숫자 | 국내 소식 이력 이틀 · 코인 소식 희소 — 판정 아님(등록대로) | 서버 1년 백필 뒤 참고로만 |
| 화면 · 서버 뷰 | 판정 통과 칸이 없다 | 첫 통과 칸이 생긴 판정 날짜 |
| 실화면 | 화면 변경 0 | — |
