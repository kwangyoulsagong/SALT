# 보안 · 소스 약관 · 소유자 전용

## 1. 소스 표 (새 소스는 여기 한 줄이 먼저다)

| 소스 | 용도 | 키 | 무료 한도 | 약관 메모 | 상태 |
|---|---|---|---|---|---|
| 업비트 공개 API | 코인 시세 · 체결 | 없음 | 초당 제한 | 공개 시세 | 서버에 이미 있음 |
| OpenDART DS005 · DS004 | 자사주 취득/처분 결정 · 임원 · 주요주주 소유 보고 | `FORECAST_DART_API_KEY` | 약 2만 건/일 | 공공 공시 | 예정(슬라이스 20) |
| SEC EDGAR `data.sec.gov` | Form 4 · 8-K · 10-Q 자사주 표 · 13F | 없음, **User-Agent(이름+이메일) 필수** | 초당 10 — 넘으면 IP 10분 차단 | 공공 | 예정(슬라이스 20) |
| Finnhub 회사 뉴스 | 외신 | `FORECAST_FINNHUB_API_KEY` | 분당 60 | 표시 조건 확인 전까지 **피처 전용** | 예정(슬라이스 21) |
| GDELT | 외신 대량 | 없음 | — | 공개 | 후보 |
| 온체인 거래소 입출금 | 고래 | — | Whale Alert 무료 API 없음. Arkham 무료 약관 미확인 → 공개 익스플로러 + 거래소 주소 라벨 직접 집계 | 후보 |
| Alpaca Market Data 무료 | 미국 일봉(SIP 15분 지연 · 2016~) · IEX 실시간 | `FORECAST_ALPACA_KEY_ID` · `_SECRET` | 분당 200 · 실시간 30종목 | **개인 사용 · 재배포 금지 → 소유자 전용**. 브로커라 데이터 클라이언트만 | **TBA** |
| Tiingo 무료 | 미국 일봉 2016 이전 1회 백필 | `FORECAST_TIINGO_API_KEY` | 월 500종목 | 개인 사용 | **TBA** |
| FINRA 공매도 잔고 | 공매도 | — | — | 공공 | **TBA** |
| FRED · ALFRED | 금리 · 환율 · 지수 · CPI · VIX | `FORECAST_FRED_API_KEY` | 분당 120 | 공공(일부 시리즈 저작권 표기 — 지수는 표시 전 확인) | 슬라이스 16b |
| FRED 발표 일정 `release/dates` | CPI(10) · 고용보고서(50) 발표일 — 미래 예정일 포함 | `FORECAST_FRED_API_KEY` | 위와 같음 | 공공 | 슬라이스 22 |
| 연준 FOMC 일정 페이지 `federalreserve.gov/monetarypolicy/fomccalendars.htm` | FOMC 결정일 | 없음. User-Agent 는 서비스 이름만(개인 정보 싣지 않음) | 하루 1회 | 공공(미 정부 저작물) · HTML 구조가 바뀌면 0건 → 실패로 기록 | 슬라이스 22 |
| 한국은행 ECOS | 원/달러 | `FORECAST_ECOS_API_KEY` | 일 한도 | 공공 | 슬라이스 16b |
| 바이낸스 선물 공개 API | 펀딩비 · 미결제약정 | 없음 | 가중치 한도 | 공개 시세. **미결제약정 이력 30일** | 슬라이스 16b |
| DefiLlama | 스테이블코인 발행량 | 없음 | — | 공개 | 슬라이스 16b |
| ECB 기준 환율(Frankfurter `api.frankfurter.dev`) | 원/달러 — 김치 프리미엄 분모 | 없음 | 명시 한도 없음 → 하루 1요청 · 초당 1 | 공공(ECB 기준 환율 재사용 허용) · 영업일 16:00 CET 공표 → available_at 다음 날 00:00 UTC | 슬라이스 23 |
| 공포탐욕 지수 `api.alternative.me/fng` | 크립토 공포탐욕 전체 이력(2018-02~) — 규칙 IC | 없음 | 명시 한도 없음 → 하루 1요청 | 공개 · 출처 표기 요청 — **피처 · 채점 전용**(화면 표시는 서버가 이미 같은 원천을 쓴다) | 슬라이스 F010-1 |
| 바이낸스 공개 덤프 `data.binance.vision` | 현물 aggTrades 일 파일 → 대형 체결 하루 합(원문 저장 안 함) | 없음 | 명시 한도 없음 → 동시 6 · 1년 1회 백필 | 공개 시장 데이터 · `.CHECKSUM` 대조 | 슬라이스 F010-1 |
| Deribit 공개 API `public/get_volatility_index_data` | DVOL(BTC · ETH 30일 내재 변동성) 1D 이력(2021-03-24~) — 사전등록 `dvol-sigma@1` | 없음 | 비인증 크레딧 한도 → 초당 2 · 하루 1회 증분 | 공개 시장 데이터 · **피처 · 채점 전용**(화면 표시 없음) | 슬라이스 F010-6 |
| 업비트 공개 API `/v1/market/all?is_details=true` | `market_event` 투자유의 · 주의 5종 — **지금 상태만**(이력 없음) → 매일 스냅샷 | 없음 | 업비트 한도 공유 · 하루 1요청 | 공식 공개 API(공지 JSON 과 다름) | 슬라이스 F010-6 |
| Coin Metrics Community `community-api.coinmetrics.io/v4/timeseries/asset-metrics` | BTC MVRV · 거래소 입출금 · 활성주소 · 해시레이트 일 이력(2010~) — 사전등록 `onchain-regime@1` | 없음 | 10요청/6초 → 초당 1 · 하루 1회 증분 | **CC BY-NC 4.0** — 출처 표기 · 비상업. **피처 · 채점 전용**(화면 표시 없음). 상업 전환 시 재검토. 입출금은 주소 라벨 소급 → 판정 금지 | 슬라이스 F010-6 2차 |
| CoinGecko 공개 API `/api/v3/global`(키 없음) | BTC · ETH 도미넌스 · 전체 시가총액 — **지금 값만**(이력은 유료) → 매일 스냅샷 · `dominance@1` 라이브 | 없음 | 무키 한도 미공개 → 하루 1요청 | 출처 표기 조건 — **피처 · 채점 전용**(표시하려면 표기부터) | 슬라이스 F010-6 2차 |
| 뉴스 RSS — Google 뉴스 한국어 검색 10 · coindesk · cointelegraph · cryptoslate | 뉴스 원장 · 감성 · 사건 태그 — `news-sentiment@1` 라이브 | 없음 | 명시 한도 없음 → 매시 13요청 · 초당 1 | 서버 크롤러와 같은 피드. 제목 · 요약 500자만(본문 미수집) — **피처 · 채점 전용**(화면 표시 없음) | 슬라이스 F010-6 3차 |
| 감성 모델 `snunlp/KR-FinBert-SC` · `ProsusAI/finbert`(Hugging Face) | 한국어 · 영어 금융 감성 3분류 | 없음 | 로컬 CPU | FinBERT: 코드 저장소 Apache-2.0, 미세조정 데이터 Financial PhraseBank 는 비상업(CC BY-NC-SA) · KR-FinBert-SC: 모델 카드 · 저장소 모두 라이선스 표기 없음(2026-10-06 확인 — 기본은 모든 권리 유보) → **비공개 · 소유자 전용 · 재배포 안 함**으로만 쓴다. 상업 전환 · 공개 전에 저작자 허락. safetensors 자동 변환 리비전 · sha256 고정 | 슬라이스 F010-6 3차 |
| 네이버 데이터랩 검색어트렌드 — NAVER API HUB `naverapihub.apigw.ntruss.com/search-trend/v1/search`(개발자센터는 2026-07-31 신규 키 중단) | 종목 한글명 검색 관심(상대 지수, 2016~) — `search-interest@1` | `FORECAST_NAVER_CLIENT_ID` · `_SECRET`(HUB 앱 Client ID/Secret) | 월 5만 회 · 50 RPS → 한 번에 400 · 초당 1 | 공식 · 이관기 무료(유료 전환 시 사전 공지). **피처 · 채점 전용**(표시하려면 출처 표기부터) | 슬라이스 F010-6 3차 — 키 대기 |
| 업비트 공지 JSON | 상장 · 유의 · 유통량 공지 | 없음 | — | 비공식 · 약관 제10조 | **사용 안 함 (사용자 결정 2026-09-23)** — 호출 코드 0건 |
| 국내 주식 일봉 — 서버가 KIS 에서 받은 `public.price_history(kr_stock, 1d)` · `public.market_holidays` **읽기** | 국내 주식 변동 범위 · 채점(FC-REQ-009) | **없음 — KIS 키는 서버에만**(키 보유처 한 곳, FEATURE-011 FR-80) | 외부 호출 0 | KIS 시세 — 재배포 해석 미확정 → **소유자 전용**(FEATURE-011 OQ) | F011 슬라이스 5 |
| 투자자별 수급(KRX) | 국내 수급 | — | 공식 API 미제공 · 증권사 API 는 계좌 필요 → **§1-2 충돌로 보류** | — | 보류 |

