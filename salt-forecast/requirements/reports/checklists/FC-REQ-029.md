# FC-REQ-029 체크리스트 — 밸류에이션 밴드 적립

| 항목 | 확인 | 결과 |
|---|---|---|
| FR-1 원천 | dry-run ECOS 9,346행 · Coin Metrics 11,934행 → 실저장 · `series_point` 시리즈 다섯(PER 273 · 배당 273 · 지수 8,058 · 시가총액 · 가격 각 5,967) | pass |
| FR-1 available_at | 시험: 9월 → 11-19 · 12월 → 2027-02-19 · 일값 다음 날 00:00 UTC | pass |
| FR-2 BTC Z | 시험: 식 그대로 · 365일 미만 None · 아직 모르는 날 안 씀 · 7일 묵음 None | pass |
| FR-2 코스피 | 시험: 그때 알던 월값만 · 60달 미만 None · 129일 값 / 131일 None. 실값 대조: 8월 PER 18.64 × 5,290.53 ÷ 6,820.02 = 14.46(뷰와 같음) | pass |
| FR-2 김프 | 시험: 식 · 3일 넘게 어긋나면 None. 실값 +2.94%(11-16) | pass |
| FR-3 검산 | 시험: 정액(배수 일정)은 E 0 · 미래 수익과 같이 움직이면 통과 · 결정적(같은 시드 같은 값) · 닫히지 않은 주 제외 | pass |
| FR-4 관문 | 시험: 260 미만 · 평균 양수지만 90% 하한 ≤ 0 → 실패 · 값 없음 → stale_inputs. DB CHECK 관문 실패면 배수 1.0 | pass |
| FR-5 실패 사례 | 시험: 26주 묶음 · 상위 3 순서 · 전체 수 | pass |
| FR-6 저장 · 뷰 | 두 번 실행 2행(멱등) · 뷰 자산마다 한 행 · `EXPLAIN` Index Scan Backward 버퍼 6 · 스키마 계약 시험(실 DB) | pass |
| 누수 | `tests/leakage/test_accumulation_leakage.py` — as_of 뒤 행 지워도 결과 같음(빈 시험 아님) | pass |
| 변이 | 닫힘 검사 없음 · available 무시 · PER 월값 전체 · 관문 점추정 · 신선도 100일 — 다섯 모두 시험이 잡음(바이트코드 캐시 끄고) | pass |
| 과거 as_of dry-run | `--as-of 2026-06-30` — BTC low · 코스피 extreme_high(6월 PER 23.1) | pass |
| 검증 명령 | ruff · format · pyright 0 · lint-imports 3 kept · pytest 전체 · leakage 51 · store(실 DB) | pass |

미검증: 매일 배치 첫 회차(`daily.sh` 끝 `accumulation_band`) — 다음 매일 회차(2026-11-20) `job_run` 확인.

## 2026-11-19 F003 v2 순서 2 짝

- `tests/jobs/test_accumulation_band_job.py` — 밴드 표 = 사전등록 TOML(두 자산) · 표준 JSON(inf 0) · `test_schema_contract` 통과(실 DB)
- ruff · pyright 0 · lint-imports 3 kept · pytest 전부 · `--dry-run --as-of 2026-06-30` · 실 DB 재실행 2행(밴드 표 채움)
- 미충족: 실행 트리(`~/.salt-run`)는 머지 뒤 따라간다 — 그 전 회차는 `bands` 를 안 써 기본값 `[]` 이 유지된다(지금 행은 브랜치 실행으로 채움)
