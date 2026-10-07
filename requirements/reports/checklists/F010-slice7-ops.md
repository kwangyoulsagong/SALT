# F010 슬라이스 7 체크리스트 — 운영 (2026-10-07)

| 영역 | REQ | 체크리스트 | 상태 |
|---|---|---|---|
| 서버 | `SRV-REQ-024` FR-194~196 | `salt-server/requirements/reports/checklists/SRV-REQ-024.md` §16 | 완료 — `npm test` 594/0 · build · lint · layer-check |
| 서버 | `SRV-REQ-025` FR-62~64 | `salt-server/requirements/reports/checklists/SRV-REQ-025.md` § F010 슬라이스 7 | 완료 — 실 Gemini 호출 없음 |
| DB | `DB-REQ-017` FR-65 · `DB-REQ-029` FR-24 | `salt-server/requirements/reports/checklists/DB-REQ-017.md` · `DB-REQ-029.md` | 로컬 적용 |
| 예측 | `FC-REQ-018` | `salt-forecast/requirements/reports/checklists/FC-REQ-018.md` | FR-1~7 완료 · 실데이터 2회(13행) |
| BFF | `BFF-REQ-039` FR-7 · `BFF-REQ-041` FR-7 | `bff/requirements/reports/checklists/BFF-REQ-039.md` · `BFF-REQ-041.md` | 완료 — `npm test` 202/0 · build |
| 프론트 | `FE-REQ-040` FR-15 · `FE-REQ-042` FR-14 | `salt-microFe/requirements/reports/checklists/FE-REQ-040.md` · `FE-REQ-042.md` | 코드 완료 · 화면 실측 안 함 |

## validate — 돌린 것

| 영역 | 결과 |
|---|---|
| `salt-server` | `npm test` 594 / 0 · `npm run build` 0 errors · `npm run lint` · `npm run test:layer-check` 전부 통과 · `prisma generate` · `migrate deploy`(로컬) · 스크래치 tsx 로 `PrismaForecastReader.volatilityAsOf()`(2026-10-07T00:00Z) · `PrismaLlmUsageStore` `record` / `usageSince` 실 DB(행 지움) |
| `bff` | `npm run build` · `npm test` 202 / 0(목표 비중 `stale_inputs` 옮기기 단언 추가). lint 스크립트 없음 |
| `salt-microFe` | `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test` 2/2 · `test:layer-check` · `turbo build` web · web-tax 2/2 |
| `salt-forecast` | `ruff check` · `ruff format --check`(230) · `pyright` 0 · `lint-imports` 3 kept · `pytest` 231(새 `tests/domain/test_ops_health.py` 12) · `tests/leakage` · 스키마 계약(`FORECAST_DATABASE_URL`, `ops_check` 포함) · `ops_monitor --dry-run` · `--as-of 2026-10-05T12:00` 재현 · 실제 실행 2회(13행 유지) |

## 제품 공통 수용 기준 (`pr-convention.md` §6)

1. 3종 고지 — 게이트가 하나 더 막을 뿐 여는 경로 0. 막히면 해설 LLM 도 부르지 않는다
2. 주문 실행 코드 0 — 새 외부 호출 없음(Gemini 호출 수를 줄이는 쪽)
3. 금액 계산 서버 — 무관(목표 비중 계산 무변경, 멈춘 시세를 빼기만)
4. 확신 · 목표가 · 명령형 0 — 새 문구 둘은 상태 설명("잠시 보여 드리지 않아요")

## 첫 실데이터 점검 (2026-10-07 11:00 KST, 13 항목)

| 항목 | 판정 | 뜻 |
|---|---|---|
| `job:rule_ic` | overdue 217.8h | 마지막 성공 2026-09-28. 10-05 월요일에 배치가 돌지 않아 월요일 조건 때문에 한 주를 건너뛰었다 → `42df20b` |
| `ledger:target_weight_live` | late | 2026-10-05 비중을 t+26.6h 에 기록 — 성적 제외, 이미 알려진 사건 |
| `ledger:judgment_ledger` | missing | 10-01~10-05 닷새 — 서버가 꺼져 있던 기간. 되살릴 수 없다 |
| 나머지 10 | ok | — |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 화면 실측(판단 `stale_inputs` 문구 · 목표 비중 막힘) | 로컬 재료가 신선해 상태가 재현되지 않았고 Playwright route 고정 데이터로 찍지 않았다 | PR 머지 전 Playwright route(3100) 또는 다음 화면 QA |
| 실제 Gemini 호출의 `llm_call_logs` 행 · `usageMetadata` 토큰 | 키 호출을 하지 않았다 — 저장소 · 집계는 실 DB 로 확인 | 다음 해설 실호출 때 표 확인 |
| 상한 도달 실측(300 시도) | 단위 테스트만 | 운영 첫 주 로그 |
| 시장 심리 신선도 | 심리가 사용자 API 호출 때만 계산돼 2026-09-30 뒤로 멈춰 있다 — 넣으면 판정 전부 막힘 | 심리 계산을 워커로 옮기는 별도 REQ(사용자 결정 필요) |
| `judgment_ledger` 10-01~10-05 빈 날 | 원장은 그날 재료로만 쓴다 — 복구 불가 | 2026-11-23 라이브 IC 리포트에 표본 5일 부족을 적는다 |
| `ops_check` 서버 표시 · 알림 | 뷰 · 알림 경로 없음 — 로그 · 표만 | 필요 시 뷰 + `SRV-REQ` |
| `llm_call_logs` 보존 정책 · Prisma 인덱스 이름 드리프트 | 하루 ≤ 300행 · 드리프트는 이전 마이그레이션 몫 | 기술부채 — 행이 쌓이거나 다음 `migrate dev` 정리 때 |
| 새 쿼리 `EXPLAIN (ANALYZE, BUFFERS)`(`llm_call_logs` 집계 · ops 조회) | 표가 작아 붙이지 않았다 | 행이 수백을 넘으면 |
| 운영 DB 마이그레이션 2건 | 로컬만 | 배포 시 |
