# FC-REQ-024

## 2026-11-03 — MONEY-S1a 대조 빈칸(파일에 함께 적힌 REQ)

- `e83f7f80` — 이벤트 계약 `savings.ProjectionIssued` 가 이 REQ(채점)를 구독 예정으로 적는다. 예측 쪽 변경 0 — 채점은 S1b 이후(발행 3개월 뒤부터 의미)
- `531fdf35` — 계약 reason 값 하나 추가(`not_reachable`). 예측 코드 변경 0 — 소비처 아직 없음

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [ ] 착지 구간 채점 — 발행이 쌓인 뒤

## 2026-11-18 — 돈 관리 O4 개인 재무 구간 채점(`feat/fc-req-024-personal-projection-scoring`)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 사본(뷰) | `store/personal_projection.read_*` · `save_copies`(처음 값 지킴) | 실 DB `test_personal_projection_store` · 실화면 임시 계정 발행 4건 사본 |
| FR-2 최소 값 | 가계부 뷰 `outcome` · 저축 `reached_month` · `archived_month` | Kotlin `착지 채점 export 뷰` 시험 — 뷰 열 이름 = 계약(금액 0) · 서버 `LandingEngine.track` 과 4경계 같은 답 |
| FR-3 판정 | `domain/personal_projection` — 경계 표 11 + 열림 · 계획만 · 보관 순서 | `test_personal_projection.py` 22 |
| FR-4 커버리지 | Prisma 뷰 `v_personal_coverage` · domain `coverage` 같은 식 | 실 DB 시험 · E2E 숫자(12 중 9 · 3명) |
| FR-5 해시 · 지우기 | 뷰 `sha256(user_id)` · `prune_missing`(읽기 성공한 종류만) | 실 계정 삭제 → 서비스 행 0 · 예측 사본 4 → 다음 실행 0 |
| FR-6 물가 | `ingest/ecos.py` · `domain/price_index.py` · `replace_series` | 녹화 응답 4종(실제 · 잘못된 키 · 자료 없음) · 실키 742개월 저장 · 누수 무작위 as_of 1,000 |
| FR-7 점검 | `coverage_checks` — 정수 비교(0.8 − 0.1 부동소수 경계 결함을 시험이 잡음) | 경계 시험 4 |

- 검증: `ruff` · `ruff format --check` · `pyright` 0 · `lint-imports` 3 kept · `pytest -q` 전부 통과 · `pytest tests/leakage` 50 통과 · `personal_scoring --dry-run --as-of 2026-06-30` · `ingest_market --only ecos --dry-run --as-of 2026-06-30`(737개월 — 그 뒤 발표분 빠짐)
- EXPLAIN: 가계부 뷰 0.08ms(지출 인덱스) · 저축 뷰 0.08ms · 커버리지 뷰 인덱스(kind) · 물가 뷰 2.0ms(기본 키)
- 결함 1(고침): 다건 바인딩에 SQL `now()` — 실저장에서 깼다 → 시각을 작업이 넘김 + 실 DB 시험

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 첫 실판정 · 실커버리지 숫자 | 실 DB 발행 0(새 맥 이전 뒤 저축 · 가계부 미사용) | 발행 뒤 가계부 다음 달 8일 · 저축 도달/늦은 끝 |
| 매일 배치(`daily.sh`)로 처음 도는 회차 | 실행 트리는 머지 뒤 매시 따라간다(`OPS-005`) | 머지 다음 날 `job_run` `personal_scoring` 성공 행 |

## 2026-11-18 확인 2회차

- 변이 15(동치 1) · 시험 둘 추가(못 읽은 원천 · 빈 원천) · 미달 WARN 로그 — 루트 체크리스트 §5
