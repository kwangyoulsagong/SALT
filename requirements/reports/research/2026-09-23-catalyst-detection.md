# 호재·악재(카탈리스트) 판별 딥리서치 보고서

- 작성일: 2026-09-23
- 대상: 개인용 투자 코치 앱(국내/미국 주식 + 코인, 소유자 1인). Node/TS 서버 + Postgres, Python 배치 서비스 `salt-forecast`(수집 → 온톨로지 → LightGBM 분위수 + 워크포워드 채점 → LLM은 문장만).
- 선행 보고서: `requirements/reports/research/2026-09-23-ai-forecast.md`. 이미 다룬 소스(OpenDART 자사주·내부자, EDGAR Form 4·8-K, Finnhub/GDELT, FinBERT)는 반복하지 않는다.
- 표기: **[확인]** = 원문·공식 문서·직접 호출로 확인. **[2차]** = 검색 요약·블로그·업계 리포트라서 수치가 다를 수 있음. **[추정]** = 조사 결과를 바탕으로 한 필자 판단.
- 사용자 질문: "주가나 비트코인이 오를 때 대부분 호재 때문인데, 우리는 호재 판별을 안 한다. 호재 정보를 수집·분석하려면 어떻게 해야 하나?"

---

## 0. 한 페이지 요약

1. **질문의 전제는 절반만 맞다.** 큰 가격 움직임 가운데 상당수는 식별할 수 있는 뉴스가 없는 날에 일어났다. 거시 뉴스로 설명되는 수익률 분산은 1/3을 넘기 어렵다(Cutler·Poterba·Summers 1989) [확인]. "오른 뒤 찾아낸 호재"는 사후 설명이 되기 쉽다. 그래서 호재 판별의 목표는 "왜 올랐나"를 맞히는 것이 아니다. **"이런 유형의 사건이 나온 뒤 과거 반응은 어떤 분포였나"를 표본 수와 함께 보여 주는 것**이다 [추정].
2. **대부분의 카탈리스트는 발표 당일에 반영된다. 일부는 발표 전에 이미 반영된다.** 근거는 다음과 같다.
   - 대형주 실적 발표 후 드리프트(PEAD)는 2006년 이후 사실상 0이다 [확인].
   - S&P 500 편입 효과는 1990년대 +7.4%에서 최근 10년 1% 미만으로 줄었다 [확인].
   - 국내 공급계약 공시는 공시 전부터 양의 초과수익이 있었다. 공시 다음 날에는 반전됐다 [확인].
   - 코인 상장은 발표 전 −3~−2일에 +3.2%가 이미 나타났다 [확인].
   - 토큰 언락은 **언락 전 30일부터** 하락이 시작된다 [2차].

   → **"호재 발생"만으로는 약한 피처다. "발표 전 이미 얼마나 움직였나"와 "서프라이즈 크기"가 핵심이다.**
3. **분류는 규칙이 먼저다.** 공시와 거래소 공지는 구조화된 코드와 정형 제목이 있어서 정규식과 코드만으로 대부분 분류된다 [확인].
   - DART: `pblntf_detail_ty`(B001·I001·I002), 주요사항보고서 API 36종.
   - EDGAR: 8-K `items` 필드(`2.02,9.01`).
   - 업비트 공지: "신규 거래지원 안내 (KRW, …)", "KRW 마켓 디지털 자산 추가", "거래 유의 종목 지정".

   LLM은 **비정형 뉴스 기사에만**, 원문 인용 검증을 통과한 것만 쓴다.
4. **예정 이벤트 캘린더는 무료로 대부분 확보된다.** 확인한 소스는 다음과 같다.
   - FOMC: 연준 페이지 [확인]
   - CPI: BLS ICS 피드 [확인]
   - 미국 실적일: Finnhub earnings calendar, 무료 [2차]
   - 국내 IR 일정: KIND [확인]

   **토큰 언락 API는 무료가 아니다.** DefiLlama unlocks는 Pro 전용이다 [2차]. CoinMarketCal 무료는 24시간 지연되고 재배포가 금지된다 [2차]. 대안은 업비트 "유통량 계획표 변경 안내" 공지와 프로젝트 공식 문서를 수동으로 큐레이션하는 것이다 [추정].
5. **코인 무료 데이터는 충분하다. 다만 약관 문제가 있다.**
   - 바이낸스 선물 펀딩비·OI는 공개 API로 받을 수 있다. 단 OI 이력은 약 30일만 제공되므로 **매일 적재해야 한다** [확인].
   - DefiLlama 스테이블코인 API는 무료이고 키가 필요 없다 [확인].
   - **업비트 공지 JSON 엔드포인트(`api-manager.upbit.com`)는 실제로 동작한다** [확인, 직접 호출]. 그러나 공식 Open API 문서에 없다. 업비트 약관 제10조는 "사전 승낙 없는 에이전트·스크립트·스파이더 접속"을 금지한다 [확인]. → **저빈도 폴링, 개인 전용, 원문 재배포 없음, 차단되면 중단**하는 조건으로만 쓴다. 약관 위험은 문서에 남긴다.
6. **권장 설계는 다음과 같다.**
   - 기존 `forecast.fact`에 **카탈리스트 fact kind 약 30개**를 추가한다.
   - `forecast.scheduled_event`(미래 일정)를 새로 만든다.
   - `forecast.event_reaction_stats`(유형별 과거 반응 분포, 워크포워드로 갱신)를 새로 만든다.
   - 화면에는 **"유형 · 원문 링크 · 발표 전 N일 이미 움직인 폭 · 같은 유형 과거 반응 분포(표본 수·10~90%·반대로 간 사례)"** 를 보여 준다.
   - "호재/악재" 라벨은 **우리가 판정한 사실이 아니라 '통상 해석'** 으로만 표시한다. 확신 표현과 목표가는 0건이다.

---

## 1. 카탈리스트 분류 체계(taxonomy)와 이벤트 스터디 근거

### 1.1 참고할 상용 체계
- RavenPack은 약 6,900~7,000개 이벤트 카테고리를 56개 그룹으로 묶는다. 그룹 예: acquisitions & mergers, analyst ratings, credit ratings, dividends, earnings, equity actions, insider trading, legal, partnerships, price targets, products-services, regulatory, revenues 등. 또 "Event Novelty Score"(24시간 창에서 첫 보도 = 100)를 둔다 [2차] https://www.ravenpack.com/products/edge/data/news-analytics , https://www.ravenpack.com/blog/new-ravenpack-analytics-event-detection
- 8-K 기반 세분 체계: 119개 유형, 3단 계층, 모든 태그를 원문 n-gram에 앵커링한다. 2022~2026년 29만 건 공시에서 60만 태그를 공개했다. 같은 SEC item 코드 안에서도 경제적으로 다른 사건을 구분해 이벤트 스터디로 검증했다 [확인, 초록] https://arxiv.org/abs/2607.08346
- **우리 앱에는 7,000개가 필요 없다.** 1인 사용이라 표본이 작다. **30개 안팎의 굵은 유형**으로 시작하고, 유형마다 표본이 쌓인 뒤에 쪼갠다 [추정].

