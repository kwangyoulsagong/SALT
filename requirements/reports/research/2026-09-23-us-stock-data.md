# 미국 주식 데이터 소스와 분석 딥리서치 보고서

- 작성일: 2026-09-23
- 대상: 개인용 투자 코치 앱. 본인 1인 사용, 무료 운영이 목표다. 국내 주식은 보류(TBA)하고 미국 주식부터 지원한다.
- 스택: Python 배치 워커(수집 → Postgres → LightGBM 분위수 예측 1~4주 + 워크포워드 채점, 시점 고정 `available_at` 필수) + Node 서버/BFF(SSE).
- 범위: 데이터 소스와 그 데이터로 만들 분석. 호재(카탈리스트) 분류는 별도 조사가 맡는다.
- 표기: **[확인]** = 공식 문서·원문에서 직접 확인. **[2차]** = 검색 요약·블로그·제3자 정리(수치가 바뀌었을 수 있다). **[추정]** = 조사 결과를 바탕으로 한 필자의 판단.
- 이미 확인된 전제: SEC EDGAR(Form 4 · 8-K · 10-Q · 13F)는 무료이고 User-Agent가 필수이며 초당 10회까지다. Finnhub 무료 요금제는 분당 60회이고 뉴스를 준다.

---

## 0. 한 페이지 요약

1. **일봉 주 소스는 Alpaca 무료(Basic)가 가장 낫다.** 15분 이상 지난 과거 봉은 **SIP(전체 시장) 데이터도 무료**로 조회된다. 2016년부터 있고, `adjustment=all`로 분할과 배당을 반영하며, 분당 200회다. 2016년 이전 이력은 Tiingo 무료(30년 이상, 월 500종목)로 한 번 채운다. [확인/2차] §1
2. **yfinance는 피처 파이프라인의 주 소스로 쓰지 않는다.** 비공식 스크래핑이고, 2024~2025년에 차단(429)이 잦아졌다. Yahoo 데이터는 개인 용도로만 쓸 수 있다. [2차] §1
3. **생존편향 없는 무료 소스는 부분적으로만 있다.** 상장폐지 종목 목록은 Alpha Vantage `LISTING_STATUS&state=delisted`(무료), S&P 500 구성 이력은 GitHub `fja05680/sp500`(1996~, MIT)에서 가져온다. 다만 **상장폐지 종목의 수정주가 이력을 무료로 완전하게 주는 공식 소스는 확인하지 못했다.** [확인/2차/추정] §1.3
4. **실적:** 발표일은 Finnhub 캘린더(무료), EPS 서프라이즈는 Alpha Vantage `EARNINGS`(무료, 하루 25회라 백필에 시간이 걸린다), 재무는 SEC `companyfacts.zip`(매일 밤 갱신)에서 가져온다. [확인/2차] §2
5. **실증상 1~4주 horizon에서 쓸 만한 신호**는 이렇다. **기회적 내부자 매수**(Cohen-Malloy-Pomorski, 월 82bp), **days-to-cover 공매도**(Hong 외), **중기 모멘텀**. 반면 **PEAD는 대형주에서 2006년 이후 사라졌다**(Martineau 2022). 그래서 실적일은 방향 피처보다 **분위수 구간 폭(변동성)** 피처로 쓰는 게 맞다. **의원 거래는 평균적으로 시장을 못 이겼다.** [확인/2차] §7
6. **실시간(업비트 같은 경험):** **Alpaca IEX 웹소켓(체결·호가 30종목, 분봉 채널은 무제한) + Finnhub 웹소켓(50종목)** 을 Node 서버에서 한 번만 연결해 본인 앱으로 SSE 중계한다. 무료로 가능한 최선이 이 조합이다. 다만 **IEX는 전체 거래량의 약 2.5~3%** 여서 체결가가 드물고 NBBO·통합 최종가와 어긋날 수 있다. 장전 4:00~8:00와 장후 17:00~20:00(ET)도 없다. **"업비트급"은 대형주에서만 근접하고, 거래량 표시는 불가능하다.** [확인/2차/추정] §9
7. **약관:** 무료 요금제는 전부 **개인·비상업·재배포 금지**다(Finnhub, Tiingo, Massive, Alpaca). 본인 1인이 자기 서버를 거쳐 자기 화면에서 보는 것은 개인 사용 범위로 해석된다. 하지만 **초대 사용자가 생기는 순간 제3자 표시(재배포) 위반**이 된다. 공공 데이터(SEC · FINRA · FRED · CBOE 공개 통계)는 표시에 제약이 거의 없다. [확인/추정] §8.3

---

## 1. 일봉 시세 (수정주가)

### 1.1 소스 비교표

