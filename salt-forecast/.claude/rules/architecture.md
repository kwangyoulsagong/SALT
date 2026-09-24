# 아키텍처 — 층과 의존 방향

## 1. 층

| 층 | 책임 | import 가능 | I/O |
|---|---|---|---|
| `domain` | 순수 함수 · 타입: 분위수 → 확률, pinball · 커버리지 · 방향 적중, 기준 모델, 소등 판정, 온톨로지 타입 | 표준 라이브러리 · `numpy` · `polars` | **없음** |
| `ingest` | 외부 소스 1개 = 파일 1개. 응답 → pydantic → raw 행 | `domain` · `store` | HTTP |
| `ontology` | raw → entity · relation · fact, 식별자 해소 | `domain` · `store` | DB |
| `features` | as-of 피처 프레임 생성 | `domain` · `store` | DB 읽기 |
| `models` | 학습 · 예측 · 보정 · 직렬화 | `domain` · `features` · `store` | DB · 파일 |
| `scoring` | 기간 지난 예측 채점 · 기준 대비 · 소등 | `domain` · `store` | DB |
| `store` | SQL 읽기 · 쓰기. **쓰기는 `forecast.*` 만** | `domain` | DB |
| `jobs` | 엔트리포인트 · 락 · 로깅 · 인자 | 전부 | — |

**방향**: `jobs → {ingest, ontology, features, models, scoring} → store → domain`.
`ingest · ontology · features · models · scoring` 끼리는 서로 import 하지 않는다 — 단 `models → features` 만 허용
(학습과 예측이 **같은 피처 함수**를 써야 하기 때문. 두 벌이면 학습-서빙 불일치가 생긴다).

## 2. 강제 — 문서가 아니라 실행되는 코드

`pyproject.toml` 의 `[tool.importlinter]` 계약이 규칙 표다. `uv run lint-imports` 가 validate 단계에서 돈다.

```toml
[[tool.importlinter.contracts]]
name = "domain 은 I/O 를 모른다"
type = "forbidden"
source_modules = ["salt_forecast.domain"]
forbidden_modules = ["psycopg", "sqlalchemy", "httpx", "salt_forecast.store", "salt_forecast.ingest"]

[[tool.importlinter.contracts]]
name = "층"
type = "layers"
layers = ["salt_forecast.jobs", "salt_forecast.models | salt_forecast.scoring | salt_forecast.ontology | salt_forecast.ingest", "salt_forecast.features", "salt_forecast.store", "salt_forecast.domain"]
```

규칙을 바꾸면 이 표와 §1 표를 **같은 커밋**에서 바꾼다.

## 3. 작업(job) 모양

```python
def main(argv: list[str] | None = None) -> int:
    args = parse(argv)  # --as-of, --symbols, --dry-run
    with job_lock("predict_daily"):  # Postgres advisory lock. 겹치면 즉시 종료(0)
        run = start_run("predict_daily", args)  # forecast.job_run 행
        try:
            result = predict_daily(args.as_of, args.symbols, dry_run=args.dry_run)
            finish_run(run, ok=True, rows=result.rows)
            return 0
        except Exception as e:
            finish_run(run, ok=False, error=summarize(e))  # 원문 응답 · 키 없음
            raise
```

- **모든 작업은 `--as-of` 를 받는다.** 기본값은 "지금"이지만, 과거 날짜로 돌리면 그 날 돌렸을 때와 **같은 결과**가 나와야 한다(`time-and-leakage.md`).
- **모든 작업은 `--dry-run`** — DB 쓰기 없이 행 수 · 샘플만 출력.
- 작업은 **멱등**이다. 같은 `as_of` 로 두 번 돌려도 행 수가 같다(upsert 키는 `db-contract.md`).
- 작업 안에 로직을 쓰지 않는다. 작업은 인자 · 락 · 기록만.

## 4. 새 소스 · 새 모델 추가

- 소스: `ingest/<source>.py` + `tests/ingest/test_<source>.py`(녹화된 응답 픽스처) + `security-sources.md` 표에 한 줄
- 모델: `models/<name>.py` + `MODEL_REGISTRY` 등록 + 워크포워드 리포트(`reports/`) — 리포트 없는 모델은 등록하지 않는다

## 5. 하지 않는 것

- 전역 가변 상태 · 모듈 import 시점의 DB 연결
- `domain` 에서 `datetime.now()` — 시각은 인자로 받는다
- 노트북(`.ipynb`)을 코드 경로로. 탐색은 `notebooks/`(gitignore), 쓸 코드는 모듈로 옮긴다
