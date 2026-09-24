# DB 계약 — 누가 무엇을 쓰나

## 1. 한 DB, 두 쓰기 주인

| 스키마 | 쓰기 | 읽기 |
|---|---|---|
| `public` (Prisma 기존) | `salt-server` | `salt-forecast`(시세 · 보유 · 관심 목록 **읽기만**) |
| `forecast` | **`salt-forecast` 만** | `salt-server` (`intelligence` · `coach` 컨텍스트) |

- DB 역할(role)을 나눈다: `salt_forecast` 는 `forecast` 에 쓰기 + `public` 일부 테이블 SELECT 만. 권한으로 강제한다.
- `salt-server` 는 `forecast` 에 SELECT 만.

## 2. DDL 은 한 곳에서

- **`forecast` 스키마 DDL 도 `salt-server/prisma/migrations` 로 만든다** — `prisma migrate dev --create-only` 로 빈
  마이그레이션을 만들고 SQL 을 손으로 쓴다. Prisma 모델은 만들지 않는다(`multiSchema` 는 기존 모델 전부에
  `@@schema` 를 요구해서 쓰지 않는다, `DB-REQ-029`). 마이그레이션 이력이 두 벌이면 한쪽만 적용된 DB 가 생긴다.
- 서버는 `forecast` 를 **뷰로만** 읽는다(`$queryRaw`). 테이블을 직접 읽으면 컬럼 변경이 조용히 서버를 깬다.
- Python 은 SQLAlchemy Core `Table` 을 **손으로** 선언한다(리플렉션 금지 — 스키마가 바뀌면 테스트가 깨져야 한다).
- `tests/store/test_schema_contract.py` 가 실제 DB 의 컬럼 · 타입과 Python 선언을 대조한다.

## 3. 테이블 (DB-REQ-029 초안)

| 테이블 | upsert 키 | 비고 |
|---|---|---|
| `job_run` | id | 작업 이력 · 행 수 · 오류 요약 |
| `source_status` | source | 마지막 성공 · 실패 |
| `raw_record` | (source, external_id, version) | |
| `entity` · `entity_alias` · `relation` · `fact` | `ontology.md` §2 | |
| `model` | model_version | 피처 · 파라미터 · 창 · 아티팩트 해시 |
| `prediction` | (symbol, horizon_weeks, as_of, model_version) | q10~q90 · p_up · 규칙 가격 도달 확률 |
| `score` | (symbol, horizon_weeks, as_of, model_version) | 실현 r · 적중 여부 · pinball — 기준 모델도 같은 표 |
| `gate` | (symbol, horizon_weeks) | 최신 판정 · `blocked_reason` · 26주 지표 요약 |
| `realized_vol` | (symbol, as_of) | 실현 변동성 EWMA · GARCH 도전자 · QLIKE 채점 · 게이트(`FC-REQ-006`) |
| `v_symbol_facts` · `v_symbol_actors` · `v_forecast_card` · `v_realized_vol` | 뷰 | **서버가 읽는 계약** |

- 수치는 `numeric`(금액) · `double precision`(수익률 · 확률). 금액을 float 로 저장하지 않는다.
- 시각은 전부 `timestamptz`, UTC 저장. 표시 시간대는 서버 · 프론트 몫.
- 인덱스: 조회 경로(`symbol, as_of desc`)마다. 새 쿼리는 `EXPLAIN (ANALYZE, BUFFERS)` 를 체크리스트에(서버 `performance-database.md` §3 과 같은 기준).

## 4. 서버가 읽는 계약

`v_forecast_card` 가 서버 전망 도구 `getForecast` 의 유일한 입력이다.

```
symbol, horizon_weeks, as_of, model_version,
q10, q25, q50, q75, q90, p_up,
renderable, blocked_reason,
direction_hit_rate, coverage_80, pinball_vs_baseline, sample, ci_low, ci_high,
recent_misses jsonb   -- [{as_of, realized, q10, q90}] 최근 3건
drivers jsonb         -- 피처 중요도 상위 5
```

- 뷰 컬럼을 바꾸는 PR 은 `SRV-REQ-037` 과 **같은 PR** 이다(계약 변경 — `pr-convention.md` §5).
- **원화 금액은 뷰에 없다.** 보유 수량 × 가격은 서버가 계산한다(공통 수용 기준 3).

## 5. 보존

- `raw_record` 1년, `prediction` · `score` 영구(채점 근거), `job_run` 90일.
- 삭제 작업도 `jobs/` 의 작업이다(`--dry-run` 포함).