| 소스 | 무료 한도 | 과거 이력 | 수정주가 | 약관(개인·표시·재배포) | Python | 판정 |
|---|---|---|---|---|---|---|
| **Alpaca Basic** | REST 200회/분, 웹소켓 1연결 [확인] https://docs.alpaca.markets/us/docs/about-market-data-api | **2016년~** [확인] 같은 문서 | `adjustment=raw/split/dividend/all` [2차] https://alpaca.markets/learn/fetch-historical-data | 개인·비상업 전용, 공개 게시·재배포 금지 [2차] https://alpaca.markets/support/redistribute-alpaca-api | `alpaca-py` | **주 소스.** 15분 이상 지난 과거 데이터는 SIP 피드도 무료 [2차] https://docs.alpaca.markets/us/docs/market-data-faq , https://forum.alpaca.markets/t/subscription-does-not-permit-querying-recent-sip-data/14751 |
| **Tiingo 무료(Starter)** | 50회/시간, 1,000회/일, **월 500개 고유 종목**, 월 1GB [확인] https://www.tiingo.com/about/pricing | 30년 이상 [확인] 같은 곳 | adjClose/adjOpen 등 제공 [2차] | "Internal Use Only". 본인 개인 사용만 가능하고, 다른 사람에게 표시·공유 금지 [확인] 같은 곳 | `tiingo`, `pandas-datareader` | **2016년 이전 백필용.** 월 500종목 제한 때문에 S&P 500 전체를 매달 갱신하기엔 빠듯하다 |
| **Stooq** | 2026년 초부터 **API 키 필수**(CAPTCHA 또는 이메일 신청), 일일 조회 한도 있음 [2차] https://github.com/pydata/pandas-datareader/issues/1012 , https://apis.io/providers/stooq/ | 수십 년(종목별 상이) [2차] https://www.quantstart.com/articles/an-introduction-to-stooq-pricing-data/ | 분할·배당 조정된 종가 [2차] | 명시적 API 약관을 찾지 못함 [추정: 개인 비상업 범위에서 사용] | `pandas-datareader`(키 파라미터 반영 여부 확인 필요) | 예비 소스. 키 발급 방식이 불안정하다 |
| **Alpha Vantage 무료** | **25회/일**, 5회/분 [2차] https://www.macroption.com/alpha-vantage-api-limits/ | 무료는 `outputsize=compact`(최근 100개)만 가능. `full`(25년 이상)은 유료 [확인] https://www.alphavantage.co/documentation/ | **`TIME_SERIES_DAILY_ADJUSTED`는 프리미엄** [확인] 같은 문서 | 개인 사용 | `alpha_vantage` | 시세 용도로는 부적합. **`LISTING_STATUS`와 `EARNINGS` 용도로만** 쓴다(§1.3, §2) |
| **Massive(구 Polygon.io) Basic** | 5회/분, **2년 이력, EOD만, 웹소켓 없음** [확인] https://massive.com/pricing | 2년 | 분할 조정 집계 제공 [2차] | 개인(Individuals) 약관. 제3자 표시·재배포 금지, 비표시(non-display) 사용도 라이선스 필요 [2차] https://massive.com/legal/individuals-terms-of-service | `massive`/`polygon-api-client` | 기업행위(분할·배당) 참조용 정도. 이력이 짧다. 2026년에 Polygon이 Massive로 이름을 바꿨고 `api.polygon.io`도 계속 동작한다 [2차] https://apicostcalc.com/polygon.html |
| **Financial Modeling Prep 무료** | 250회/일, 30일 누적 500MB [2차] https://www.findmymoat.com/tools/financial-modeling-prep-fmp | 약 5년 [2차] 같은 곳 | 수정주가 엔드포인트 있음 [2차] | 개인 | 비공식 래퍼 다수 | 보조. 의원 거래 엔드포인트가 있다(§3.5) |
| **yfinance** | 공식 한도 없음. 2024년 이후 IP 단위 429 차단 빈발, 하루 몇 건만 호출해도 막혔다는 보고가 있다 [2차] https://github.com/ranaroussi/yfinance/issues/2422 , https://github.com/ranaroussi/yfinance/discussions/2431 | 수십 년 | `auto_adjust` | 비공식 스크래핑. Yahoo 데이터는 개인 용도 전용 [2차] 같은 곳 | `yfinance` | **배치 파이프라인 주 소스 금지.** 수동 대조용으로만 쓴다 |
| **Nasdaq Data Link** | 무료 WIKI Prices는 **2018년 3월 중단** [확인] https://help.data.nasdaq.com/article/506-why-does-wiki-prices-only-go-up-to-march-2018 | — | — | — | `nasdaqdatalink` | 대체재(Sharadar SEP, QuoteMedia EOD)는 유료다 [2차] https://data.nasdaq.com/databases/SEP |

### 1.2 Alpaca를 주 소스로 삼는 이유와 주의점 [추정]
- 멀티 심볼 bars 요청 한 번에 여러 종목을 받는다. 분당 200회면 S&P 500 + 관심 종목 약 520개의 전일 봉을 1분 안에 받을 수 있다.
- **원본(raw)과 조정본(all)을 둘 다 저장한다.** 조정 계수는 새로운 분할·배당이 생길 때마다 과거 전체를 다시 쓴다. 그래서 `available_at` 원칙상 **원본 가격 + 기업행위 이벤트(분할·배당, 공시 시점 포함)** 를 저장하고, 학습 시점에 조정을 다시 계산하는 편이 룩어헤드를 막는다. "오늘 기준 조정 주가"를 그대로 과거 피처로 쓰면 미래 분할 정보가 섞이지는 않는다. 다만 배당 조정은 **미래 배당을 과거 가격에 반영**하므로 수익률 계산에는 무해하지만 가격 수준 피처(예: 52주 고가 대비)에는 미세한 누수가 생긴다.
- Alpaca는 브로커다. 레포 공통 수용 기준 "**주문을 실행하는 코드 경로가 없다**"를 지키려면 `alpaca-py`에서 **`StockHistoricalDataClient`/`StockDataStream`만 import하고 `TradingClient`는 쓰지 않는다.** 가능하면 lint나 grep 검사로 막는다.
- 한국 거주자가 데이터 API 키(페이퍼 계정)를 받을 수 있는지는 **가입해서 확인해야 한다** [추정].

### 1.3 생존편향 없는 유니버스
| 필요 | 무료 소스 | 비고 |
|---|---|---|
| 상장폐지 종목 목록 + 폐지일 | Alpha Vantage `LISTING_STATUS&state=delisted&date=YYYY-MM-DD` (CSV, 무료) [2차] https://www.macroption.com/alpha-vantage-delisted-stocks/ | 호출 1회로 전체 목록. 25회/일 한도에 부담이 없다 |
| S&P 500 시점별 구성 | `fja05680/sp500` — 1996년~ 편입·편출 CSV [2차] https://github.com/fja05680/sp500 . 파생: `OjasPhadake/snp500`(특정일 구성 조회) https://github.com/OjasPhadake/snp500 | Wikipedia 변경 표를 기반으로 한다. **발표일이 아니라 효력일** 기준이라 `available_at`은 효력일로 보수적으로 잡는다 [추정] |
| 폐지 종목 가격 | Tiingo는 비활성 티커도 제공한다고 알려짐 [2차]. `Johnbrick123/sp500-data`는 "생존편향 없는 1995~ 가격"을 표방하지만 원천 라이선스가 불명확하다 [2차] https://github.com/Johnbrick123/sp500-data | **완전한 무료 공식 소스는 없음**으로 결론 [추정]. 1인 앱의 1~4주 예측에서는 "시점별 S&P 500 구성 + 확보 가능한 폐지 가격"으로 편향을 줄이고, 누락 비율을 채점 리포트에 기록한다 |

---

## 2. 실적

| 데이터 | 무료 소스 | 한도·이력 | available_at 규칙 [추정] |
|---|---|---|---|
| 발표일 캘린더(예정) | Finnhub `/calendar/earnings` — 기간 지정, EPS·매출 추정치 포함 [2차] https://finnhub.io/docs/api/earnings-calendar | 분당 60회. 무료로 조회 가능한 과거 범위는 짧다고 알려짐 [2차] | 예정일은 **수집 시각**이 available_at이다. 일정 변경 이력을 보존하려면 매일 스냅샷을 쌓는다 |
| EPS 실제 vs 예상 | Alpha Vantage `EARNINGS` — `reportedDate`, `reportedEPS`, `estimatedEPS`, `surprise`, `surprisePercentage` [2차] https://mbosse.medium.com/alphavantage-api-for-earnings-data-1b7f59a2ae1 . Finnhub `/stock/earnings`(최근 분기 서프라이즈) [2차] https://finnhub.io/docs/api/company-earnings | AV는 25회/일이라 **520종목 초기 백필에 약 3주**, 이후에는 그날 발표 종목만 갱신 | `reportedDate` + 발표 시각(BMO/AMC). 시각을 모르면 **다음 거래일 장 마감**으로 둔다. 컨센서스는 "최종" 값이라 추정치 수정 이력은 없다 |
| 발표 사실(정확한 시각) | SEC 8-K **Item 2.02**의 `acceptanceDateTime` | EDGAR 초당 10회 | 접수 시각이 곧 available_at. 가장 신뢰할 만한 기준이다 |
| 재무제표 | SEC XBRL `companyfacts`/`companyconcept`/`frames` API, 일괄 파일 `companyfacts.zip`(매일 밤 약 03:00 ET 갱신) [확인] https://www.sec.gov/search-filings/edgar-application-programming-interfaces [2차] https://gist.github.com/andrewmcwatters/0aa39812f53206fa67f8bb07672adc2b | 무료·무제한(초당 10회 준수) | 각 fact에 `filed`(날짜)와 `accn`이 있다. **`accn`으로 제출물 `acceptanceDateTime`을 조인**해 available_at을 정한다. 정정 공시(10-K/A)는 새 fact로 쌓이므로 **최초 공시 값만** 과거 피처로 쓴다 |

라이브러리: `edgartools`, `sec-edgar-api`(companyfacts 래퍼) [2차] https://sec-edgar-api.readthedocs.io/

---

## 3. 기관 · 스마트머니

### 3.1 13F (분기 보유)
- 분기 말 후 **45일 안에** 제출한다(휴일이면 다음 영업일) [2차] https://en.wikipedia.org/wiki/Form_13F
- **available_at = 제출물 acceptanceDateTime**이다. `periodOfReport`(분기 말)를 기준으로 조인하면 45일 룩어헤드가 생기는 대표적 실수가 된다.
- 기관은 보고를 늦추거나 정정(13F-HR/A)으로 나중에 드러내기도 한다. 정정 보고분에 초과수익이 붙는다는 연구가 있다 [2차] https://pubsonline.informs.org/doi/10.1287/mnsc.2024.08833 . 정정분은 **정정 접수 시각**으로 따로 넣는다.
- 소스: EDGAR 전문 + SEC "Form 13F Data Sets"(분기 일괄) [추정: 공식 데이터셋 존재. URL은 SEC 구조화 데이터 페이지에서 확인 필요].

