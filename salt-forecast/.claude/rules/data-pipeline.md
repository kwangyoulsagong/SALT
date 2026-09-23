# 데이터 파이프라인 — 수집

## 1. 흐름

```
ingest/<source>.py  →  forecast.raw_record (원문 요약 · 해시 · 시각 3종)
ontology/*          →  forecast.entity · forecast.relation · forecast.fact
features/*          →  (메모리 프레임, 저장 안 함 — 재현은 as_of 로)
```

## 2. 소스 모듈 하나의 모양

```python
class DartBuybackSource(Source):
    name = "dart_buyback"
    max_delay = timedelta(hours=24)  # §4 — available_at 보수 추정 상한

    def fetch(self, since: datetime, until: datetime) -> Iterator[RawRecord]: ...
```

- 응답은 **pydantic 모델로 파싱**한 뒤 필요한 필드만 `RawRecord` 로. 원문 전체 JSON 을 DB 에 넣지 않는다(크기 · 약관).
  재현이 필요한 원문은 `payload_hash` + 최소 필드.
- 소스 하나 = 파일 하나 = 녹화 픽스처 테스트 하나(`tests/ingest/fixtures/<source>/*.json`). 테스트에서 실제 네트워크 호출 0.

## 3. 멱등 · 재시도 · 레이트 리밋

- upsert 키: `(source, external_id, version)`. 외부 id 가 없으면 `sha256(정규화 필드)`.
- 같은 구간을 두 번 수집해도 행 수가 같다 — 테스트로 강제.
- HTTP: `httpx` + 연결 5s · 읽기 20s 타임아웃. **타임아웃 없는 호출 금지.**
- 재시도: 429 · 5xx · 연결 오류만, 지수 백오프 + 지터, 최대 3회. 4xx 는 재시도하지 않는다.
- 소스별 요청 간격(pacer)을 둔다. 무료 API 한도를 `security-sources.md` 표에 적고 그 80% 로 설정.
- 부분 실패: 종목 하나 실패가 작업 전체를 죽이지 않는다. 실패 목록을 `job_run` 에 기록.

## 4. 신선도

| 소스 종류 | 수집 주기 | `max_delay`(available_at 추정) | 신선도 한계(넘으면 `stale_inputs`) |
|---|---|---|---|
| 시세 일봉 | 매일 장 마감 + 30분 | 봉 마감 | 2 영업일 |
| 공시(자사주 · 내부자) | 매시 | 24h | 3 일 |
| 온체인 · 고래 | 매시 | 1h | 12 시간 |
| 뉴스 · 외신 | 30분 | 게시 시각 | 24 시간 |

마지막 성공 시각은 `forecast.source_status` 에. 서버가 "마지막 수집 N시간 전"을 여기서 읽는다.

## 5. 텍스트 → 숫자 (감성)

- 뉴스 감성은 **금융 특화 분류 모델**(로컬 추론)로 점수화한다. 범용 LLM 으로 점수를 내지 않는다 — 재현 불가 · 비용 · 채점 불가.
- 점수 · 모델 버전 · 언어를 fact 에 저장. 모델을 바꾸면 과거 점수를 **재계산한 새 버전**으로 쌓는다(누수 방지 — 과거 시점에도 같은 모델로 점수를 매겨야 비교가 된다).
- 종목 연결(뉴스 ↔ 종목)은 온톨로지 별칭 표로(`ontology.md` §3). 제목 문자열 포함 검사만으로 잇지 않는다.

## 6. 백필

- 백필은 별도 작업(`jobs/backfill_<source>.py`), `--since` · `--until` 필수, 청크 단위 커밋.
- 백필 행도 `available_at` 규칙(§4, `time-and-leakage.md` §1)을 따른다. `ingested_at` 으로 대체 금지.

## 7. 로깅

- 구조화 로그(JSON): `job`, `source`, `symbol`, `rows`, `duration_ms`, `error_kind`.
- 원문 응답 · API 키 · 쿠키를 로그에 남기지 않는다. 오류는 상태 코드 + 요약.