- 한도는 문서 값의 **80%** 로 pacer 설정.
- 약관이 재배포 · 표시를 금지하는 소스는 **피처로만** 쓰고 원문 · 요약을 화면 경로(`v_symbol_facts`)에 싣지 않는다 — 표에 표시.

## 2. 키

- 키는 `salt-forecast` env 에만. 서버 · BFF · 프론트로 가지 않는다.
- `.env` 는 gitignore, `.env.example` 에 이름만.
- **거래소 · 증권사 계좌 키를 받지 않는다**(글로벌 플랜 §1-2 영구 Non-Goal). 공개 · 조회 전용 키만.

## 3. 개인 데이터

- `public` 에서 읽는 것은 보유 수량 · 평단 · 관심 목록의 `user_id` 와 `symbol` 뿐. 이메일 · 비밀번호 해시 컬럼에 SELECT 권한을 주지 않는다.
- 예측은 **종목 단위**다. 사용자별 예측 행을 만들지 않는다(도달 확률도 규칙 가격 × 종목 분포로 서버가 조합 가능하게 설계 — 불가하면 `user_id` 없는 가격 격자로 저장).

## 4. 소유자 전용 (ADR-003)

- 전망을 누구에게 보일지는 **서버**가 정한다(`FORECAST_OWNER_EMAILS`). 이 서비스는 모른다 — 모든 종목 결과를 만들 뿐.
- 그래서 `forecast.*` 는 사용자에게 직접 노출되는 경로가 없어야 한다. BFF · 프론트가 이 스키마를 부르는 코드 0건.

## 5. 공급망

- 새 패키지는 PyPI 다운로드 · 유지 상태 · 라이선스 확인 후 추가, PR 본문에 한 줄.
- 모델 가중치 다운로드는 해시 고정. `trust_remote_code=True` 금지.
- `pickle` 로 외부에서 받은 파일을 열지 않는다. 우리 아티팩트는 해시 확인 후만.