### 1.2 주식 카탈리스트 — 실증 근거

| 유형 | 평균 반응(문헌) | 선반영·드리프트 | 출처 |
|---|---|---|---|
| 실적 서프라이즈 | 발표일에 대부분 반영. **대형주 PEAD는 2006년 이후 사실상 0**. 마이크로캡에만 남음 | 2025년 "PEAD 부활" 논문 2편은 마이크로캡을 빼면 t=1.43으로 유의성을 잃음 | Martineau 2022 [확인] https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3111607 · UCLA 정리 [2차] https://anderson-review.ucla.edu/is-post-earnings-announcement-drift-a-thing-again/ |
| 실적 발표 "예정" 자체 | 발표가 있는 달의 수익률이 없는 달보다 연 11%p 이상 높음(46개국). 불확실성 프리미엄 | 예정일을 아는 것 자체가 정보(변동성 확대) | Barber et al. 2013 [확인, 초록] https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1872183 |
| 공급계약(국내 단일판매·공급계약) | 2006~2011년 6,072건. 공시 당일 유의한 양(+)의 초과수익 | **공시 전부터 양의 초과수익 → 다음 날 반전**. 정보 사전 유출 시사 | KCI 논문 [확인, 초록] https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002199510 |
| M&A | 피인수 기업 [−1,+1] CAR 15~30%. 인수 기업은 0 근처 | 피인수 기업은 발표 전 run-up이 유의 | Betton·Eckbo·Thorburn 2008 서베이 [2차] https://eventstudy.de/blog/event-study-mergers-acquisitions |
| 자사주 매입(미국 공개시장) | 발표 2일 약 +2% 안팎 | **장기 과소반응**: 4년 BHAR +12.1%, 가치주 +45.3%(1980~90년 표본. 오래된 결과) | Ikenberry·Lakonishok·Vermaelen 1995 [2차] https://www.nber.org/papers/w4965 |
| 자사주 소각(국내) | 소각 금액 2023년 4.8조 → 2024년 13.9조 → 2025년 21.4조. 2026년 소각 의무화 | **제도가 바뀌면 과거 반응 분포가 무효가 될 수 있음(국면 전환)** | 뉴스 [2차] https://biz.newdaily.co.kr/site/data/html/2026/04/07/2026040700311.html |
| 유상증자(SEO) | 발표 시 −1~−3% 수준(업종·방식별 차이) | — | [2차] https://www.tejwin.com/en/insight/event-study-the-announcement-impact-of-seasoned-equity-offerings-on-stock-returns/ |
| 전환사채(CB, 국내) | 공시 (0,+1)에 음(−)의 비정상수익. 전환가 과소책정에 따른 부의 이전 | 코스닥 저신용 기업의 주된 조달 수단 → **악재 쪽 사전확률** | [2차] https://koreascience.kr/article/JAKO199508508050792.page |
| 지수 편입 | S&P 500 편입 효과가 1990년대 +7.4% → 2010년대 <1%. 편출도 0.1% | 편입 예측이 쉬워져 선반영됨 | Greenwood·Sammon, JF 2025 [확인] https://www.nber.org/system/files/working_papers/w30748/w30748.pdf |
| 애널리스트 상향/하향 | 3일 CAR: 상향 +3.0%, 하향 −4.7%. 하향 후 6개월 −9.1% 드리프트 | **악재가 더 오래 간다**(비대칭) | Womack 1996 [2차] http://arc.hhs.se/download.aspx?MediumId=1307 |
| FDA(PDUFA)·임상 | 임상 결과 1,752건: 중앙값 3.8% 변동. 57%는 ±5% 안, **7.6%는 −30% 이상 급락**. PDUFA 전 "체계적 run-up 없음" | 꼬리 위험이 크다 → 분포로만 표현해야 함 | pdufa.bio(표 CC BY 4.0) [2차] https://www.pdufa.bio/research |
| 8-K 전반 | 모든 item에서 이벤트일·공시일 전후로 비정상 거래량·변동성. 일부 item은 공시 뒤 드리프트 | 2.02·7.01·8.01은 내용이 이질적이어서 item만으로는 유형이 불충분 | Lerman·Livnat 2010 [확인, 초록] https://link.springer.com/article/10.1007/s11142-009-9114-7 |
| 거시 FOMC | 1994~2011년에는 FOMC 전 24시간 +49bp(pre-FOMC drift) | **2015년 이후 사라짐** | Lucca·Moench [확인] https://www.newyorkfed.org/research/staff_reports/sr512.html · Kurov et al. [확인] https://pmc.ncbi.nlm.nih.gov/articles/PMC7525326/ |
| 재탕 뉴스 | 오래된 정보(이전 10개 기사와 유사)에는 반응이 약함. 그러나 **그날 수익률이 다음 주에 반전**. 개인 투자자가 과잉반응 | → 새로움(novelty) 피처의 근거 | Tetlock 2011 [확인, 초록] https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1949379 |

**배당 변경·소송·정책**은 유형별로 연구가 많지만 이번 조사에서 수치를 원문으로 확인하지 못했다. 표본이 쌓이면 **우리 데이터로 직접 측정한다** [추정].

### 1.3 코인 카탈리스트 — 실증 근거

