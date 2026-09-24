# SALT Forecast Claude 하네스

`salt-forecast/**` 작업에 적용한다. 데이터 파이프라인 · 온톨로지 · 예측 · 채점을 맡는 **Python 배치 서비스**다.
근거는 `requirements/decisions/ADR-003` · `ADR-004`, 기획은 `pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md`.

`salt-server/**` · `bff/**` · `salt-microFe/**` 는 사용자가 계약 변경을 명시하지 않으면 수정하지 않는다.
**DB 스키마(DDL)는 여기서 바꾸지 않는다** — `salt-server` Prisma 마이그레이션이 유일한 DDL 출처다(`db-contract.md`).

## 한 문장

> **이 서비스가 낸 숫자는 전부 채점된다. 채점되지 않은 숫자는 화면에 가지 않는다.**

## 프로젝트 개요

- 런타임: Python 3.12 · 패키지 관리 `uv` (`pyproject.toml` + `uv.lock`)
- 데이터: `polars`(변환) · `psycopg` 3 + SQLAlchemy Core(DB, ORM 안 씀) · `pydantic` v2(외부 응답 · 설정)
- 모델: 기준(`statsforecast` 무작위 보행 · ETS) · `lightgbm`(분위수, 종목 풀링) · 보정 `mapie`(ACI) · (선택 그룹 `fm`) `chronos-forecasting` Bolt-small · 감성 `transformers` + FinBERT — 전부 무료 · CPU (ADR-004)
- 오케스트레이션: `jobs/` 의 CLI 엔트리 + cron. flow 가 5개를 넘으면 Prefect 로(ADR 없이 가능, REQ 에 기록)
- 검증: `ruff`(lint · format) · `pyright --strict` · `pytest` · `import-linter`(레이어)

## 명령어

```bash
uv sync
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run lint-imports
uv run pytest
uv run python -m salt_forecast.jobs.<job> --dry-run   # 모든 작업은 --dry-run 을 지원한다
```

## 구조

```
salt-forecast/
  src/salt_forecast/
    domain/       # 순수 계산: 분위수 · 채점 지표 · 기준 모델 · 온톨로지 타입. I/O 없음
    ingest/       # 외부 소스 → raw 행. 소스마다 파일 하나
    ontology/     # raw → entity · relation · fact 정규화
    features/     # 시점 고정(as-of) 피처 생성
    models/       # 학습 · 예측 · 보정. 모델 버전
    scoring/      # 워크포워드 채점 · 기준 모델 비교 · 자동 소등 판정
    store/        # DB 읽기 · 쓰기 (forecast.* 만 쓴다)
    jobs/         # 엔트리포인트. 스케줄 · 락 · 로깅만, 로직은 위 층을 부른다
    config.py     # pydantic-settings
  tests/          # 층별 미러 + tests/leakage/
  reports/        # 백테스트 리포트(커밋한다 — 채점의 근거)
  requirements/{specs,reports}/
```

## 규칙 인덱스

| 문서 | 내용 |
|---|---|
| `.claude/rules/architecture.md` | 층 · 의존 방향 · `import-linter` 계약 · 작업(job) 모양 |
| `.claude/rules/time-and-leakage.md` | **가장 중요.** 시점 고정 · 룩어헤드 금지 · 두 개의 시각 |
| `.claude/rules/modeling-evaluation.md` | 예측 대상 · 워크포워드 · 지표 · 기준 모델 · 자동 소등 · 모델 버전 |
| `.claude/rules/data-pipeline.md` | 수집 · 멱등 · 재시도 · 레이트 리밋 · 신선도 |
| `.claude/rules/ontology.md` | 엔티티 · 관계 · 사실 · 출처 · 식별자 해소 |
| `.claude/rules/db-contract.md` | `forecast` 스키마 · 쓰기 주인 · 서버가 읽는 계약 |
| `.claude/rules/python-style.md` | 타입 · 금액 · 에러 · 로깅 · 테스트 · 검증 명령 |
| `.claude/rules/security-sources.md` | 키 · 약관 · 개인정보 · 소유자 전용 |
| `.claude/rules/performance.md` | 작업별 예산 · 한 번 읽고 메모리 계산 · COPY 대량 쓰기 · 측정 |

## 스킬

`.claude/skills/pipeline` — plan → orchestrate → validate → deliver → retrospect. 다른 영역과 같은 5단계다.

## 절대 하지 않는 것

- 주문 · 출금 API 호출 코드 (공통 수용 기준 2)
- 채점 없이 `forecast.prediction` 을 화면용으로 노출 (ADR-003 §3)
- LLM 으로 숫자 만들기 — 이 서비스에는 LLM 호출이 없다(감성 분류 모델은 예외, `data-pipeline.md` §5)
- `forecast` 밖 스키마에 쓰기
