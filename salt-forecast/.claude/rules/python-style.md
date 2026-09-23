# Python 관례와 검증

## 1. 타입

- `pyright --strict` 통과. `Any` 는 외부 경계(pydantic 파싱 직전)에만, 주석으로 이유.
- 공개 함수는 인자 · 반환 타입 필수. `dict[str, Any]` 를 층 사이로 넘기지 않는다 — `@dataclass(frozen=True, slots=True)` 또는 pydantic.
- 프레임은 `polars.DataFrame` + **스키마 상수**(`FEATURE_SCHEMA: dict[str, pl.DataType]`)를 두고 경계에서 검사한다.
  `pandas` 는 라이브러리가 요구할 때만 경계에서 변환.

## 2. 숫자

- 금액은 `decimal.Decimal`(DB `numeric`). 수익률 · 확률 · 모델 입력은 `float64`.
- 금액 ↔ float 변환은 `domain/money.py` 한 곳.
- 확률은 `[0, 1]`, 분위수는 단조 — `domain` 의 생성자에서 검사하고 어기면 예외.
- 난수는 `np.random.default_rng(seed)` 를 인자로 받는다. 전역 시드 금지.

## 3. 시간

- `datetime` 은 항상 tz-aware(UTC). naive datetime 이 들어오면 예외. `domain` 에서 `now()` 금지(`time-and-leakage.md`).
- 거래일 · 주 경계는 `domain/calendar.py` 한 곳(거래소별 휴장일).

## 4. 에러

- 예외 계층: `ForecastError` → `SourceError(retryable: bool)` · `DataQualityError` · `LeakageError` · `ContractError`.
- `except Exception:` 은 `jobs` 최상위에서만(기록 후 다시 raise). 층 안에서 삼키지 않는다.
- 데이터 품질 검사 실패(음수 가격 · 중복 봉 · 분위수 교차)는 **조용히 고치지 않고** `DataQualityError` + 해당 행 격리.

## 5. 설정 · 비밀

- `pydantic-settings` 의 `Settings` 하나. env 접두사 `FORECAST_`. 코드에서 `os.environ` 직접 읽기 금지.
- 비밀은 `SecretStr`. `repr` · 로그에 나오지 않는다.

## 6. 테스트

| 층 | 방법 |
|---|---|
| `domain` | 순수 단위 테스트 + 성질 테스트(`hypothesis`: 분위수 단조 · 확률 범위 · pinball ≥ 0) |
| `ingest` | 녹화 픽스처, 네트워크 0 (`respx`) |
| `ontology` · `store` · `scoring` | 실제 Postgres(테스트 스키마, 트랜잭션 롤백). SQLite 로 대체하지 않는다 |
| `features` · `models` | 작은 합성 데이터 + **누수 테스트**(`tests/leakage/`) |
| 계약 | `test_schema_contract.py` — DB 컬럼 ↔ Python 선언 |

- 고정 시각 · 고정 시드. 테스트가 날짜에 따라 결과가 바뀌면 버그다.
- 모델 성적을 단위 테스트로 단정하지 않는다(불안정). 성적은 리포트가 말한다.

## 7. 검증 명령 (validate 단계에서 전부)

```bash
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run lint-imports
uv run pytest -q
uv run pytest tests/leakage -q        # 따로 한 번 더 — 결과를 체크리스트에 붙인다
uv run python -m salt_forecast.jobs.<바꾼 작업> --dry-run --as-of 2026-06-30
```

모델을 바꿨다면 추가로 워크포워드 리포트를 다시 만들고 기준 대비 표를 체크리스트에 붙인다.

## 8. 의존성

- `uv add` 로만. 버전 상한 없이 하한만, 재현은 `uv.lock`.
- 무거운 의존성(torch 등)은 optional group(`[project.optional-dependencies] fm = [...]`)으로 — 기본 설치를 가볍게.
- 라이선스가 비상업 · 연구 전용인 모델 · 데이터는 `security-sources.md` 표에 적고 판단을 남긴다.