| 유형 | 반응(문헌) | 주의 | 출처 |
|---|---|---|---|
| 거래소 상장 | 327건(22개 거래소): 상장일 AR +5.7%, [−3,+3] +9.2%. **발표 전 [−3,−2] +3.2%** → 정보 선행 거래. 바이낸스 14.7%, 빗썸 5.1%. 22곳 중 6곳은 전체 창에서 음(−) | 2017~2019년 표본. 현재 업비트에 그대로 적용된다고 볼 수 없음 | Ante 2019 [확인, 요약] https://www.blockchainresearchlab.org/2019/09/10/market-reaction-to-exchange-listings-of-cryptocurrencies/ |
| 업비트·빗썸 원화마켓 상장 | 업비트 공지 **이전에** 해외 거래소 가격·거래가 먼저 움직임. 상장 펌프는 단발성, 이후 되돌림 경향 | 학술 표본 없음. 기사·업계 분석 수준 | 블록미디어 [2차] https://www.blockmedia.co.kr/archives/1124820 · DataMaxi+ [2차] https://datamaxiplus.com/ko/blog/arbitrage-course-10-won-sangttari-case-study |
| 토큰 언락 | 16,000건 이상에서 30일 창 기준 90%가 음(−)의 영향. 팀 언락 약 −25%, 생태계 언락 +1.18%. **언락 30일 전부터 하락 시작**. 14일 뒤 안정 | 마켓메이커(Keyrock)의 업계 분석이라 방법론 검증 불가 | [2차] https://keyrock.com/from-locked-to-liquidity-what-16000-token-unlocks-teach-us/ · 52건 72시간 평균 −16.97% [2차] https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6632838 |
| 현물 ETF 자금 흐름 | 2024-01~2025-04: 순유입 1억 달러당 당일 BTC +53bp. 흐름이 일간 수익률 분산의 21% 설명. 자기상관 때문에 10일 누적 96bp | **당일 동시 관측이다. 흐름은 장 마감 후 공개되므로 예측 피처로는 전일 흐름만 써야 함** | Lim, SSRN [2차, 초록] https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6592830 |
| 반감기 | 이벤트 스터디 평균 AR −7.55%(암호자산 전반). BTC 합성통제로는 3개월 +24.55%. 2020년은 유의한 인과 추정 실패 | **표본 4회**. 통계적 결론을 내리기 어려움 | [2차] https://www.sciencedirect.com/science/article/abs/pii/S0927538X25002501 · https://arxiv.org/pdf/2511.05512 |
| 해킹 | 거래소 해킹 당일 BTC −1.51%(2012~2021). **2019년 이후 유의성 약화**. 공개 전 수 시간 비정상수익 | 대상 토큰은 훨씬 큼 [추정] | [2차] https://www.sciencedirect.com/science/article/abs/pii/S1544612323003276 |
| 스테이블코인 발행 | 2019~2020년 565건: 발행 **전 주에 하락**, 발행 전후 24시간에 주요 코인 양(+)의 AR. 발행 규모는 유의하지 않음 | 발행은 "하락 뒤 매수 대기 자금"의 신호일 수 있음 | Ante·Fiedler·Strehle 2021 [확인, 초록] https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3626969 |
| FOMC·CPI | FOMC 발표 뒤 첫 1시간에 BTC 평균 절대수익률 0.66% → 1.25%. CPI 발표일에는 수익률이 낮고 CPI 서프라이즈에 음(−)으로 반응. 다만 초기 연구는 "영향 미미" | 국면 의존적(연구마다 상충) | [2차] https://www.sciencedirect.com/science/article/abs/pii/S1544612326006021 · NY Fed [2차] https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr1052.pdf |
| 펀딩비·미결제약정 | 극단적 펀딩비가 지속되면 급반전 전조로 자주 언급됨. 그러나 **강한 추세에서는 수 주간 유지됨** | 학술 검증을 이번 조사에서 확인하지 못함 → 피처 후보로만 | [2차] https://forklog.com/en/the-funding-rate-how-it-helps-anticipate-price-reversals-in-bitcoin-and-ethereum/ |
| 부정 이벤트 비대칭 | 1% 유의수준에서 유의한 AR: 부정 이벤트 22건, 긍정 8건 → **악재 반응이 더 크다** | — | [2차] https://www.researchgate.net/publication/341117503_Announcement_effects_in_the_cryptocurrency_market |

### 1.4 분류 체계에서 나온 결론 [추정]
- **"호재"라는 이름은 사전확률일 뿐이다.** 공급계약·상장은 평균이 양(+)이다. 그래도 공시 다음 날 반전, 22개 거래소 중 6곳 음(−) 같은 사례가 흔하다. 화면 라벨은 "통상 호재로 해석되는 유형"까지만 쓴다. 실제 방향은 **우리 데이터에서 측정한 반응 분포**로 보여 준다.
- **악재 반응이 더 크고 더 오래 간다**(Womack 하향 −9.1% 드리프트, 코인 부정 이벤트 22 vs 8). 코치 앱에는 "악재 감지"가 "호재 감지"보다 쓸모가 크다.
- 효과는 **시간이 지나며 사라진다**(PEAD, 지수 편입, pre-FOMC, 해킹 반응). 과거 문헌의 수치를 화면 상수로 쓰면 안 된다. 반응 통계는 **워크포워드로 계속 다시 측정**한다.

---

## 2. 방법론

### 2.1 이벤트 스터디(CAR)
- 비정상수익률 AR = 실제수익률 − 정상수익률. 정상수익률은 추정 창(예: −250~−30일)의 시장모형(α+β·시장수익률)으로 구한다. CAR은 창 [a,b]의 AR 합이다 [확인] https://pmc.ncbi.nlm.nih.gov/articles/PMC9264305/
- 우리 앱에서 쓸 기준 시장은 다음과 같다 [추정].
  - 국내주: KOSPI/KOSDAQ 지수
  - 미국주: SPY
  - 알트코인: BTC
  - BTC 자체: 시장모형 대신 원수익률 − 추정 창 평균
- **창을 셋으로 나눈다.** 선반영 [−20,−1], 발표 [0,+1], 이후 [+2,+20]. 사용자 질문 "이미 반영됐나?"의 답은 첫 창에 있다.
- 공시 시각이 장 마감 후면 이벤트일 0은 **다음 거래일**이다. 코인은 24시간이라 **시간 단위 창**을 쓴다(발표 뒤 1h·24h·72h).

### 2.2 선반영(pre-announcement drift) 판별
- 문헌상 신호: 공급계약 공시 전 양(+) 초과수익 [확인], 상장 발표 전 +3.2% [확인], 언락 30일 전 하락 [2차], 해킹 공개 전 수 시간 비정상수익 [2차].
- **피처로 만든다** [추정].
  - `pre_car_5d`, `pre_car_20d`: 이벤트 `available_at` 직전 5·20일 CAR
  - `pre_volume_z`: 직전 5일 거래량 / 60일 평균의 z
  - 코인은 `pre_ret_24h`, `pre_ret_72h`, 해외 거래소 대비 김프 변화
- 화면 문장 예: "공지 전 5일 동안 이미 +18% 움직였습니다. 같은 유형 과거 사례에서 이런 경우 공지 뒤 20일 반응 분포는 …"

### 2.3 PEAD와 서프라이즈 크기
- 서프라이즈 = (실제 − 컨센서스) / 주가, 또는 (실제 − 직전 4분기 같은 분기) / 표준편차(SUE).
- 대형주는 드리프트가 없으므로 **발표일 반응 자체를 설명**하는 데 쓰고, 이후 드리프트를 약속하지 않는다 [확인, Martineau].
- 국내 잠정실적 공정공시는 매출·영업이익·순이익과 **전년 동기·직전 분기 대비 증감률**을 담는다 [2차]. 컨센서스 무료 소스가 없으므로 **과거 대비 서프라이즈(SUE 방식)만** 쓴다 [추정].

