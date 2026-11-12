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

## F008 슬라이스 24 국내 증시 일정 (2026-11-02)

- 변경: `ops/daily.sh` 주석 — `events` 가 `kr_daily` 뒤에 도는 이유(국내 일봉을 읽는다, `FC-REQ-021` FR-10). 단계 목록 무변경
- 검증: 변경 없음 — 주석만
- 미검증 · 범위 밖: 없음(슬라이스 2단계는 `FC-REQ-021` · `FE-REQ-046` 표)

## 2026-11-09 — F016 단계 C

| 항목 | 결과 |
|---|---|
| `daily.sh` 단계에 `move_beta`(volatility 뒤) — 뉴스 단계 무변경(F016 단계 C) | 반영 · 영역 검증 전체 통과 |

루트 체크리스트 `requirements/reports/checklists/F016-C-move-split-facts.md`

## 2026-11-10 — F018 걸침

  - `salt-forecast/src/salt_forecast/jobs/news.py` — 뉴스 작업 20분 상한(`run_job(max_seconds)`) — 05:07 부터 외부 연결에 매달려 8시간

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 이 REQ 에 닿은 변경 | 충족 | `ops/daily.sh` 단계에 `base_rate` · `trade_check_score`(kr_volatility 뒤) · 주간 `trade_check_score --report`(`due --job trade_check_report --hours 156`). 뉴스 단계 무변경 · ruff · format · pyright 0 · lint-imports 3 kept · pytest 전체 · 누수 검사 |

## F017 v2 단계 4 등급 (2026-11-11, `feat/f017-s4-grade`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 이 REQ 에 걸린 몫 | 반영 | `salt-forecast/ops/daily.sh` — 매일 배치 순서에 `judgment_tier`(점검 채점 뒤 · 1초). 뉴스 매시 경로는 그대로. 주인 `FC-REQ-028` FR-6 |
| 영역 검증 | 통과 | 서버 build · lint · test 1219 · test:layer-check / BFF test 449 · build / FE check-types · lint · test · test:layer-check / 예측 ruff · pyright · lint-imports · pytest · leakage |
| 이 REQ 의 기존 계약 | 변화 없음 | 칸을 더하기만 했다 — 지우거나 바꾼 필드 0 |

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

| 항목 | 결과 | 근거 |
|---|---|---|
| 뉴스 매시 단계 영향 | 충족 | 별도 `due` 게이트 · 실패해도 다음 단계 진행(`|| echo`) |

## 2026-11-12 — F017 단계 6 덧붙임

- [x] `ops/daily.sh` 에 `news_reaction`(국내 일봉 옮긴 뒤 · 22초) — 뉴스 원장 · 감성(`news_item`)은 건드리지 않음
- [x] 회귀: 영역 테스트 전체 통과(서버 1236 · BFF 453 · FE check-types · lint) — 기존 동작 바뀐 것 없음(태그는 덧붙임)
- 주인 REQ 의 체크리스트 · 미검증 표는 `SRV-REQ-053` · `FE-REQ-064` · `BFF-REQ-052` · `FC-REQ-028` · `DB-REQ-043`

## F016 단계 D 짝(2026-11-12) — 이 REQ 가 머리 주인인 파일

루트 `requirements/specs/done/F016-D-move-summary-slice.md` · 체크리스트 `requirements/reports/checklists/F016-D-move-summary.md`

| 바뀐 것 | 확인 |
|---|---|
| `ops/daily.sh`(머리 주인)에 주간 단계 하나 — `move_explanation_report`(6.5일마다, `due`) | `bash -n` · `due` 판정(방금 성공 → 건너뜀) · 작업 실행 1회 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |
