# FC-REQ-016 체크리스트 — 뉴스 감성 원장 (2026-10-06)

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `preregistration/2026-10-06-news-sentiment.toml` | `79e937c`(채점 표본 10-07 전) 이후 무변경 |
| FR-2 | 마이그레이션 `20261006100000_forecast_news` · `store/tables.py` · `store/news.py` | 로컬 `migrate deploy` · 스키마 계약 테스트 통과. 같은 피드 재수집 365건 중 새 행 0(DO NOTHING, fetched_at 유지) |
| FR-3 | `ingest/rss.py` | 픽스처 테스트 4(두 시각 · 미래 pubDate 받은 시각 · HTML/깨진 XML 실패 · 피드 13개). 실수집 13/13 · 365건 |
| FR-4 | `domain/news_text.py` | 단위 10(긴 이름 우선 · 일상어 제외 · 티커 경계 · 가리기 · 사건/부정어 · 거래소 상장만 · 제목 키 · URL 추적 매개변수 · 언어 · 괄호 이름) |
| FR-5 | `models/news_sentiment.py` | 가짜 모델 테스트 3(가린 뒤 넣고 원문으로 연결 · 모델 없는 언어 건너뜀 · 리비전/해시 고정). 실모델 로드 시 sha256 대조 통과 |
| FR-6 | `jobs/news.py` · `ops/daily.sh` | `--dry-run` 365건 · 실실행 326 기사 + 326 점수 · 57~61초. daily.sh: 0.75시간 게이트로 연속 실행 건너뜀 확인 |

## 첫 수집 모양 (등록 전 점검 — 사전등록 표본 아님)

| 언어 | 기사 | 종목 연결 | 사건 태그 | 평균 score |
|---|---|---|---|---|
| ko | 261 | 92 | 40 | +0.14 |
| en | 65 | 26 | 15 | +0.03 |

- 모델 시험: "거래소 해킹으로 400억 탈취" → 중립 0.44 · "현물 ETF 승인 불발" → 중립 0.998 · "SEC rejects spot ETF" → 중립 0.90. 감성만으로는 악재를 못 잡는다 → 사건 태그 병행
- 연결 상위: BTC 82 · ETH 29 · XRP 8 · SOL 5 — 횡단면 IC 는 성립하지 않아 H1 을 시장 시계열로 등록했다

## validate (`python-style.md` §7)

- `ruff check` · `ruff format --check` · `pyright` 0 · `lint-imports` 3 kept
- `pytest` 전체 통과(스키마 계약 포함, `FORECAST_DATABASE_URL` 지정) · `tests/leakage` 22 passed

## 추가 확인 (2026-10-06, 사용자 "다 확인")

- launchd 와 같은 빈 환경(`env -i`, plist PATH)에서 `uv run --frozen --group nlp` 로 두 모델 로드 · sha256 대조 · 분류 통과(HF 캐시 `~/.cache/huggingface`). `kickstart` 는 0.75시간 게이트로 건너뜀 — 게이트 동작 확인
- 라이선스: ProsusAI/finBERT 저장소 Apache-2.0 · 미세조정 Financial PhraseBank 비상업 · snunlp KR-FinBert 표기 없음 → `security-sources.md` 갱신

## 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `news-sentiment@1` H1 · H2 | 표본 창(2026-10-07~) 전 — 엿보기 금지 | 2027-02-08 |
| Google 뉴스 RSS 약관 · 차단 | 서버와 같은 피드 · 매시 13요청. 막히면 피드 실패로 기록된다 | 첫 주 `source_status` 확인 |
| 감성 모델 상업 사용 | FinBERT 코드 Apache-2.0 · 미세조정 데이터 비상업, KR-FinBert-SC 라이선스 표기 없음(2026-10-06 확인) | 상업 전환 · 공개 전 저작자 허락 |