### 3.2 Form 4 내부자 거래
- 거래 후 **2영업일 안에** 제출한다. Section 16 서류는 22:00 ET 전에 제출하면 **당일 제출일**로 처리된다 [2차] https://edgarscout.com/guides/sec-filing-deadlines/ . 그래서 **장 마감 후 접수분이 많다.** 접수 시각이 16:00 ET 이후면 다음 거래일부터 반영한다.
- **기회적 매수 판별(Cohen-Malloy-Pomorski 2012)** [확인] https://www.nber.org/papers/w16454 , https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1692517
  - **routine 트레이더:** 과거 연속 3년 이상 **같은 달**에 거래한 내부자다(논문 정의). 이 사람의 거래는 정보가 없다(초과수익 약 0).
  - **opportunistic 트레이더:** 과거 3년 이력이 있는데 routine이 아닌 내부자다. 이들의 거래만으로 만든 포트폴리오는 **가치가중 월 82bp** 초과수익을 냈다.
  - 가장 정보가 많은 쪽은 **지역 · 비고위 · 지배구조가 약한 기업**의 내부자다.
  - 구현 [추정]: 내부자(reportingOwner CIK)별로 과거 거래 월 이력을 만든다 → 3년 이력이 없으면 "미분류" → 거래 코드 **P(장내 매수)만** 신호로 쓴다(S는 세금·유동성 매도가 많아 약하다). **10b5-1 계획 거래 표시**(2023년 이후 Form 4 체크박스)는 제외한다.

### 3.3 공매도 잔고 (FINRA Short Interest)
- **월 2회**(15일 또는 직전 영업일, 월말 영업일) 결제일 기준으로 보고한다. 공표까지 **약 8영업일**(달력일 10~26일, 중앙값 14일) [2차] https://www.strasmore.com/blog/finra-short-interest-data , https://www.finra.org/finra-data/browse-catalog/equity-short-interest
- 무료 다운로드와 FINRA Query API가 있다 [확인] https://www.finra.org/finra-data/browse-catalog/equity-short-interest/data , https://developer.finra.org/
- **available_at = FINRA 공표일 18:00 ET**(FINRA 공표 일정표 기준)다. 결제일로 조인하면 약 2주 룩어헤드가 생긴다.
- 피처: SI/유통주식, **days-to-cover = SI / 평균 일거래량**, SI 변화율.

### 3.4 일별 공매도 거래량 (FINRA Reg SHO)
- CNMS 통합 파일이 `https://cdn.finra.org/equity/regsho/daily/CNMSshvol{YYYYMMDD}.txt` 에 **거래일 당일 18:00 ET 무렵** 올라온다 [2차] http://regsho.finra.org/regsho-Index.html , https://www.finra.org/finra-data/browse-catalog/short-sale-volume-data/daily-short-sale-volume-files
- **주의:** 이것은 공매도 *잔고*가 아니라 장외(TRF/ADF/ORF) 보고분 중 공매도로 표시된 *거래량*이다. 마켓메이커의 헤지 공매도가 섞여 평소에도 40~50%대로 나온다. "공매도 비율 50% = 악재"로 해석하면 틀린다 [2차] https://keubiko.substack.com/p/misunderstood-and-misused-daily-short . 쓰려면 종목별 **자기 평소 대비 z-score**로만 쓴다 [추정].

### 3.5 의회 의원 거래 (STOCK Act)
- 원천: 하원 Clerk 공시, 상원 eFD(efdsearch.senate.gov). 무료지만 PDF·스캔본이 섞여 있다.
- 무료로 가공된 소스였던 House Stock Watcher는 **2026년 초 S3가 403을 반환하며 사실상 중단**됐다 [2차] https://www.lambdafin.com/articles/capitol-trades-api . Senate Stock Watcher 데이터 저장소 https://github.com/timothycarambat/senate-stock-watcher-data 도 갱신 여부를 확인해야 한다 [2차].
- 대안: FMP `senate-trading`/`house-trading`(무료 250회/일 범위) [2차] https://site.financialmodelingprep.com/developer/docs/stable/senate-trading . Finnhub congressional-trading은 유료 여부를 확인해야 한다 [2차] https://finnhub.io/docs/api/congressional-trading
- **예측력은 약하다:** 2004~2008년 의원 포트폴리오는 시장보다 연 2~3% 못했다(Eggers-Hainmueller) [확인] https://www.journals.uchicago.edu/doi/abs/10.1017/s0022381613000194 . STOCK Act 이후(2012~2020)도 초과성과가 없었다 [2차] https://www.sciencedirect.com/science/article/abs/pii/S0047272722000044 . 거래 후 최대 45일 지연 공시라 1~4주 horizon에는 더 불리하다. **→ 피처 우선순위 최하. 화면의 "참고 정보" 정도로만 쓴다** [추정].

### 3.6 옵션 흐름 · 풋콜비율
- **옵션 흐름(스윕·대량 체결) API는 사실상 전부 유료**다. 무료는 웹 화면의 지연 표시(Unusual Whales 무료, Barchart, MarketChameleon)뿐이고 API가 아니다 [2차] https://www.findmymoat.com/free/alternatives/unusual-whales . Alpaca Basic에 **옵션 "Indicative" 피드(웹소켓 200 호가)** 가 있지만 체결 흐름이 아니라 참고 호가다 [확인] https://docs.alpaca.markets/us/docs/about-market-data-api
- **CBOE 풋콜비율:** 과거 CSV 아카이브는 **2019-10에서 끊겼다**(Equity P/C 2006-11~2019-10) [2차] https://www.cboe.com/data/putcallratio.aspx , https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/indexpcarchive.csv . 그 이후는 CBOE Daily Market Statistics 페이지를 **매일 수집해 직접 쌓아야** 한다 [추정]. 시장 전체 심리 피처(종목 공통)로 쓴다.

---

## 4. ETF 자금 흐름 · 섹터 로테이션 · 지수 구성