### 2.4 뉴스 이벤트 추출: 규칙 vs 분류모델 vs LLM

| 방식 | 적합한 소스 | 정확도·비용 | 판단 |
|---|---|---|---|
| **규칙(코드·정규식)** | DART 보고서명·유형 코드, 8-K items, 업비트/바이낸스 공지 제목, 거래소 API 필드 | 정형 소스에서는 사실상 100%에 가깝다. 비용 0 [추정] | **1순위** |
| 분류 모델(FinBERT, KR-FinBert-SC) | 영문·국문 헤드라인 감성 | KR-FinBert-SC: 긍/부정 2분류 정확도 0.963(5만 건 라벨) [확인] https://huggingface.co/snunlp/KR-FinBert-SC . **라이선스가 모델 카드에 명시되지 않음** [확인] → 개인 사용이어도 사용 전 저자 확인 필요 | 감성만 가능. **이벤트 유형 분류는 못 함** |
| LLM 구조화 추출 | 비정형 기사(정책·소송·파트너십 등 코드 없는 사건) | 8-K 119유형: 품질 점수가 오를수록 정밀도 12% → 96%. **2차 검증 패스가 필수** [확인, 초록] https://arxiv.org/abs/2607.08346 . FinTagging(XBRL 개념 연결) 제로샷 최고 정확도 0.17 → 세밀한 개념 매핑은 약함 [2차] https://arxiv.org/abs/2505.20650 | **보조**. 원문 인용 검증 통과분만 |

### 2.5 중복·재탕 제거와 새로움(novelty)
- **재탕 뉴스에는 과잉반응 뒤 반전이 온다**(Tetlock) [확인]. 새로움은 중복 제거용이면서 **그 자체로 피처**다.
- 구현 [추정]:
  1. URL 정규화, 그리고 `originallink` 기준으로 완전 중복을 제거한다.
  2. 제목+리드 문단의 MinHash/SimHash로 준중복 클러스터를 만든다(Jaccard ≥ 0.8).
  3. `novelty` = 같은 엔티티의 직전 72시간 이벤트 클러스터와의 최대 유사도의 보수. RavenPack ENS처럼 "같은 사건 첫 보도 = 1.0"으로 둔다.
  4. **이벤트 단위로 묶는다.** 기사 N개는 사건 1개다. fact에는 사건 1행을 넣고 `attrs.article_count`와 `first_seen_at`을 둔다.
- 공시가 있는 사건은 **공시를 정본**으로 하고 기사는 같은 사건에 붙인다. `available_at`은 공시 접수 시각과 첫 기사 시각 중 **빠른 쪽**이다.

### 2.6 종목 연결(entity linking)
- 기존 `forecast.entity_alias`를 쓴다(`salt-forecast/.claude/rules/ontology.md` §3).
- 공시·거래소 공지는 **소스가 식별자를 준다.** DART `corp_code`, EDGAR CIK, 업비트 공지 제목의 `(SYMBOL)` 괄호가 그 예다. 이 경우 linking이 필요 없다 [확인].
- 뉴스는 제목의 종목명·티커를 별칭 표로 해소한다. 모호한 이름("삼성", "현대", 코인 티커 "ONE"·"GAS"·"META2")은 **본문 공출현 + 시장 구분**으로 걸러낸다. 해소되지 않으면 `unresolved`로 남긴다(버리지 않음) [추정].

### 2.7 DART 보고서명으로 유형 판별이 가능한가 — **가능하다** [확인]
- 공시검색 API는 `pblntf_ty`(A 정기, B 주요사항, C 발행, D 지분, E 기타, F 감사, I 거래소 공시 …)와 `pblntf_detail_ty`를 지원한다. B001 = 주요사항보고서, I001 = 수시공시, I002 = 공정공시 [확인] https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019001
- 응답 `rm` 필드에는 "유"(유가증권), "코"(코스닥), "정"(정정) 같은 비고가 있다 → **정정공시 판별**에 쓴다 [확인, 같은 문서].
- **주요사항보고서 전용 API 36종**(DS005)은 유형이 곧 API다 [확인] https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS005
  - 유상증자·무상증자·감자
  - 전환사채·신주인수권부사채·교환사채 발행결정
  - 자기주식 취득/처분/신탁 체결·해지
  - 영업·유형자산·타법인주식 양수도
  - 회사합병·분할·주식교환
  - 소송 등의 제기
  - 부도·영업정지·회생절차·해산
  - 해외 상장/상폐
- 거래소 공시(I001·I002)에는 전용 API가 없으므로 `report_nm` 제목 규칙으로 가른다. 예: "단일판매ㆍ공급계약체결", "연결재무제표기준영업(잠정)실적(공정공시)", 접두 "[기재정정]" [확인, 제목 예시] https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260106800134
  - 공급계약의 **계약금액 / 최근 매출액 비율**은 본문 표에 있다. 이 연구 표본의 평균은 매출의 36.53% [확인, KCI 초록]. 본문 파싱은 `document.xml` API(원문 ZIP)로 한다 [2차].

---

## 3. 카탈리스트를 "예측 피처"로 쓰는 법

### 3.1 피처 목록 [추정]

| 피처 | 정의 | 누수 주의 |
|---|---|---|
| `evt_{type}_d{k}` | as_of 기준 지난 k일(1·5·20) 안에 해당 유형 사건이 있었는지 여부 / 횟수 | `available_at <= as_of` 인 것만 |
| `evt_surprise` | 실적 SUE, 공급계약 금액/매출, 자사주 금액/시총, 언락 수량/유통량, ETF 순유입/시총 | 분모(시총·매출)도 as-of 값 |
| `evt_react_0` | 사건 뒤 첫 거래일(코인은 24h) CAR = **시장의 초기 판정** | 예측 시점이 반응 창 뒤일 때만 사용 가능 |
| `evt_pre_car` | 사건 전 5·20일 CAR (선반영도) | 사건 `available_at` 이전 창 |
| `evt_pre_volz` | 사건 전 5일 거래량 z | 동일 |
| `evt_novelty` | 2.5절 | 클러스터링도 as-of로 재현 가능해야 함 |
| `evt_prior_mean` / `evt_prior_n` | **학습 창 안에서** 측정한 같은 유형의 과거 평균 반응과 표본 수 | 전체 기간으로 계산하면 누수 → 워크포워드 창마다 다시 계산 |
| `sched_{type}_in_d` | 예정 이벤트까지 남은 일수(실적·FOMC·CPI·언락) | 일정이 **공지된 시각**이 available_at. 과거 일정표를 백필할 때 주의 |
| `sent_*` | 기존 FinBERT 감성(선행 보고서) | — |

### 3.2 `available_at` 규칙(소스별) [확인·추정 혼합]

