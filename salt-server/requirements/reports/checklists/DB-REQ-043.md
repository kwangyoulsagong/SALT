## F017 v2 단계 1b — 3종 채움 · 국내 단타 원장 (2026-11-10, `feat/f017-s1b-triad-backfill`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-6 출처 라벨 | 충족 | 마이그레이션 적용(`prisma migrate deploy`) · CHECK 6값 · 국내 장기 51,305 → `backtest_full` · 롤백 SQL 머리 · `npm test` 1133/1133 · lint · build · 레이어 훅 사후(음성 대조 exit 2) · 서버 150요청 · 300모드 실측: 3종 결함 160 → 6 · p95 40ms(재시작 직후 292) |
| FR-1~5 · FR-6 등급 표 · 뷰 | 미착수 | 단계 2~4 |

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-3 표 · 뷰 · CHECK | 충족 | `20261111120000_forecast_base_rate` — `below_min` 이면 숫자 NULL CHECK · `closed` 면 문턱 NULL CHECK · 문턱 뷰는 시장마다 최신 실행 |
| FR-7 원장 · export 뷰 · 채점 표 | 충족 | `20261111130000_trade_check_ledger` · `20261111140000_trade_check_export_and_outcome` · prisma migrate diff 0 |
| 롤백 | 충족 | 전부 추가만 — 파일 머리에 DROP 순서 |
| 직접 읽기 목록 고정(`DB-REQ-036` FR-3) | 충족 | 예측은 원장을 export 뷰로만 |

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-1 해설 스냅샷 | 충족 | 마이그레이션 `20261111150000`(추가만 · 롤백 DROP) · 로컬 DB 적용 · UPDATE → `불변이다` 오류(트리거) · `EXPLAIN` 인덱스 스캔 0.005ms · 유일 키 ON CONFLICT |

## 단계 4 등급 — FR-6 (2026-11-11, `feat/f017-s4-grade`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 마이그레이션 목적 하나 · 롤백 | 충족 | `20261111160000_judgment_tier` — 추가만(뷰 둘 · 표 하나), 롤백 SQL 머리 |
| 로컬 DB 적용 | 충족 | `prisma migrate deploy` — pending 0 · export 뷰 칸 13행 대조 |
| CHECK | 충족 | 등급 3값 · 이유 5값 · 참고면 출처 NULL · 검증됨/주의면 출처 있음 · CI 하한 ≤ 상한 |
| 계약 대조 | 충족 | `tests/store/test_schema_contract.py` — 손 선언 `judgment_tier` 와 DB 칸 같음 |
| 읽기 쿼리 | 충족 | 서버는 `v_judgment_tier` 한 문장(칸 4행 — 표 행 = 실행 수 × 4, 하루 4행). `EXPLAIN (ANALYZE, BUFFERS)` 는 확인 2회차에 돌림(아래) |
| 사용자 열 | 0 | export 뷰 · 등급 표 모두 |
| 정정 | 기록 | 계획의 '행동' 열 없음 — spread 는 칸의 성질 |

### 확인 2회차 (2026-11-11, 사용자 "이번 태스크 다한겨?" — 아니었다)

| 항목 | 결과 | 근거 |
|---|---|---|
| `EXPLAIN (ANALYZE, BUFFERS)` 서버 읽기 | 충족 | `v_judgment_tier` — `judgment_tier_pkey` Index Scan → Sort → Unique · 4행 · 0.45ms |
| `EXPLAIN` 배치 읽기 | 충족 | `v_judgment_outcome_export` — 원장 Seq Scan 163,157행 · 67ms. 매일 한 번 전부 읽는다(필터가 거의 안 거름) — 인덱스 불필요 |
| 정정 | 기록 | 1회차 체크리스트 · Changelog 에 `EXPLAIN` 을 돌리지 않고 '한 문장'이라고만 적었다 — 실측으로 바꿈 |

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

| 항목 | 결과 | 근거 |
|---|---|---|
| 마이그레이션 | 충족 | 목적 1(단타 확률) · 추가만 · 롤백 SQL 실제 실행 2회 · `prisma migrate deploy` |
| CHECK | 충족 | 분위 순서 · 0≤p≤1 · 통과면 사유 없음 / 못 넘으면 사유 있음 · 만료 > 기준 |
| 계약 대조 | 충족 | `test_schema_contract`(실 DB) · 저장 테스트 2(재실행 행 수 · 최신만 · 끝 봉 없으면 다음 실행 · 한 줄 한 번 · 만료 renderable false) |
| EXPLAIN | 충족 | 칸 뷰 2.5ms · 종목 뷰 0.3ms 인덱스 스캔 |
| `DB-REQ-036` 주인 표 | 충족 | Changelog 행 — 주인 forecast · 서버 뷰 SELECT 만 · public 직접 읽기 추가 0 |