- **ETF 자금 흐름 무료 API는 없다.** etf.com이 일간 흐름을 웹으로 보여 주고 [2차] https://www.etf.com/sections/daily-etf-flows , API는 유료다(Massive 파트너 ETF Global, Nasdaq ETFF) [2차] https://massive.com/docs/rest/partners/etf-global/fundflows
- 직접 계산 방법: **흐름 = Δ상장주식수 × NAV**다 [2차] https://meridianfin.io/knowledge/etf-flow-data-guide . 상장주식수는 운용사(SPDR · iShares 등) 홈페이지가 매일 공개하지만 형식이 제각각이다 [추정]. 1인 앱에서는 **11개 섹터 SPDR(XLK · XLF · ...)만** 수집하는 것이 현실적이다 [추정].
- **섹터 로테이션은 가격만으로 충분하다** [추정]. 11개 섹터 ETF의 SPY 대비 상대강도(1 · 4 · 12주)를 종목 피처로 붙인다(자기 섹터의 상대강도). 섹터 분류는 SEC SIC 코드(companyfacts/submissions에 있음)를 GICS 비슷하게 매핑한다.
- 지수 구성: §1.3 참고.

---

## 5. 거시 (FRED)

- **FRED API:** 무료 키, **분당 120회** [2차] https://freeapihub.com/apis/fred-api . Python `fredapi`, `fedfred`.
- 시리즈 예시: `DGS10`, `DGS2`(금리), `T10Y2Y`(장단기차), `CPIAUCSL`, `UNRATE`, `VIXCLS`(VIX), `BAMLH0A0HYM2`(하이일드 스프레드), `DTWEXBGS`(달러).
- **ALFRED 빈티지:** `realtime_start`/`realtime_end`/`vintage_dates`로 "그 시점에 알려진 값"을 받는다 [확인] https://fred.stlouisfed.org/docs/api/fred/realtime_period.html . CPI · 고용처럼 수정되는 지표는 **반드시 빈티지로** 학습한다. 최신 값으로 학습하면 룩어헤드가 생긴다.
- **발표 일정:** `fred/releases/dates`(+`include_release_dates_with_no_data=true`)로 예정 발표일을 받는다. 다만 "원 발표 기관 일정이고 FRED 반영 시각과는 다르다" [확인] https://fred.stlouisfed.org/docs/api/fred/releases_dates.html . FOMC · CPI · 고용 발표 주간 더미는 **분위수 구간 폭 피처**로 쓴다 [추정].
- 약관: FRED는 출처 표기 조건으로 표시할 수 있다. 단 일부 시리즈(예: ICE BofA 스프레드)는 원 저작권자 제한이 있다 [추정: 시리즈별 notes 확인 필요].

---

## 6. 자사주