| 소스 | available_at |
|---|---|
| DART | 접수번호 `rcept_no`의 날짜 + 공시 게시 시각. 공시검색 목록에는 날짜(`rcept_dt`)만 있으므로 **수집 폴링 시각**을 상한으로 쓴다. 백필 시에는 보수적으로 **당일 18:00 KST** [추정] |
| EDGAR | `acceptanceDateTime`(UTC). submissions JSON에서 직접 확인: Apple 8-K `2026-07-30T20:30:28Z`, items `2.02,9.01` [확인, 직접 호출] https://data.sec.gov/submissions/CIK0000320193.json |
| 업비트 공지 | **`first_listed_at`** (최초 게시). `listed_at`은 "개시 시점 변경 안내" 같은 수정 때 바뀐다 — 예: PYUSD 공지 first 09:48 → listed 14:50 [확인, 직접 호출]. `listed_at`을 쓰면 늦게 알게 된 것처럼 보이고, 수정본 내용을 최초 시각에 붙이면 누수가 된다 → **버전 행으로** 저장 |
| ETF 흐름 | 해당 거래일 흐름은 **장 마감 후 ~다음 날 아침** 공개. as-of 당일 흐름을 피처로 쓰면 누수(§1.3 Lim 연구는 동시 관측) [추정] |
| 바이낸스 펀딩비 | 정산 시각(8h 간격) |
| 뉴스 | 기사 발행 시각. 수정 기사는 새 버전 |

### 3.3 "이미 가격에 반영됐나" 판별 규칙 [추정]
- `pre_car_5d`가 같은 유형 과거 분포의 상위 20%이거나, `pre_volz > 2`이면 "발표 전 이미 크게 움직인 사례"로 태그한다.
- 이때 보여 줄 비교 통계는 **같은 유형 + 같은 선반영 구간**으로 조건부 분포다. 표본이 30개 미만이면 조건을 풀고, 표본 수를 함께 표기한다.
- 목적은 "지금 사면 늦었다"는 판정이 아니다. **"이런 경우 과거엔 이렇게 분포했다"**는 정보 제공이다(확신 표현 금지).

---

## 4. 예정 이벤트 캘린더(미래 카탈리스트)

| 이벤트 | 무료 소스 | 형식·약관 | 표기 |
|---|---|---|---|
| FOMC | 연준 FOMC 캘린더. 2026: 9/15-16, 10/27-28, 12/8-9. 2027: 1/26-27 … 12/7-8 | HTML(ICS 없음) → 연 1회 수동/파싱. 공공 | [확인] https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm |
| CPI(미국) | BLS 발표 일정. 다음은 2026-10-14, 11-10, 12-10, 모두 08:30 ET. **ICS 피드** `https://www.bls.gov/schedule/news_release/bls.ics` | 공공 | [확인] https://www.bls.gov/schedule/news_release/cpi.htm |
| 미국 실적 발표일 | Finnhub `/calendar/earnings` (EPS·매출 추정/실제, 시간대 hour) | 무료 티어 사용 가능. 이력 범위 제한 있음. 표시 조건은 기존 보고서처럼 "피처 전용"으로 보수적으로 | [2차] https://finnhub.io/docs/api/earnings-calendar |
| 미국 실적 발표(사후) | EDGAR 8-K item 2.02 | 공공. User-Agent 필수 | [확인] |
| 국내 실적·IR | KIND IR 일정 | 웹페이지. 공식 API 없음 → 저빈도 수집. 약관 확인 필요 | [확인, 페이지 존재] https://kind.krx.co.kr/corpgeneral/irschedule.do?method=searchIRScheduleMain&gubun=iRSchedule |
| 국내 배당락·주총 | DART 사업보고서/주총 소집공고, KIND | 공공 | [추정] |
| 토큰 언락 | DefiLlama unlocks 페이지는 무료로 볼 수 있음. **API는 Pro/API 플랜의 프리미엄 엔드포인트** | 유료 | [2차] https://defillama.com/subscription |
| 〃 대안 | DefiLlama `emissions-adapters` 오픈소스 저장소(프로토콜별 베스팅 스케줄 코드). 로컬에서 돌려 일정 생성 | 라이선스 미확인(GitHub API가 404 응답) → **확인 전 사용 금지** | [2차] https://docs.llama.fi/list-your-project/emissions-dashboard |
| 〃 대안 | **업비트 "유통량 계획표 변경 안내" 공지**(디지털 자산 카테고리). 예: "유통량 계획표 변경 안내 : 쎄타퓨엘(TFUEL)" | 업비트 원화마켓 종목만 다루지만 우리 범위와 정확히 일치 | [확인, 직접 호출] |
| 코인 업그레이드·이벤트 | CoinMarketCal API: 무료는 **24시간 지연**. 경쟁 캘린더 구축·재배포 금지 | 개인 앱 내부 사용은 가능해 보이나 약관 재확인 | [2차] https://coinmarketcal.com/api-terms-of-service |
| 〃 대안 | 이더리움 등 주요 체인은 공식 블로그·GitHub 릴리스(하드포크 일정) → 수동 큐레이션 | 공공 | [추정] |
| BTC 반감기 | 블록 높이로 계산 가능(21만 블록마다) | 계산값 | [확인, 프로토콜 규칙] |

**설계 판단** [추정]: 1인 사용자이고 보유 종목 수가 적다. 그래서 **코인 언락·업그레이드는 "수동 입력 + 원문 URL 필수"** 로 시작한다. 자동화는 소스 약관이 정리된 뒤에 한다. 캘린더 행에는 `announced_at`(일정이 공개된 시각)을 둬서 백테스트 누수를 막는다.

---

## 5. 코인 특화 무료 데이터

| 데이터 | 방법 | 한도·약관 | 표기 |
|---|---|---|---|
| **업비트 공지** | `GET https://api-manager.upbit.com/api/v1/announcements?os=web&page=1&per_page=20&category={all|trade|digital_asset|...}` → `{id, title, category, listed_at, first_listed_at}`. 총 5,848건(all), 거래 779건, 디지털 자산 955건 | **비공식**(Open API 문서에 없음). 약관 제10조 ① 8호가 사전 승낙 없는 에이전트·스크립트·스파이더 접속을 금지 → **위험 수용 결정 필요**. 완화책: 10분 이상 간격, 1페이지만, 원문은 링크만, 차단 시 중단 | 엔드포인트 [확인, 2026-09-23 직접 호출] · 약관 [확인] https://static.upbit.com/terms/legacy/service_terms_20201126.html |
| 업비트 공지 제목 규칙 | ① "{이름}({SYM}) 신규 거래지원 안내 (KRW, BTC, USDT 마켓)" ② "{이름}({SYM}) KRW 마켓 디지털 자산 추가" ③ "거래 유의 종목 지정 안내" / "지정 해제 안내" ④ "거래지원 종료 안내 (날짜)" ⑤ "유통량 계획표 변경 안내" ⑥ 괄호 뒤의 "(거래지원 개시 시점 변경 안내)"는 **수정본** | 정규식으로 분류 가능. **"KRW" 포함 여부로 원화마켓 상장을 구분** | [확인, 직접 호출 제목] |
| 바이낸스 공지 | `https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=20` (48 = 신규 상장) | **비공식 bapi**. 403 보고 있음 | [2차] https://dev.binance.vision/t/announcement-related-api/33478 |
| 펀딩비 | `GET https://fapi.binance.com/fapi/v1/fundingRate` (키 불필요) | 500회/5분/IP(fundingInfo와 공유) | [확인] https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Get-Funding-Rate-History |
| 미결제약정 이력 | `GET /futures/data/openInterestHist` | **최근 30일만** 제공 → 매일 적재하지 않으면 과거 복원 불가 | [확인, 같은 문서군] |
| 스테이블코인 발행량 | DefiLlama `/stablecoins`, `/stablecoincharts/all`, `/stablecoin/{id}` — 키 불필요 | 무료. 구체 레이트리밋은 비공개 | [확인] https://api-docs.defillama.com/ |
| ETF 흐름 | Farside(웹 표, 무료, 오류 면책) / SoSoValue 대시보드 | **공식 무료 API 없음**. 웹 표 파싱은 약관 확인 필요 → 대안: EDGAR N-PORT가 아니라 발행사 일간 보유량(IBIT 등 홈페이지 CSV) [추정] | [2차] https://farside.co.uk/btc/ · https://sosovalue.com/assets/etf/us-btc-spot |

---

## 6. 국내 주식 카탈리스트

### 6.1 DART 유형 코드 → fact kind 매핑 [확인 + 추정]

| 원천 | 식별 | 제안 kind | 통상 해석(사전확률) |
|---|---|---|---|
| DS005 유상증자 결정 | 전용 API | `equity_offering` | 악재 쪽 |
| DS005 무상증자 결정 | 〃 | `bonus_issue` | 중립~호재 [추정] |
| DS005 감자 결정 | 〃 | `capital_reduction` | 악재 쪽(무상감자) |
| DS005 CB·BW·EB 발행결정 | 〃 | `convertible_issue` | 악재 쪽 [2차] |
| DS005 자기주식 취득/신탁 체결 | 〃 | `buyback_acquire`(기존) | 호재 쪽 |
| DS005 자기주식 처분 / 신탁 해지 | 〃 | `buyback_dispose`(기존), `buyback_trust_end` | 악재 쪽 |
| DS005 합병·분할·주식교환 | 〃 | `merger`, `split_off`, `share_exchange` | 사건별 상이 |
| DS005 타법인주식 양수 / 영업양수 | 〃 | `acquisition` | 사건별 상이 |
| DS005 소송 등의 제기 | 〃 | `lawsuit` | 악재 쪽 |
| DS005 부도·영업정지·회생·해산 | 〃 | `distress` | 악재 |
| I001 단일판매ㆍ공급계약체결 | `report_nm` 정규식 | `supply_contract` (attrs: 금액/매출 비율, 계약상대, 기간) | 호재 쪽, **당일 반영 후 반전 근거 있음** |
| I002 영업(잠정)실적(공정공시) | `report_nm` 정규식 | `earnings_prelim` (attrs: 매출·영업익 YoY/QoQ) | 서프라이즈 부호에 따름 |
| I001 주식 소각 결정 | `report_nm` 정규식 | `share_cancellation` | 호재 쪽. **2026년 의무화로 국면 전환** [2차] |
| I001 현금·현물배당 결정 | `report_nm` 정규식 | `dividend_decl` | 증감에 따름 |
| KIND 시장조치(I003) | 관리종목·투자경고·거래정지 | `market_warning` | 악재 쪽 |
| 모든 공시 `rm`에 "정" | 정정 | 같은 사건의 새 `version` | — |

- 공시검색 API는 일 2만 건 안팎에서 제한 오류(020)가 난다 [확인]. 관심 종목만 `corp_code`로 폴링하면 충분하다 [추정].

### 6.2 한국어 금융 뉴스 무료 소스
- **네이버 검색 API(뉴스)**: 일 25,000회, 1회 최대 100건, start 최대 1,000 [2차] https://choonghyunryu.github.io/posts/2022-03-01-open-api/ . 반환 필드는 제목·요약(description)·원문 링크·발행 시각이다. **본문은 없다.** 이번 조사에서는 개발자 문서 페이지를 직접 열지 못했다 → 약관(저장·표시 조건)은 사용 전 확인한다.
- 본문 크롤링은 언론사 저작권과 이용약관 문제가 있다. 대법원 2021도1533(크롤링 형사 판결)도 참고할 것 [2차] https://file.scourt.go.kr/dcboard/1727143941701_111221.pdf . **제목+요약+링크만 저장하고, 이벤트 판별은 제목 중심**으로 한다 [추정].
- 공시가 있는 국내 사건은 DART가 정본이므로 뉴스는 **공시 없는 사건(정책·규제·수주 루머·소송 보도)** 보조용이다.

### 6.3 한국어 금융 모델과 라이선스

| 모델 | 용도 | 라이선스 | 표기 |
|---|---|---|---|
| snunlp/KR-FinBert-SC | 긍/부정 2분류, 정확도 0.963 | **모델 카드에 미표기** → 사용 전 저자 문의 또는 GitHub 확인 | [확인] https://huggingface.co/snunlp/KR-FinBert-SC |
| snunlp/KR-FinBert | 사전학습(뉴스 44만 제목 + 애널리스트 리포트 1.1만) | 미표기 | [확인] https://huggingface.co/snunlp/KR-FinBert |
| 이벤트 "유형" 분류 공개 모델 | — | **찾지 못함** | [추정] |

→ 한국어 이벤트 유형은 **DART 규칙 + LLM 보조**로 처리하고, 감성은 라이선스 확인 뒤 KR-FinBert-SC를 쓴다.

---

## 7. LLM 구조화 추출 — 정확도·비용·검증