- **일별 자사주 매입 표 공시 규칙(2023-05 채택)은 2023-12-19에 제5순회항소법원이 무효화**했다. 현재는 기존 **Item 703에 따른 월별 집계 표**(10-Q Part II Item 2, 10-K Item 5)만 공시된다 [확인] https://www.sec.gov/newsroom/whats-new/further-announcement-regarding-share-repurchase-disclosure-modernization-rule , https://www.debevoise.com/insights/publications/2023/12/fifth-circuit-vacates-sec-share-repurchase-rules
- **XBRL 태그:** 무효화된 규칙에 딸린 새 태그 체계는 의무가 아니다. 재무제표 쪽 us-gaap 태그인 `PaymentsForRepurchaseOfCommonStock`(현금흐름표 매입 금액), `StockRepurchasedDuringPeriodShares`/`TreasuryStockSharesAcquired`(주식 수), `StockRepurchaseProgramAuthorizedAmount1`/`StockRepurchaseProgramRemainingAuthorizedRepurchaseAmount1`(승인·잔여 한도)은 companyfacts에서 많이 보인다 [추정: 태그 이름은 us-gaap 택소노미 기준. 기업별 사용 여부는 companyconcept로 확인 필요 — https://www.sec.gov/search-filings/edgar-application-programming-interfaces ]. **Item 703 월별 표 자체는 태그가 일관되지 않아 HTML 파싱이 필요하다** [추정].
- 권장 [추정]: (1) 분기 **`PaymentsForRepurchaseOfCommonStock` / 시가총액** = 순매입 수익률 피처, (2) 희석 조정 **주식 수 감소율**(`dei:EntityCommonStockSharesOutstanding` 변화), (3) **8-K 신규 프로그램 발표**는 8-K 본문·보도자료(Ex-99.1)에서 "repurchase program" + 금액을 추출한다. 8-K에는 자사주 전용 Item 번호가 없어 **Item 7.01/8.01에 섞여 나온다**. 추출은 카탈리스트 조사 쪽 파이프라인과 공유한다.

---

## 7. 예측력 실증 요약 (주간~월간 horizon)

| 신호 | 대표 근거 | 1~4주에서의 판단 [추정] |
|---|---|---|
| **기회적 내부자 매수** | 가치가중 월 82bp, routine은 0 [확인] https://www.nber.org/papers/w16454 | **유효. 우선순위 상.** 소형주 쪽에 쏠려 있어 S&P 500에서는 약해질 수 있다. 공시 시점 반영이 필수다 |
| **공매도 잔고 / days-to-cover** | DTC 롱숏 월 1.19%(동일가중, 1988~2012) vs SI 비율 0.71% [2차] https://www.nber.org/system/files/working_papers/w21166/w21166.pdf , https://www.cxoadvisory.com/short-selling/days-to-cover-short-interest-as-a-stock-return-predictor/ . 공매도 흐름이 정보를 가진다(Boehmer-Jones-Zhang 2008) [2차] https://doi.org/10.1111/j.1540-6261.2008.01324.x | **유효. 우선순위 상.** 음(-)의 신호이고 격주 갱신이다. 대형주는 효과가 작다 |
| **13F 변화** | 복제 전략 초과성과를 보고한 연구가 있다. 한편 "best ideas"가 전체 보유와 차이가 없다는 결과도 있다 [2차] https://quantpedia.com/strategies/alpha-cloning-following-13f-fillings , https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID3506598_code894408.pdf?abstractid=3459526&mirid=1 | **약함.** 45일 지연과 분기 주기라 1~4주 신호로는 느리다. "기관 보유 비율 · 보유 기관 수 변화"를 느린 상태 피처로만 쓴다 |
| **PEAD(실적 서프라이즈 드리프트)** | 대형주는 **2006년 이후 사라졌고**, 마이크로캡도 최근 사라졌다 [확인] https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3111607 | **방향 신호로는 기대하지 않는다.** 대신 실적 발표가 horizon 안에 있으면 **분위수 구간을 넓히는 변동성 피처**로 쓴다(효과가 가장 확실한 용도) |
| **중기 모멘텀(12-1개월)** | Jegadeesh-Titman(1993) 3~12개월 보유 시 월 약 1% [2차] https://doi.org/10.1111/j.1540-6261.1993.tb04702.x . 급반등장에서 크래시가 난다(Daniel-Moskowitz) [2차] | **유효하지만 약하고 레짐 의존적이다.** VIX · 시장 하락 레짐 피처와 상호작용시킨다 |
| **단기 반전(1주~1개월)** | 월간 반전은 대형주 월 0.84%, 소형주 1.41%. 회전율 상위 종목에서는 반전이 사라진다 [2차] https://www.sciencedirect.com/science/article/abs/pii/S0378426621000261 . 유동성 대형 40종목 주간 반전은 표본외에서 유의하지 않았다 [2차] https://github.com/nalimmm/short-term-reversal | **S&P 500에서는 약하다.** 뉴스 없는 급변에만 반전이 남는다는 연구가 있어 카탈리스트 유무와 교차시킨다 |
| **의원 거래** | 평균적으로 시장 미달 [확인] https://www.journals.uchicago.edu/doi/abs/10.1017/s0022381613000194 | **무시해도 된다.** |
| **일별 공매도 거래량(Reg SHO)** | 잔고가 아니라 오해가 많다 [2차] https://keubiko.substack.com/p/misunderstood-and-misused-daily-short | 자기 평소 대비 z-score로만. 우선순위 하 |

공통 주의 [추정]: 위 수치는 전부 **횡단면 롱숏 포트폴리오** 기준이다. 개별 종목 1~4주 **분위수** 예측에서는 기여가 훨씬 작게 나온다. 워크포워드 채점에서 **피처군별 제거 실험(ablation)** 으로 기여를 측정하고 화면의 "과거 적중률"에 반영한다.

---

## 8. 결론 — 무료 "미국 주식 데이터 스택" 권장안

### 8.1 시작 유니버스 [추정]
- **S&P 500 현재 구성 + 보유/관심 종목 + 11개 섹터 SPDR + SPY/QQQ/IWM** 으로 약 530개다.
- 학습용 과거 유니버스는 **시점별 S&P 500 구성**(fja05680)을 쓴다. 폐지 종목 가격 누락률은 채점 리포트에 적는다.
- 소형주는 PEAD · 내부자 신호가 강하지만 데이터 품질과 IEX 실시간 품질이 모두 나빠 **보류**한다.

### 8.2 수집 작업 · 주기 · available_at

| 작업 | 소스 | 주기(ET) | available_at 규칙 | 화면 표시 |
|---|---|---|---|---|
| `us_bars_daily` | Alpaca SIP 과거 봉(raw + 기업행위) | 매 거래일 20:00 | 거래일 16:00 + 수집 지연 → **max(거래일 16:00, 수집 시각)** | 본인 화면만(개인 약관) |
| `us_bars_backfill` | Alpaca(2016~) + Tiingo(~2015) | 1회 | 과거 봉은 해당 거래일 16:00 | 피처 전용 |
| `us_corp_actions` | Alpaca/Massive 분할·배당 | 매일 | 공시일(선언일) 기준. 없으면 ex-date 전일 | 표시 가능(사실 정보) |
| `sec_form4` | EDGAR | 15분마다(장중·장후) | `acceptanceDateTime`. 16:00 이후면 다음 거래일 | **표시 가능(공공 데이터)** |
| `sec_8k` | EDGAR | 15분마다 | `acceptanceDateTime` | 표시 가능 |
| `sec_companyfacts` | `companyfacts.zip` | 매일 04:00 | `accn` → 제출 `acceptanceDateTime`. 최초 공시 값만 | 표시 가능 |
| `sec_13f` | EDGAR 13F-HR(/A) | 매일(마감 시즌 집중) | `acceptanceDateTime`(분기 말 아님) | 표시 가능 |
| `finra_short_interest` | FINRA | 공표일 저녁 | FINRA 공표일 18:00 | 표시 가능 [추정: FINRA 데이터 이용 약관 확인 권장] |
| `finra_regsho_daily` | CNMS 파일 | 매 거래일 19:00 | 거래일 18:00 | 피처 전용(오해 소지) |
| `earnings_calendar` | Finnhub | 매일 | 수집 시각(스냅샷 누적) | 본인 화면만 |
| `earnings_surprise` | Alpha Vantage `EARNINGS`(+8-K 2.02 시각) | 발표일 다음 날 | 8-K 접수 시각, 없으면 다음 거래일 16:00 | 본인 화면만 |
| `fred_macro` | FRED/ALFRED | 매일 | 빈티지 `realtime_start` | 표시 가능(출처 표기) |
| `fred_release_calendar` | `fred/releases/dates` | 주 1회 | 수집 시각 | 표시 가능 |
| `cboe_pcr` | CBOE 일간 통계 페이지 | 매 거래일 18:00 | 거래일 17:00 | 피처 전용 [추정] |
| `sp500_membership` | fja05680 + 수동 확인 | 주 1회 | 효력일 | 피처 전용 |
| `listing_status` | Alpha Vantage | 주 1회 | 폐지일 | 피처 전용 |

### 8.3 약관 구분 원칙 [추정]
- **공공 데이터(SEC · FINRA · FRED · CBOE 공개 통계):** 화면에 원문 수치를 그대로 보여 줘도 된다. 근거 3종(근거 · 과거 적중률 · 실패사례)의 "근거"는 가능하면 이쪽에서 가져온다. 출처 링크(EDGAR URL)를 붙일 수 있어서 좋다.
- **상용 무료 API(Alpaca · Tiingo · Finnhub · Massive · Alpha Vantage · FMP):** 본인 1인 개인 사용이면 수집 · 저장 · 모델 피처 · 본인 화면 표시 모두 해당 약관의 "개인 사용"으로 볼 수 있다. **앱을 다른 사람에게 여는 순간(초대제 포함) 제3자 표시·재배포가 되어 위반이다.** Massive 약관은 비표시(non-display, 즉 모델 입력) 사용도 별도 라이선스를 요구한다 [2차] https://massive.com/legal/individuals-terms-of-service → Massive 데이터는 **피처로도 쓰지 않는 편이 안전하다.**
- Finnhub 약관: "데이터나 **데이터에서 파생된 결과**를 제3자와 공유하지 않는다" [확인] https://finnhub.io/terms-of-service → 초대 사용자에게 Finnhub 뉴스 기반 예측을 보여 주는 것도 문제가 될 수 있다.
- 따라서 **ADR 후보:** "미국 시세 · 실적 데이터는 소유자 1인에게만 표시한다(ADR-003 '확률 예측 소유자 전용'과 같은 경계)". 초대 사용자에게는 공공 데이터 기반 화면만 보인다.

### 8.4 단계별 슬라이스 [추정]
1. **S1 — 시세 골격:** 유니버스 테이블, Alpaca 일봉(raw + 기업행위) 백필과 일간 수집, 조정 재계산, 기본 가격 피처(수익률 · 변동성 · 모멘텀 · 섹터 상대강도). LightGBM 베이스라인 + 워크포워드 채점까지 끝까지 통과시킨다.
2. **S2 — SEC 이벤트:** Form 4(기회적 매수 분류 포함) · 8-K(2.02 실적 시각) · companyfacts. available_at 조인을 검증하는 테스트(미래 행 0건)를 넣는다.
3. **S3 — 실적 · 거시:** 실적 캘린더와 서프라이즈, FRED 빈티지, 발표 주간 더미. 구간 폭 보정(coverage)을 개선하는지 확인한다.
4. **S4 — 공매도 · 기관:** FINRA SI(공표일 기준), Reg SHO z-score, 13F 느린 피처. 피처군별 ablation 리포트를 만든다.
5. **S5 — 실시간 표시:** §9 조합(Alpaca IEX + Finnhub 웹소켓 → Node → SSE). 예측 파이프라인과 **분리**한다(실시간 가격은 모델 입력이 아니다).
6. 보류: 옵션 흐름(유료), ETF 흐름 API(유료), 의원 거래(예측력 없음), 국내 주식(TBA).

---

## 9. 무료 실시간 · 준실시간 미국 주식 시세 ("업비트처럼")

### 9.1 비교표

| 소스 | 방식 · 동시 구독 | 지연 · 커버리지 | 장전 · 장후 | 약관(개인 표시 · 서버 중계) |
|---|---|---|---|---|
| **Alpaca Basic IEX** | 웹소켓 **1연결**, 체결·호가 **30채널**, **분봉 채널은 무제한** [확인] https://docs.alpaca.markets/us/docs/about-market-data-api [2차] https://forum.alpaca.markets/t/what-does-realtime-data-in-free-account-mean/13165 | 실시간이지만 **IEX 단일 거래소**다. IEX는 통합 거래량의 **약 2.5~3%** [2차] https://alpaca.markets/learn/understanding-stock-market-data . 예: AAPL 하루 IEX 체결 12,630건 vs 전체 535,136건 [2차] 같은 곳 | IEX 운영 시간이 **08:00~17:00 ET**(장전 08:00~09:30, 장후 16:00~17:00) [2차] https://www.iex.io/resources/trading/trading-hours-holidays → 04:00~08:00, 17:00~20:00은 없다 | 개인 · 비상업. 공개 게시 · 다른 서버로의 배포 금지 [2차] https://alpaca.markets/support/redistribute-alpaca-api |
| **Finnhub 무료** | 웹소켓 **50종목** [2차] https://www.fintegrationfs.com/fintechapisusa/finnhub-api | 미국 체결 실시간이라고 안내한다. 원천 거래소 범위는 공식 문서로 확인하지 못했다 [추정: 전체 통합 체결이 아닐 수 있음 → Alpaca와 대조 필요] | 확인 못 함 | 개인 전용. **데이터와 파생 결과를 제3자와 공유 금지** [확인] https://finnhub.io/terms-of-service |
| **Tiingo IEX** | 무료 요금제도 IEX 웹소켓 firehose 접근 가능 [확인] https://www.tiingo.com/documentation/websockets/iex | IEX 체결 + 최우선 호가. **2025-02-01부터 전체 TOPS(`thresholdLevel` 0/5)는 IEX와 시장데이터 계약 필요**. 계약이 필요 없는 건 파생 참고가격(`thresholdLevel 6`)뿐이다 [확인] 같은 곳 | `afterHours` 플래그가 있다(IEX 시간 한정) [확인] | 무료는 Internal Use Only, 타인 표시 금지 [확인] https://www.tiingo.com/about/pricing . 대역폭 월 1GB라 firehose를 오래 켜 두기 어렵다 [추정] |
| **Massive(Polygon) Basic** | **웹소켓 없음**, 5회/분 [확인] https://massive.com/pricing | **EOD만.** 15분 지연 데이터도 유료(Starter $29)다 [확인] 같은 곳 | — | 표시 · 재배포 · 비표시 모두 제한 |
| **Twelve Data Basic** | REST 800크레딧/일. 웹소켓은 **체험 8크레딧 · 1연결 · 지정 목록 최대 8종목** [2차] https://support.twelvedata.com/en/articles/5335783-trial | 체험 수준 | 확인 못 함 | 개인 요금제 [2차] |

### 9.2 권장 조합 [추정]
- **Node 서버가 업스트림 웹소켓을 단 하나씩만** 연다(Alpaca 1연결 제한). 거기서 받은 틱을 BFF SSE(`BFF-REQ-006`)로 **본인 앱에만** 팬아웃한다. 업스트림 연결 수가 늘지 않으므로 무료 한도 안에서 기기 여러 대(웹 + 모바일)를 동시에 쓸 수 있다.
- 채널 배분:
  - **보유 종목 + 지금 열어 둔 종목 → Alpaca 체결·호가(30)**. 화면 전환 시 구독을 동적으로 바꾼다.
  - **관심 종목 전체 → Alpaca 분봉 채널(무제한)**. 1분 해상도로 "준실시간" 목록을 보여 준다.
  - **Finnhub 50종목 →** 체결이 드문 종목의 보조 가격 겸 IEX 가격 대조용.
- **기준가(전일 종가 · 등락률)는 SIP 일봉**(Alpaca 과거 봉)으로 계산한다. IEX 체결만으로 등락률을 계산하면 통합 종가와 어긋난다.
- 서버 중계의 약관 해석: 구독자 본인이 자기 서버를 거쳐 자기 기기에서 보는 것은 "다른 사람에게 배포"가 아니므로 개인 사용으로 볼 여지가 크다. 다만 Alpaca 문구("다른 컴퓨터·서버로 전송 금지")를 문자 그대로 읽으면 회색지대다. **공개 URL · 초대 사용자에게 노출하면 명백한 위반**이다. 필요하면 Alpaca 지원에 문의해 서면으로 받아 둔다.

### 9.3 한계 — "업비트와 같은 경험"은 어디까지 가능한가 [추정, 근거는 9.1]
- **가능:** 대형 유동주(메가캡 · 주요 ETF)는 IEX에서도 정규장 중 몇 초 간격으로 체결이 나와 가격이 "살아 움직이는" 경험이 된다. 30 + 50 종목의 틱과 무제한 분봉이면 개인 1인에게 충분하다.
- **불가능 · 차이:**
  1. **IEX 체결가 ≠ 통합 최종가 · NBBO.** 체결이 드문 종목은 가격이 수십 초~수 분 멈춰 보인다. IEX 최우선 호가는 전 시장 최우선 호가(NBBO)보다 넓을 수 있다.
  2. **거래량은 전체의 약 3%만 보인다** → 거래량 · 거래대금 실시간 표시는 하지 않는다(일봉 SIP 거래량만).
  3. **04:00~08:00 장전, 17:00~20:00 장후가 없다**(한국 시간으로 저녁 · 오전 일부 공백).
  4. 호가창(깊이) 없음. 최우선 1호가만 있다.
  5. 업비트처럼 전 종목 실시간 시세 목록은 불가능하다. 목록은 분봉(1분) 기준이다.
- **화면 규칙 제안:** 가격 옆에 **"IEX 실시간 · 체결 일부"** 라벨을 붙이고, 마지막 체결 시각을 함께 표시한다. 60초 이상 체결이 없으면 흐리게 표시한다. 정확한 전체 시장 실시간은 유료(Alpaca Algo Trader Plus SIP 또는 Massive Advanced)에서만 된다 [확인] https://massive.com/pricing , https://docs.alpaca.markets/us/docs/about-market-data-api

---

## 10. 남은 확인 항목

| 항목 | 이유 | 방법 |
|---|---|---|
| 한국 거주자의 Alpaca 데이터 키 발급 | 주 소스 성립 여부 | 가입 시도 |
| Finnhub 무료 웹소켓 원천(통합 체결인지) | IEX와 대조 기준 | 같은 종목 틱을 Alpaca SIP 15분 지연 봉과 비교 |
| Alpaca 과거 봉에 상장폐지 종목 포함 여부 | 생존편향 | 폐지 티커(예: 2020년 이후 폐지분)로 bars 조회 |
| Stooq API 키 약관 · 한도 | 예비 소스 | 키 신청 메일 회신 확인 |
| 자사주 us-gaap 태그 실제 사용률 | 피처 결측률 | companyconcept로 S&P 500 표본 조회 |
| FINRA · CBOE 데이터 표시 약관 | 화면 표시 가능 여부 | 각 사이트 Terms 원문 |