### 7.1 근거
- 8-K 119유형 추출: LLM 태그의 정밀도가 품질 점수에 따라 12% → 96%로 오른다. **근거 없는(unsupported) 태그는 정밀도가 크게 낮다.** 보정된 품질 점수에는 **별도 2차 검증 패스가 필요**하다 [확인, 초록] https://arxiv.org/abs/2607.08346
- XBRL 개념 연결 같은 **세밀한 분류 체계 매핑은 제로샷 LLM이 약하다**(최고 정확도 약 0.17). 숫자 추출은 강하다 [2차] https://arxiv.org/abs/2505.20650
- 추출 결과의 근거 인용은 3단계로 검증하는 방식이 제안돼 있다. ① 공백 정규화 후 완전 부분문자열 일치 → ② 인용 속 숫자 토큰을 원문에서 그대로 검색 → ③ 퍼지 슬라이딩 윈도우. 모두 실패하면 unaligned로 둔다 [2차] https://arxiv.org/pdf/2603.04663
- 선행 보고서: LLM은 학습 기간 데이터에서 **기억(memorization)** 으로 성능이 부풀려진다 → 추출 정확도 평가는 **모델 지식 컷오프 이후 기사**로만 한다.

### 7.2 무료 한도 안에서 가능한가 [2차 + 추정]
- Gemini API 무료 티어는 2026년 4월 이후 Flash·Flash-Lite만 남았다. 일 한도는 출처마다 20~1,500 RPD로 들쭉날쭉하다. 공식 문서는 "AI Studio에서 확인"하라고만 한다 [확인: 공식 문서가 숫자 미표기] https://ai.google.dev/gemini-api/docs/rate-limits · [2차] https://www.aifreeapi.com/en/posts/gemini-api-free-tier-rate-limits
- 1인 사용자의 관심 종목을 20~50개로 잡고, 규칙으로 걸러지지 않은 **공시 없는 헤드라인 클러스터**만 LLM에 보낸다고 하자. 그러면 **하루 수십 건** 수준이다. 무료 한도(Flash-Lite 수백 RPD)로 충분할 가능성이 높다. 배치는 여러 헤드라인을 한 요청에 묶는다.
- 무료 티어 입력은 제품 개선에 쓰일 수 있다는 점을 약관에서 확인한다(이번 조사에서 미확인). 공개 헤드라인만 보낸다.

### 7.3 LLM 추출 결과를 사실로 저장하기 전 검증 파이프라인 [추정]
1. **출력 스키마 고정**(pydantic): `{event_type ∈ 고정 enum, subject_alias, quote, numbers[], polarity_hint}`. enum 밖의 값이면 거부한다.
2. **원문 인용 필수**: `quote`가 원문(제목+요약)의 부분문자열이어야 한다(정규화 후 완전 일치). 실패하면 저장하지 않는다.
3. **숫자 대조**: `numbers[]`의 모든 값이 원문 토큰에 있어야 한다. LLM이 계산한 값(비율 등)은 받지 않는다. 계산은 `features`가 한다(공통 수용 기준 3).
4. **엔티티 해소**: `subject_alias` → `entity_alias`. 실패하면 `unresolved`.
5. **교차 확인**: 같은 사건 클러스터의 독립 매체 2곳 이상, 또는 공시·거래소 공지 매칭 → `status=verified`. 아니면 `unverified`.
6. **저장 규칙**: `unverified`는 **피처에 쓰지 않는다**. 화면에서는 "확인되지 않은 보도"로 구분 표시한다(원문 링크만).
7. **측정**: 매주 무작위 20건을 소유자가 라벨링해 정밀도를 기록한다. `event_type`별로 정밀도가 80% 미만이면 LLM 경로를 끈다.

이 절차는 이미 레포 규칙과 맞는다. `salt-forecast/.claude/rules/ontology.md` §7은 "LLM 추출은 confidence + 검토 전 unverified"라고 정하고 있다.

---

## 8. 결론 — 우리 앱 권장 설계

### 8.1 스키마 [추정]

**(a) `forecast.fact`에 kind 추가** (기존 구조 그대로: `observed_at`·`available_at`·`source`·`source_url`·`value`·`unit`·`currency`·`attrs`·`version`)

| 그룹 | kind |
|---|---|
| 실적 | `earnings_prelim`(KR), `earnings_8k`(US 2.02), `guidance_change` |
| 계약·사업 | `supply_contract`, `partnership`, `product_approval`(FDA 등), `clinical_readout` |
| 자본 | `equity_offering`, `convertible_issue`, `bonus_issue`, `capital_reduction`, `share_cancellation`, `buyback_acquire`(기존), `buyback_dispose`(기존), `buyback_trust_end`, `dividend_decl` |
| 지배구조·M&A | `merger`, `acquisition`, `split_off`, `share_exchange` |
| 위험 | `lawsuit`, `distress`, `market_warning`, `regulatory_action`, `hack_exploit` |
| 시장 구조 | `index_change`, `analyst_rating_change` |
| 코인 거래소 | `exchange_listing`(attrs: exchange, markets[KRW/BTC/USDT]), `exchange_delisting`, `exchange_caution_on`, `exchange_caution_off`, `supply_plan_change` |
| 코인 온체인·파생 | `unlock_executed`, `stablecoin_supply`(일별 값), `etf_flow`(일별 값), `funding_rate`, `open_interest` |
| 거시 | `macro_release`(CPI 실제·예상), `fomc_decision` |
| 뉴스 | `news_event`(LLM 경로, `attrs.status ∈ {verified, unverified}`, `attrs.quote`, `attrs.cluster_id`, `attrs.novelty`, `attrs.article_count`) |

공통 `attrs`: `polarity_prior ∈ {pos, neg, mixed}`(규칙표에서 부여. **판정이 아니라 통상 해석**), `rule_id`(어느 규칙이 분류했나), `surprise`(원자료만. 비율 계산은 features에서).

**(b) 새 테이블 `forecast.scheduled_event`** — 아직 일어나지 않은 일
`(id, kind, subject_id NULL, expected_at, expected_at_precision{day,hour,window}, announced_at, source, source_url, status{scheduled, happened, cancelled, moved}, version)`
- `announced_at`이 누수 방지 키다(피처는 `announced_at <= as_of`만).
- 일어나면 `fact` 행과 `happened`로 연결한다.

**(c) 새 테이블 `forecast.event_reaction_stats`** — 화면과 피처가 같이 읽는 통계
`(kind, market, window{pre20, d0_1, post20, h24, h72}, as_of, model_version, n, mean, q10, q25, q50, q75, q90, share_positive, worst_case_fact_ids[], best_case_fact_ids[])`
- 워크포워드로 `as_of`마다 **그 시점까지의 사건으로만** 계산한다.
- `worst_case_fact_ids`는 공통 수용 기준 1의 **"실패사례"** 를 공급한다.

**(d) 뷰 계약 추가**(`db-contract.md`): `v_symbol_catalysts(symbol, kind, polarity_prior, available_at, source_url, pre_car_5d, react_d0, stats_n, stats_q10, stats_q50, stats_q90)`. 컬럼을 바꾸면 SRV-REQ와 같은 PR로 한다.

### 8.2 분류 순서

```
원천 ─┬─ DART(B001/DS005, I001/I002)  ──► 코드/보고서명 규칙 ─► fact (verified)
      ├─ EDGAR 8-K items, Form 4       ──► item 코드 규칙      ─► fact (verified)
      ├─ 업비트/바이낸스 공지          ──► 제목 정규식         ─► fact (verified)
      ├─ 바이낸스 선물·DefiLlama·BLS·연준 ─► 구조화 필드        ─► fact / scheduled_event
      └─ 뉴스(Finnhub·GDELT·네이버 제목) ─► 중복제거·novelty ─► 공시 매칭?
                                              ├ 예 → 기존 fact에 기사 부착
                                              └ 아니오 → (감성 모델) + LLM 추출 → 인용검증 → news_event(unverified→verified)
```

### 8.3 화면 표현(공통 수용 기준 §6 준수) [추정]

**"사건 타임라인"** — 제목은 "호재/악재 타임라인"보다 중립적인 **"주요 사건"** 을 권한다.
- 행: 날짜 · 유형 칩(통상 해석이 호재 쪽이면 초록 윤곽, 악재 쪽이면 빨강 윤곽. **채움 색 없음**) · 한 줄 요약(원문 제목) · 원문 링크
- 보조 숫자: "공지 전 5일 +12.4%" · "공지 후 1일 −3.1%"(실측, 서버 계산)
- `unverified` 뉴스는 회색 + "확인되지 않은 보도"

**"이 유형 사건 뒤 과거 반응"** 카드 — 근거 · 과거 적중률 · 실패사례 3종을 모두 갖춘다.
- 근거: "업비트 KRW 마켓 신규 상장 공지 · 2026-09-17 09:48 · 원문"
- 분포: "같은 유형 **n=37**건, 공지 후 20일 초과수익 10~90% 구간 −28% ~ +41%, 중앙값 −4%, 양(+)으로 끝난 비율 43%"(예시 수치)
- 선반영 조건: "이 중 공지 전 5일 이미 +10% 넘게 움직였던 12건만 보면 …"
- 실패사례: 가장 크게 반대로 간 2건 링크
- 표본이 **n<10**이면 분포를 그리지 않고 "표본 부족"으로 표시한다
- 금지: "상승 예상", "호재이므로", 한 점 목표가, "~할 것" 같은 단정. 문장은 LLM이 **`event_reaction_stats` 숫자만 인용**해 쓴다

**예정 이벤트** — "다가오는 일정": FOMC·CPI·실적일·언락. 과거 같은 이벤트 전후 **변동성**(방향 아님) 분포만 보여 준다. 근거는 FOMC 뒤 1시간 BTC 절대수익률 확대 [2차].

### 8.4 단계별 슬라이스 [추정]

| # | 슬라이스 | 범위 | 완료 기준 |
|---|---|---|---|
| C1 | **공시 카탈리스트(규칙)** | DART DS005 36종 + I001/I002 제목 규칙 → fact kind. 정정 → version. EDGAR 8-K items 매핑 | 관심 종목 1년 백필. 규칙 미분류율을 기록. 누수 테스트(미래 오염) 통과 |
| C2 | **업비트 공지 수집** | 약관 위험 수용을 ADR 또는 `security-sources.md`에 기록한 뒤 진행. 10분 폴링, `first_listed_at` 사용, 제목 규칙 6종 | 2026년 상장·유의·상폐 공지 전건 분류. 수정본 버전 처리 |
| C3 | **반응 통계** | 이벤트 스터디 엔진(시장모형, 창 3개, 코인 시간창) + `event_reaction_stats` 워크포워드 | 유형별 n·분위수. 셔플 라벨 테스트 통과 |
| C4 | **화면 v1** | 서버 `v_symbol_catalysts` → BFF → 상세 화면 "주요 사건" + "과거 반응" 카드(소유자 전용, ADR-003) | 3종(근거·적중률·실패사례) 없으면 렌더 안 함 |
| C5 | **예정 이벤트** | `scheduled_event`: BLS ICS, 연준 표, Finnhub 실적 캘린더, 업비트 유통량 공지, 반감기 계산 | `announced_at` 누수 테스트 |
| C6 | **코인 파생·유동성 피처** | 펀딩비·OI 일일 적재(OI는 30일 보존이라 **가장 먼저 시작해야 손실이 적다**), 스테이블코인 공급 | 피처 추가 전후 워크포워드 pinball 비교. 개선이 없으면 제거 |
| C7 | **카탈리스트 피처 → LightGBM** | §3.1 피처 | 베이스라인 대비 커버리지·pinball이 개선될 때만 채택 |
| C8 | **뉴스 이벤트(LLM 보조)** | 중복 제거·novelty → 공시 매칭 → LLM 추출 + 인용 검증 → unverified/verified | 주간 20건 라벨 정밀도 ≥ 80%인 유형만 활성 |

**C6의 OI 적재는 C1과 병렬로 즉시 시작**할 것을 권한다. 이력이 30일만 남아서 늦게 시작할수록 복원할 수 없는 구간이 커진다 [확인: 30일 보존].

### 8.5 열린 질문(결정 필요)
1. 업비트 공지 비공식 엔드포인트 사용 여부. 약관 제10조의 "사전 승낙"을 요청할지, 위험을 수용할지.
2. KR-FinBert 라이선스 확인(미표기).
3. ETF 흐름 소스(Farside 웹 표 파싱 vs 발행사 CSV) 약관.
4. 토큰 언락: DefiLlama emissions-adapters 라이선스 확인 vs 수동 큐레이션.
5. `polarity_prior` 표를 누가 소유하나. 규칙 표는 코드(`salt-forecast`) 한 곳에 두고 화면은 서버가 전달한다(프론트 상수 금지 — 메모리 규칙 "보여 줄 대상·임계는 서버").

---

## 부록 A. 직접 확인한 호출(2026-09-23)
- `GET https://api-manager.upbit.com/api/v1/announcements?os=web&page=1&per_page=20&category=trade` → 200, `success:true`, `total_count:779`. 필드 `listed_at`, `first_listed_at`, `id`, `title`, `category`. per_page 40은 실패(20 이하 권장).
- `GET https://data.sec.gov/submissions/CIK0000320193.json` → `filings.recent.items` 필드에 `"2.02,9.01"` 등이 들어 있고 `acceptanceDateTime` 포함.

## 부록 B. 이번 조사에서 확인하지 못한 것
- 업비트 원화마켓 상장 효과를 다룬 학술 이벤트 스터디(최근 표본) — 찾지 못함 → C3에서 우리가 직접 측정한다.
- 네이버 검색 API 약관 원문(페이지 접근 불가).
- DefiLlama emissions-adapters 라이선스.
- Gemini 무료 티어의 정확한 RPD와 데이터 사용 조항.
- 배당 변경·국내 소송 공시의 국내 이벤트 스터디 수치.
