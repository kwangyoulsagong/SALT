# Research E — 한국 주식 단기 예측 가능성 · 최신 AI 방법 (2024–2026 중심)

작성일 2026-11-13. 대상 지평: 1시간 ~ 5거래일. 데이터 전제: 일봉 · 5분봉, 뉴스 제목, DART 공시 제목, 프로그램 매매, 투자자별 순매수.

## 0. 읽는 법 · 한계

- **등급**
  - `VERIFIED-PRIMARY` — 논문 본문 · 초록 페이지 · 발행기관 원문을 직접 열어 확인한 것. (PDF 는 로컬에서 텍스트를 뽑아 줄 단위로 확인한 것과, 초록 페이지를 WebFetch 로 연 것 두 종류다. 앞의 것은 "PDF 본문 확인", 뒤의 것은 "초록 확인"으로 적었다.)
  - `SECONDARY` — 검색 요약 · 언론 보도 · 다른 논문의 인용 · 토론 슬라이드로만 본 것. 숫자를 근거로 쓰기 전에 원문 대조가 필요하다.
  - `NOT-FOUND` — 찾았으나 원문을 못 열었거나, 해당 주제의 연구 자체를 찾지 못한 것.
- 인용문은 도구 제약으로 대부분 125자 이내의 짧은 조각이다. 초록 확인 건은 요약 모델을 거쳤으므로 조사 · 띄어쓰기가 원문과 다를 수 있다. PDF 본문 확인 건의 숫자는 표에서 직접 읽었다.
- **가장 큰 한계**: 한국 근거의 대부분은 **월 단위** 포트폴리오 정렬이다. 1시간~5일 지평을 직접 다룬 한국 연구는 매우 적다(§A-9). 아래 "6개 신호"의 효과 크기는 월 단위 수치를 그대로 옮긴 것이며, 1~5일 지평의 크기는 **직접 검증해야 하는 가설**이다.
- 열지 못한 것: Chen·Kelly·Xiu 본문(SSRN 403), Cakici 외 본문(초록만), Eom 외 VI 논문(MDPI 403 · Berkeley 호스트 없음), Aboody 외(Springer 인증 리다이렉트), KDI 스쿨 · SNU 저장소(로딩 화면만), KCMI 자기주식 보고서 원문.

---

## A. 한국 시장 예측 가능성

### A-1. 투자자별 순매수와 이후 수익률

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| A1-1 | 개인은 역추세, 기관은 추세추종. 개인 순매수 상위 종목은 이후 시장을 밑돈다 | 매월 직전 20거래일 수익률 5분위 · 순매수 비율 상위 20% 종목의 1 · 3 · 6개월 누적 초과수익률. 개인 상위 종목: 코스피 1~3개월 시장 하회 → 6개월 양(+), **코스닥은 모든 지평에서 하회**. 기관 · 외국인 상위 종목은 보유기간이 길수록 개선. 지수 상승 뒤 개인 순매수는 **다음 거래일 정점 뒤 빠르게 소멸**. 본문 텍스트에 초과수익률 수치는 없고 그림에만 있다 | 홍지연, 「국내 주식시장의 투자자별 매매행태와 주가 움직임」, 자본시장포커스 2026-21호 https://www.kcmi.re.kr/publications/pub_detail_view?syear=2026&zcd=002001016&zno=1942&cno=6865 | 2026 | VERIFIED-PRIMARY (원문 페이지 · 수치는 그림이라 미확인). KDI 요약 페이지는 날짜를 10.26, KCMI 페이지는 10.19 로 적는다 |
| A1-2 | 거래량 급증일(20일 평균의 5배 초과)에 **기관 · 외국인 순매수 강도(시총 대비)가 높을수록** 이후 CAR 가 높고, 개인은 평평하다 | 2020–2024, KRX 전 종목, 독립 사건 26,604건. Day+20 CAR: 기관 Q4 **+9.85%** vs Q1 −1.37% / 외국인 Q4 +7.19% vs Q1 +1.60% / 개인 Q4 +0.74%. Day+50: 기관 Q4 +12.12%, 외국인 Q4 +13.30%, 개인 Q4 +0.65%. 전체 표본 CAR Day+1 +2.15%, Day+5 +2.19%, Day+10 +2.33%. "a day when an individual stock's daily volume exceeds 5 times its past 20-day moving average volume" | Sungwoo Kang, arXiv 2512.14134v2 https://arxiv.org/html/2512.14134v2 | 2025 | VERIFIED-PRIMARY (본문 표 6 · 표 4). **주의**: 심사 전 프리프린트. 본문 안에서 숫자가 어긋난다(5.4절 스프레드 10.12%p vs 표 6 계산 7.47%p, 사건 수 26,604 vs 27,759). 거래비용 미반영. 사건일(Day 0) 당일 수익률 4~10% 가 이미 들어간 뒤의 CAR 인지 정의 확인 필요. 같은 저자의 다른 논문이 미래 참조로 철회됐다(A8-4) |
| A1-3 | 한국은 고거래량 프리미엄이 아니라 **저거래량 프리미엄**이 보고됐다 (A1-2 와 충돌) | "the post-event return of an abnormally low-volume stock is larger than that of an abnormally high-volume stock" | Chae & Kang, PBFJ 58 https://ideas.repec.org/a/eee/pacfin/v58y2019ics0927538x1930160x.html | 2019 | VERIFIED-PRIMARY (초록). 70개 구성 중 16개가 저거래량 프리미엄 유의 · 1개만 고거래량 유의라는 수치는 A1-2 논문의 재인용 → SECONDARY |
| A1-4 | 개인 심리는 횡단면 수익률 설명력이 없고, 개인의 단기 예측력은 정보가 아니라 유동성 공급에서 온다 | "individual investor sentiment has no significant explanatory power for cross-sectional stock returns" / "short-horizon return predictability of individual investors does not come from their private information" | Kim & Park, EMFT 51(S5) https://ideas.repec.org/a/mes/emfitr/v51y2015is5ps1-s20.html | 2015 | VERIFIED-PRIMARY (초록) |
| A1-5 | 단기 과열 → 반전 구간에서 기관은 대형주 충격을 뒤쫓고, 개인은 소형 승자주를 산다 | "institutional investors' chasing of return shocks at the overshooting point, particularly in the large-cap segment" | Onishchenko & Ülkü, IJFE 27(2) https://ourarchive.otago.ac.nz/esploro/outputs/journalArticle/Investor-types-trading-around-theshort-termreversal-pattern/9926494806001891 | 2022 | VERIFIED-PRIMARY (초록 · 표본 기간과 지평 숫자는 페이지에 없음) |
| A1-6 | 외국인 공매도가 단기 수익률을 예측한다 | 2006–2010 일별 공매도. "foreign short-sellers are contrarians, whose large short-selling predicts short-run future return" | Wang & Lee, PBFJ 32 https://econpapers.repec.org/RePEc:eee:pacfin:v:32:y:2015:i:c:p:56-75 | 2015 | VERIFIED-PRIMARY (초록 · 효과 크기 미확인) |
| A1-7 | 공매도의 1개월 뒤 수익률 예측력은 투자등급 기업에서만 | "we find predictability of short-selling trading in stock returns" | Wang, PBFJ 82 https://ideas.repec.org/a/eee/pacfin/v82y2023ics0927538x2300269x.html | 2023 | VERIFIED-PRIMARY (초록) |
| A1-8 | 프로그램 매매 → 수익률 방향은 약하다(수익률이 프로그램 순매수를 이끈다) | 2011 연구: 현물 · 선물 수익률 변화가 순 프로그램 매매를 이끌고 반대는 아님. 비차익 프로그램 증가가 변동성을 줄였다는 2004–2015 월별 연구 | 검색 요약만 | 2011 · 2015 | SECONDARY |
| A1-9 | 신용융자 잔고가 이후 수익률을 예측한다는 한국 실증 | 연구원 코멘트(신용거래자 거래빈도 3배 이상 · 수익률 낮음)만 확인, 예측력 검증 논문은 못 찾음 | — | — | NOT-FOUND |
| A1-10 | 국민연금 대여 중단(2018) 뒤 수익률 상승 없음 | "no increase in stock returns after the suspension" | Lee & Wang, JDQS 2022 (검색 요약) | 2022 | SECONDARY |

### A-2. 가격제한폭 · VI · 갭 · 시간외

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| A2-1 | ±30% 확대(2015-06-15) 뒤 상 · 하한가 빈도 급감 | 확대 전 1년 일평균 상한가 19종목 · 하한가 4.2종목 → 확대 뒤 1년차 상한가 6.1, 2년차 3.4(유가 1.2 · 코스닥 2.2), 하한가 0.3~0.4. 지수 일 변동성 0.8% · 1.1%(코스피 · 코스닥) → 1년차 1.0% · 1.4% → 2년차 0.7% · 1.0% | Ji & Yoon, JAFEB 7(4) 서론이 인용한 거래소 통계 https://koreascience.kr/article/JAKO202014862061210.pub?lang=ko | 2020 | VERIFIED-PRIMARY (논문 서론 확인 — 숫자 자체는 거래소 통계의 재인용. 논문에 1년차 기간 오기가 있다) |
| A2-2 | 확대 뒤 개별 종목이 랜덤워크에 더 가까워졌다 | 지수 + 60종목, 2012-01~2017-11, 분산비 검정. "The number of stocks following the random walk process increased under the 30% price limits regime" · 저자 스스로 "rather suggestive than definitive" | Seddighi & Yoon, AJEER 5(2) https://asianonlinejournals.com/index.php/AJEER/article/view/259 | 2018 | VERIFIED-PRIMARY (초록) |
| A2-3 | 정적 VI 는 가격발견엔 일부 기여, 가격안정은 해친다. 동적 VI 는 둘 다 양호 | 2015-06-15 전후 각 48거래일 · 1,937종목. "정적 VI는 가격발견에 일정 부분 공헌은 하지만 가격안정성은 크게 해치는 것으로 나타난다." | 안일찬 · 라성채 · 박종호 · 엄경식, 재무연구 30(2) https://www.earticle.net/Article/A304504 | 2017 | VERIFIED-PRIMARY (초록) |
| A2-4 | **VI 발동 뒤 수익률(반전 · 지속)** 의 크기 | Eom · Kwon · La · Park (JRFM 2022) 본문을 못 열었다(403). 검색 요약에는 발동 뒤 수익률 방향 수치가 없다 | https://www.mdpi.com/1911-8074/15/3/105 (열기 실패) | 2022 | NOT-FOUND |
| A2-5 | **상한가 다음 날 수익률** · 자석 효과의 2015년 이후 한국 실증 | 직접 다룬 논문을 한국어 · 영어 검색 모두에서 못 찾았다. Du · Liu · Rhee 의 자석 효과 연구는 2005년(±15% 시기) | — | — | NOT-FOUND |
| A2-6 | 전월 **야간수익률(종가→시가)** 이 높은 종목은 다음 달 수익률이 낮다 | 1998–2018. 상위 10% − 하위 10% **월 −1.566% (t = −2.39)**. CAPM 조정 뒤 상위 포트폴리오 −1.317% (t = −2.69), 스프레드 −1.726%. FF-4 조정 뒤 −1.359% (t = −2.81), 스프레드 −1.570%. Fama-MacBeth 계수 −0.372 (t = −2.39, 모멘텀 · 유동성 · 단기 반전 통제). 야간수익률은 6개월 이상 지속(High−Low 0.193%, t = 15.10). "금월 CTO가 높은 종목일수록 해당 종목의 주가가 과대평가" | 천용호, 아태비즈니스연구 11(4) https://koreascience.kr/article/JAKO202013150643330.pdf | 2020 | VERIFIED-PRIMARY (PDF 본문 확인) |
| A2-7 | 야간수익률과 주간수익률은 음의 관계, 개인은 야간수익률 반대로 매매 | "Trades by individual investors respond negatively to overnight returns" | "How do investors react to overnight returns? Evidence from Korea", FRL 2023 — 페이지 404 | 2023 | SECONDARY (검색 요약) |
| A2-8 | 시가 과잉반응 → 장중 반전(외국인이 시가 과잉, 개인이 장중 반전) | Kwon 외 2015 | 검색 요약 | 2015 | SECONDARY |
| A2-9 | 한국의 시장 수준 장중 모멘텀(첫 30분 → 마지막 30분)은 약하다 | "There is weak evidence of the momentum effect in South Korea" (ETF 자료) | Limkriangkrai · Chai · Zheng, PBFJ 80 https://ideas.repec.org/a/eee/pacfin/v80y2023ics0927538x2300152x.html | 2023 | VERIFIED-PRIMARY (초록) |
| A2-10 | 시간외 단일가의 수익률 예측력 | 못 찾음 | — | — | NOT-FOUND |

### A-3. 반전 · 모멘텀 · 52주 고가 · MAX · 테마주

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| A3-1 | 한국 개별 종목은 모멘텀이 아니라 **반전이 지배적** | 1983–2023. "portfolios based on individual stock momentum strategies exhibit a reversal effect" / "reversal effects are dominant" | Kang · Ryu · Webb, Investment Analysts Journal 54(4) https://nisc.com/products/abstracts/38749/momentum-and-reversal-effects-in-the-korean-stock-market | 2025 | VERIFIED-PRIMARY (초록) |
| A3-2 | 통상의 12-2 모멘텀은 한국에서 유의하지 않고, **1개월 반전이 크다** | 1999-01~2021-02, 월 약 658종목. JT(12,2) 월 0.276% (t = 0.85). 최근 2개월 제외 (12,7) 0.525% (t = 2.11). **1개월 반전 FF5 알파 월 1.275% (t = 3.22)**, 2개월 반전 0.514% (t = 1.99) | Sim & Kim, JDQS 29(3) https://emerald.com/insight/content/doi/10.1108/JDQS-02-2021-0005/full/html | 2021 | VERIFIED-PRIMARY (본문 표) |
| A3-3 | MAX(복권형) 효과: 직전 달 일별 최대 수익률이 큰 종목은 다음 달 부진 | 2000-01~2020-12. 고−저 MAX 10분위 동일가중 **월 −2.08% (t = −5.01)**, 3요인 알파 −2.00% (t = −4.61), 가치가중 −1.80% (t = −3.28). 고평가 5분위 안에서 −2.58% (t = −6.58), 저평가 종목에서는 유의하지 않음. 개인 거래 비중 70–87% 는 선행연구 재인용 | Goh & Kim, JDQS 32(2) https://emerald.com/insight/content/doi/10.1108/JDQS-09-2023-0031 | 2024 | VERIFIED-PRIMARY (본문 표) |
| A3-4 | MAX 효과는 투자심리가 낮은 시기 뒤에 두드러진다 | Byun · Jeon · Kim, Applied Economics 55(3) | 검색 요약 | 2023 | SECONDARY |
| A3-5 | 52주 고가: 근거가 엇갈린다 | (가) 52주 고가 모멘텀이 JT 모멘텀보다 우수(JKDAS 23(4), 2021) (나) q-요인 통제 시 유의하지 않음(KAIST 석사 2018) | 검색 요약 | 2018 · 2021 | SECONDARY |
| A3-6 | 52주 고가 근처에서 호실적 PEAD 가 더 강하다 | "among positive earnings stocks, PEAD is pronounced when they are near 52-week highs" / "individual investors' buying pressure around earnings announcement is concentrated on stocks far from 52-week highs" | Goh & Jeon, PBFJ 44 https://ideas.repec.org/a/eee/pacfin/v44y2017icp150-159.html | 2017 | VERIFIED-PRIMARY (초록) |
| A3-7 | 정치 테마주: 선거 기간 급등 → 선거 전후 급락 | 16~19대 대선, 후보 9명 · 107종목 중 70종목 이상 급등. 평균 CAR: 선거 5일 전 −1.14%, 전일까지 −6.47%, 선거 뒤 첫 거래일 −2.00%(당선 −0.19% · 낙선 −3.91%), **선거 뒤 5거래일 −7.70%**. 회차별 5일 CAR: +0.20% / −24.29% / −2.80% / −9.59%. 거래소(2017-04-11): 손실 투자자의 99.6% 가 개인, 평균 손실 77만원 | 남길남, 자본시장연구원 이슈보고서 17-04 https://www.kcmi.re.kr/report/report_view?report_no=727 | 2017 | VERIFIED-PRIMARY (원문 페이지) |
| A3-8 | 한국 46개국 ML 횡단면 연구의 결론: 예측력은 모멘텀 · 반전 · 가치 · 규모 같은 단순 요인에서 나온다 | "The algorithms extract predictability mainly from simple yet popular factor types" | Cakici 외, JEDC 155 https://ideas.repec.org/a/eee/dyncon/v155y2023ics0165188923001318.html | 2023 | VERIFIED-PRIMARY (초록 · 한국이 46개국에 포함되는지는 미확인) |
| A3-9 | 저변동성 이상현상의 한국 단기 지평 근거 | 직접 확인한 것 없음(Pyo & Lee 2018 은 KOSPI200 변동성 예측 + 포트폴리오) | 검색 요약 | 2018 | SECONDARY |

### A-4. 실적 · 공시 사건

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| A4-1 | 한국 PEAD 는 **개인이 실적 반대 방향으로 매매한 종목에서만** 나타난다 | "PEAD exists only for those stocks that individuals trade in the opposite direction to earnings news" / "the magnitudes of PEAD are greater for those stocks that are more intensely sold" | Eom · Hahn · Sohn, PBFJ 53 https://econpapers.repec.org/RePEc:eee:pacfin:v:53:y:2019:i:c:p:379-398 | 2019 | VERIFIED-PRIMARY (초록 · 크기 수치 미확인) |
| A4-2 | 한국 PEAD 는 사건일 · 이익 서프라이즈 정의에 민감하다(애널리스트 예측 기준이면 사라진다) | "no PEAD has been found both on the date of the shareholders' meeting" (애널리스트 예측 기준) / "the PEAD can be changed according to the method of measuring the unexpected earnings" | 김형순, 아태비즈니스연구 9(4) https://koreascience.kr/article/JAKO201823965854148.page | 2018 | VERIFIED-PRIMARY (초록) |
| A4-3 | 한국 PEAD 의 크기는 미국과 비슷(2000년 이후) | Eom · Hahn · Sohn 2011 발표문 | 검색 요약 | 2011 | SECONDARY |
| A4-4 | **수주(단일판매 · 공급계약) 공시: 당일 · 다음 날 고점 뒤 하락(과잉반응)**, 공시 전 비정상 상승 증거 없음 | "누적비정상수익률평균은 공시일 혹은 공시 다음 날 최고를 기록한 후 가격이 하락하는 것으로 나타나 과잉반응" / "공시일 이전에 주가가 비정상적으로 상승한 통계적 증거는 발견하지 못하였다." 초록에 표본 수 · CAR 수치 없음 | 「단일판매공급계약 공시의 주가 반응」, JKDAS 23(2) https://scholar.kyobobook.co.kr/article/detail/4010028244090 | 2021 | VERIFIED-PRIMARY (초록) |
| A4-5 | 같은 공시에서 **사전 유출은 코스닥이 더 크고, 2015년 규제 뒤 줄었다** (A4-4 와 부분 충돌) | 2012–2016. "information leakage is more likely to occur in the KOSDAQ market rather than the KSE market" / "we observe the reduction of the size of information leakage after the regulatory change" | 「수시공시와 자율공시간 정보의 사전유출 비교」, 경영연구 32(4) https://scholar.kyobobook.co.kr/article/detail/4010026048564 | 2017 | VERIFIED-PRIMARY (초록 · 수치 없음) |
| A4-6 | 공시는 **분 단위로 반영된다** — 특허권 취득 공시 뒤 1분 CAR 0.92%, 시장가로 뒤따르면 손실 | "특허권취득공시후1분뒤평균0.92%의누적초과수익률이유의하게발생" / "시장가로매수매도하는전략은음(-)의수익률을실현" (1분 VWAP, 유가증권시장) | 이종욱 · 김종윤, 경영과 정보연구 35(3) https://www.koreascience.kr/article/JAKO201634347491168.pdf | 2016 | VERIFIED-PRIMARY (PDF 본문 확인) |
| A4-7 | 자기주식 취득 공시의 평균 CAR +4.13% | 2024 ~ 2026-09-28, 유가증권시장 282건(280건이 주가 안정 · 주주가치 · 임직원 보상 목적). 창(window) 길이는 요약에 없음 | 자본시장연구원 「최근 상장기업 자기주식 취득 공시의 특징과 시장 반응」(2026-10-08) — KDI 요약 https://eiec.kdi.re.kr/policy/domesticView.do?ac=0000207699 | 2026 | SECONDARY (원문 미확인) |
| A4-8 | 자사주 소각 공시 뒤 20거래일 초과수익률 2026년 +6.0%, 2025년 +4.6% (710건) | 증권사 리서치 | 검색 요약 | 2026 | SECONDARY |
| A4-9 | 밸류업 공시 기업의 2024년 평균 수익률 4.5% vs 미공시 −16.9% | 거래소 백서. **사건연구가 아니라 단순 비교**(선택 편향) | 언론 보도 | 2025 | SECONDARY. 밸류업 공시의 CAR 사건연구 논문은 NOT-FOUND |
| A4-10 | 유상증자: 주주배정은 +1일 음(−), 제3자배정은 당일 양(+) | 검색 요약만. 2020년 이후 논문은 못 찾음 | — | — | SECONDARY |
| A4-11 | 잠정실적 공시의 장중 반응 속도 | 못 찾음 | — | — | NOT-FOUND |

### A-5. 뉴스 · 종목토론방 · 한국어 LLM

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| A5-1 | 한국어 뉴스 심리지수는 **시장 전체 수익률을 4~5거래일 양(+)으로 예측**하나 작고 빨리 사라진다. 월 단위는 1~2개월 무예측 · 3개월 음(−) | 2010-01~2025-03. "단기적으로는 심리 변화와 같은 방향으로 시장수익률을 통계적으로 유의하게 예측하였다." | 김민기, 자본시장연구원 이슈보고서 26-03 https://www.kcmi.re.kr/report/report_view?report_no=2229 | 2026 | VERIFIED-PRIMARY (원문 페이지 · 계수 크기 미확인) |
| A5-2 | 네이버 종목토론방 댓글로 **1시간 뒤** 방향 예측: 20종목 중 13종목만 50% 초과 | 20종목 · 6개월. "13개종목에서미래의주가이동방향을50%이상의정확도로예측" · 훈련 80% / 시험 20% 시간 분할. 거래비용 · 다중검정 보정 없음 | 김명진 외, 한국전자거래학회지 25(4) https://koreascience.kr/article/JAKO202034965718425.pdf | 2020 | VERIFIED-PRIMARY (PDF 본문 확인). 증거 강도는 약하다 — 우연 수준과 구분이 안 된다 |
| A5-3 | KR-FinBERT 종목토론실 감성을 넣으면 RMSE · MAE 가 개선 | "감성 점수가 있는 데이터의 평가 지표가 더 좋게 나와" · 수치 없음 · 수익률이 아니라 주가 수준 예측 | JKDAS 27(1) https://scholar.kyobobook.co.kr/article/detail/4010070472339 | 2025 | VERIFIED-PRIMARY (초록). 주가 수준 RMSE 는 예측력의 근거가 되지 못한다 |
| A5-4 | ChatGPT-3.5 로 네이버 제목 15만 건 감성: 시장 성과와 상관은 약함 | "The findings reveal weak correlations between sentiment and market performance" · ETF 전략은 시장 초과라고 주장(석사논문 · 누출 통제 설명 없음) | 김수지, 서강대 석사 https://dcollection.sogang.ac.kr/dcollection/srch/srchDetail/000000079223 | 2024 | VERIFIED-PRIMARY (초록) |
| A5-5 | **누출을 통제한(지식 컷오프 이후 · 시점 일치) 한국어 LLM 종목 수익률 예측 연구** | 동료 심사 논문을 찾지 못했다. Chen·Kelly·Xiu 의 16개 시장 · 13개 언어에 한국이 들어가는지도 확인 못 함 | — | — | NOT-FOUND — **공백이자 기회** |

### A-6. 한국 횡단면 ML

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| A6-1 | GBM 이 선형 모형보다 낫다 · 위험 · 가격 추세 · 유동성 변수가 중요 | 1987–2018(검색 요약 기준). GBM 헤지 수익 월 평균 **2.89%**, 연 샤프 **0.93**(중앙값 회귀). "a gradient boosting machine (GBM) is found to be better than a traditional linear model" | Noh · Jang · Yang, APJFS 52(2) https://scholarworks.sookmyung.ac.kr/item/a0ed24e7-35cf-440a-93c9-4588e0f54952 | 2023 | VERIFIED-PRIMARY (초록 · 거래비용 반영 여부 미확인) |
| A6-2 | 트리 계열이 우수 · 36개월 모멘텀이 핵심 예측 변수 | "we find that tree-based models" … "outperform other machine learning approaches" / "we consistently identify the 36-month momentum as the key predictor" | Kang · Ryu · Webb, Financial Innovation 11(1) https://ideas.repec.org/a/spr/fininn/v11y2025i1d10.1186_s40854-025-00870-0.html | 2025 | VERIFIED-PRIMARY (초록 · 성과 수치 없음) |
| A6-3 | LightGBM · GBRT 가 월 수익률 예측에서 최상 | Choi 외, J. Korean Statistical Society | 검색 요약 | 2023 | SECONDARY |
| A6-4 | **경고 사례**: 한국 투자자 수급 딥러닝 논문이 미래 참조로 철회 | 279만 관측 · 2,439종목 · 2020–2024. 철회 사유 "due to an implementation error that resulted in look-ahead bias (data leakage)". 철회 전 주장: 샤프 1.30 · 누적 272.6% | Sungwoo Kang, arXiv 2601.07131 https://arxiv.org/abs/2601.07131 | 2026 | VERIFIED-PRIMARY (arXiv 페이지) |

### A-7. 개인 비중 · 단타가 가격 형성에 주는 영향 (요약)

- 반전(A3-1 · A3-2), MAX(A3-3), 야간 과대평가(A2-6), PEAD 의 개인 역방향 매매(A4-1), 조회공시 급등의 개인 순매수(B′-3), 테마주 손실의 개인 집중(A3-7)이 **같은 방향**을 가리킨다: 개인의 주목 · 복권 선호 매수가 단기 과잉반응을 만들고 뒤이어 되돌려진다.
- 반대 근거: 개인은 유동성 공급자라 단기에는 소폭 초과수익을 얻는다(A1-4). A1-2 는 2020–2021(동학개미) 구간에서 개인 성과가 기관 수준이었다고 주장한다(프리프린트).

---

## B′. 뉴스보다 먼저 움직이는 가격 (선반영)

### B′-1. 발표 전 가격 · 거래량 상승

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| P1 | **한국: 악재(기업부정 풍문)는 공식 공시 수개월 전부터 반영된다** | 2004-01~2014-12, 202건(유가 38 · 코스닥 164), 사건일 = 거래소가 공식 정보로 제공한 날, 시장조정 모형. **CAR(−120,−1) −34.25%, CAR(−60,−1) −25.55%, CAR(−20,−1) −14.76%, CAR(−5,−1) −6.66%, 공시 당일 AR −7.66%** (모두 1% 유의). 코스닥: CAR(−20,−1) −17.29%, (−60,−1) −28.90%. 유가: CAR(−20,−1) −3.83%(유의하지 않음). 개인은 공시 전 순매수 CNPR(−10,−1) +0.41%, 기관은 −0.37% 순매도. "a significant fall of the stock price starts before the online disclosure" | Posang Lee, J. Korea Society of Computer and Information 21(1) https://www.koreascience.or.kr/article/JAKO201606050645997.pdf | 2016 | VERIFIED-PRIMARY (PDF 본문 표 2 · 3 확인) |
| P2 | 한국: 수주 공시는 **코스닥에서 사전 유출이 더 크고** 2015년 미공개정보 규제 뒤 줄었다 | A4-5 와 같음 | 위 A4-5 | 2017 | VERIFIED-PRIMARY (초록) |
| P3 | 한국: 반대 결과 — 수주 공시 전 비정상 상승의 통계적 증거 없음 | A4-4 와 같음 | 위 A4-4 | 2021 | VERIFIED-PRIMARY (초록) |
| P4 | 한국: 미공개정보 이용은 거래소 통보 사건의 과반 | 2025년 통보 98건 중 **미공개정보이용 58건(59.2%)**, 부정거래 18건(18.4%), 시세조종 16건(16.3%). 코스닥 66건(67.3%) · 코스피 28건(28.6%). 사건당 평균 부당이득 24억원(전년 18억원, +33.3%), 혐의자 사건당 16명. "공개매수 관련 정보 이용이 지속되는 가운데" | 한국거래소 「2025년도 불공정거래 심리실적 및 주요 특징」(2026-03-11) 보도 https://www.kukinews.com/article/view/kuk202603110082 | 2026 | SECONDARY (거래소 보도자료의 언론 보도) |
| P5 | 한국: 공개매수 발표 전 급등 사례 | 2023년 한 사례: 발표 전 10거래일 +31%, 거래량 23만 → 59.5만 주. 2024년 한 코스닥 사례: 발표 전일 +18.85% | 언론 보도 | 2023–2024 | SECONDARY (사례일 뿐 통계가 아니다) |
| P6 | 미국: 합병 대상 주가는 발표 12거래일 전부터 유의하게 오른다 | Keown & Pinkerton (1981): (−25,−1) 13.3% vs 발표 수익 12 — 교과서 표 재인용 | 검색 요약 | 1981 | SECONDARY |
| P7 | 미국: 합병 사전 상승은 **1980년대 중앙값 약 10% → 2010년 이후 2%** 로 줄었고, 내부자거래 규제 강화를 통제하면 추세가 사라진다 | "The median target run‐up declines from approximately 10% in the 1980s to 2% after 2010." | Dutordoir 외, Financial Management 50(2) https://ideas.repec.org/a/bla/finmgt/v50y2021i2p487-518.html | 2021 | VERIFIED-PRIMARY (초록) |
| P8 | 미국: 실적 발표 주간에 주가가 평균적으로 오르고(발표 프리미엄), 과거 발표기 거래량이 큰 종목에서 가장 크다 | "On average, stock prices rise around scheduled earnings announcement dates." / "Stocks with high past announcement period volume earn the highest announcement premium" | Frazzini & Lamont, NBER WP 13090 https://www.nber.org/papers/w13090 | 2007 | VERIFIED-PRIMARY (초록 · 숫자 없음) |
| P9 | 미국: FOMC 발표 전 24시간에 S&P500 이 평균 49bp 오른다 | "since 1994, the S&P500 index has on average increased 49 basis points" · t 통계량 4.5 초과 · 1980–1993 은 20bp | Lucca & Moench, NY Fed Staff Report 512 https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr512.html | 2011/2013 | VERIFIED-PRIMARY (PDF 본문 확인) |
| P10 | 한국: M&A · 유상증자 · 실적 발표 **전** 상승의 크기와 며칠 전부터인지 | 직접 다룬 한국 논문을 열지 못했다(SNU 석사논문은 로딩 화면만) | — | — | NOT-FOUND |

### B′-2. 뉴스 없는 이상 급등 · 거래량이 이후를 예측하나

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| P11 | 미국: 하루 · 한 주 거래량이 이례적으로 큰 종목은 다음 달 오른다 | "Return autocorrelations, firm announcements, market risk, and liquidity do not seem to explain our results." | Gervais · Kaniel · Mingelgrin, JF 56(3) https://ideas.repec.org/a/bla/jfinan/v56y2001i3p877-919.html | 2001 | VERIFIED-PRIMARY (초록) |
| P12 | **한국은 반대**(저거래량 프리미엄) · 다만 주체를 나누면 기관 · 외국인 주도 급증은 이어진다는 주장 | A1-3 · A1-2 | 위 | 2019 · 2025 | 위와 같음 |
| P13 | **한국: 뉴스 없이 급등 → 조회공시 답변이 "미확정(검토 중)"이면 이후 10일 CAR +6%(급락은 −6%), "중요 정보 없음"이면 이후 유의한 변화 없음** | 2005–2009 유가증권시장, 497건(급등 436 · 급락 61). "we observe 10-day CAR of -6% following the inquiry after plunge and +6% following the inquiry after jump" / "individual investors are the main driving force behind the stock price jump or plunge as net buyers" | 박진우 · 박명일, 재무연구 25(1) https://www.earticle.net/Article/A238207 | 2012 | VERIFIED-PRIMARY (초록) |
| P14 | 한국: 투자경고 · 단기과열 지정 뒤 수익률의 학술 실증 | 거래소 자체 평가("상승폭 둔화 또는 하락 반전")와 단일 사례 보도만 있다. 2025년 투자경고 지정 72건(전년 44건) | 언론 보도 | 2022–2025 | SECONDARY (거래소 자기 평가) · 학술 논문은 NOT-FOUND |
| P15 | 발표 전 옵션 · 이상 거래량의 예측력(한국) | 못 찾음 | — | — | NOT-FOUND |

### B′-3. "소문에 사서 뉴스에 판다" — 사전 상승이 크면 발표 뒤 반전인가

| # | 주장 | 숫자 · 인용 | 출처 | 연도 | 등급 |
|---|---|---|---|---|---|
| P16 | 미국: 직전 12개월 수익률 상위 1% 종목은 실적 발표 전 5일 +1.58%, 발표 뒤 5일 −1.86% (시장 조정) | Aboody · Lehavy · Trueman, RAST — Springer 본문 열기 실패, 수치는 2차 요약 | https://link.springer.com/article/10.1007/s11142-009-9104-9 (인증 리다이렉트) | 2010 | SECONDARY |
| P17 | 한국: 수주 공시는 당일 · 다음 날 고점 뒤 하락 | A4-4 | 위 | 2021 | VERIFIED-PRIMARY (초록) |
| P18 | 한국: 정치 테마주는 사건(선거) **전에** 이미 꺾이고 뒤에도 내린다 | A3-7 (전일까지 −6.47%, 뒤 5일 −7.70%) | 위 | 2017 | VERIFIED-PRIMARY |
| P19 | 미국: LLM 이 본 뉴스의 초기 반응은 거의 다 즉시 반영되고, 남는 표류는 1~2일 · 소형주 · 악재에 집중 | 초기 반응(매매 불가): 긍정 +1.27% · 부정 −1.79%(야간 뉴스). 표류: 첫 거래일 34bp, 다음 날 19bp | Lopez-Lira & Tang, arXiv 2304.07619v6 https://arxiv.org/pdf/2304.07619v6 | 2025 | VERIFIED-PRIMARY (PDF 본문 확인) |
| P20 | 한국: 사전 상승 크기를 조건으로 한 발표 뒤 수익률(반전 vs 지속) 직접 검정 | 못 찾음 | — | — | NOT-FOUND — 앱이 직접 재야 하는 것 |

### B′-4. 선반영을 재는 법

- **표준 측정**: 사건일 0 기준 시장조정(또는 시장모형) 누적초과수익률 `CAR(−5,−1)`, `CAR(−20,−1)`, `CAR(−60,−1)` 과 같은 창의 비정상 거래량. P1 이 이 방법 그대로다(시장조정 모형을 쓴 이유: 한국 시장 검정력이 가장 우수하다는 선행연구 인용).
- **선반영 비율**: `runup / (runup + 발표일 AR)`. P1 의 전체 표본으로 계산하면 `CAR(−20,−1) −14.76%` 대 `당일 −7.66%` → 20일 창 기준 약 66% 가 공시 전에 반영됐다(이 비율은 본 보고서의 계산이고 논문이 제시한 값이 아니다).
- **조건부 검정**(한국에서 아직 없는 것, P20): 발표 뒤 `CAR(+1,+5)` 를 `runup 5분위 × 뉴스 방향(LLM 점수) × 시장(코스피 · 코스닥)` 으로 나눠 본다. 귀무가설은 "runup 이 클수록 발표 뒤 수익률이 낮다(이미 반영)".
- **사건일 오염 주의**: 한국은 뉴스 → 조회공시 → 공시 순서가 흔하다. "첫 공개 시각"을 공시 접수 시각이 아니라 **가장 이른 뉴스 · 풍문 시각**으로 잡지 않으면 runup 이 과대 측정된다(A4-2 가 사건일 선택에 따라 PEAD 가 생기고 사라짐을 보였다).

---

## B. 최신 글로벌 방법 (2024–2026)

| # | 연구 | 지평 | 효과 크기 | 비용 반영 | 표본 밖 설계 | 감쇠 | 출처 · 등급 |
|---|---|---|---|---|---|---|---|
| G1 | Lopez-Lira & Tang, "Can ChatGPT Forecast Stock Price Movements?" (v6, 2025-10) | 뉴스 뒤 1~2거래일 | GPT-4 야간 뉴스 롱숏 **일 34bp(비용 전)**, 샤프 2.97(야간) · 2.63(장중). 초기 반응 방향 적중률 약 90%(매매 불가 구간) | 왕복 5bp 수익 유지, 10bp 누적 100% 초과(샤프 1.29), **20bp 면 손실**. "A transaction cost of 20 bps round-trip makes the strategy unprofitable" | 지식 컷오프 이후 제목만 사용 | **샤프 6.54(2021Q4) → 3.68(2022) → 2.33(2023) → 1.22(2024-01~05)**. 종가-종가 전략은 2024년에 유의하지 않음 | https://arxiv.org/pdf/2304.07619v6 · VERIFIED-PRIMARY (PDF 본문) |
| G2 | He · Lv · Manela · Wu, "Chronologically Consistent LLMs" (ChronoBERT · ChronoGPT) | 다음 거래일 · 일 리밸런싱 | 롱숏 샤프: ChronoBERT 4.80, ChronoGPT 4.92, Llama 3.1 4.90, BERT 4.18, FinBERT 3.86, StoriesLM 3.42. ChronoBERT vs Llama p = 0.315 | 본문에 비용 언급 없음 | 연도별 체크포인트(전년도 모델)로 실시간 예측 · 2008-01~2023-07 · Dow Jones Newswire | 미보고. 결론: "Lookahead bias is model and application-specific" — 이 과제에서는 편향이 작다 | https://arxiv.org/html/2502.21206v3 · VERIFIED-PRIMARY |
| G3 | Yan 외, "DatedGPT" | 뉴스 기반 수익률 | 미래 참조 없는 설정 연 샤프 3.20 · **미래 참조 프리미엄 1표준편차당 26.4bp**(1% 유의) | 초록에 없음 | 2013–2024 연도별 컷오프 모델 12개 | — | https://arxiv.org/abs/2603.11838 · VERIFIED-PRIMARY (초록) |
| G4 | Gao · Jiang · Yan, "Detecting Lookahead Bias in LLM Forecasts" (LAP) | 검정 절차 | "LAP is materially positive throughout the in-sample period" / "collapses essentially to zero right after the training-data cutoff" | — | 날짜만 묻는 회상 질의로 누출 확률 추정 → 정확도 회귀의 교호항 | — | https://arxiv.org/abs/2512.23847 · VERIFIED-PRIMARY (초록) |
| G5 | Glasserman & Lin, 종목명 익명화 | 뉴스 감성 | 표본 내에서는 익명화 제목이 오히려 우수(주의 분산 효과 > 미래 참조) | — | "Out-of-sample, look-ahead bias is not a concern but distraction remains possible." | — | https://arxiv.org/abs/2309.17322 · VERIFIED-PRIMARY (초록) |
| G6 | Chen · Kelly · Xiu, "Expected Returns and Large Language Models" | 다음 날(뉴스 9시~9시 → 다음 9시~9시 수익률) | 16개 시장 · 13개 언어. 대형주 10bp · 소형주 20bp 일 비용 가정 시 **순 연 샤프 약 1.5** | 예(토론자 슬라이드 기준) | LLM 임베딩 + 릿지 | 토론자 지적: 예측력이 개장 직후에 몰려 있을 수 있다("front-loaded") | 본문 SSRN 403. 토론 슬라이드 https://jacobslevycenter.wharton.upenn.edu/wp-content/uploads/2024/09/ExpectedReturnAndLLM_Discussion_SophiaZhengziLi_NoPause.pdf · **SECONDARY**(슬라이드 PDF 는 직접 확인) |
| G7 | Wu 외, "Aligning Multilingual News for Stock Return Prediction" | 뉴스 기반 | 영 · 일 Bloomberg 기사 14만 쌍 정렬, 도쿄 약 3,500종목 2012–2024. 정렬 기반 롱숏이 전문 분석보다 샤프 10% 높음 | 초록에 없음 | — | — | https://arxiv.org/abs/2510.19203 · VERIFIED-PRIMARY (초록). 한국 없음 |
| G8 | FINSABER (Li · Kim · Cucuringu · Ma) | LLM 타이밍 에이전트 · 20년 | 종목 4개 × 2004–2024: FinMem 샤프 TSLA 0.641(보유 0.630), NFLX 0.293(0.622), AMZN 0.188(0.551), MSFT 0.203(0.461). 종합 설정 무작위 5종목: 보유 0.315 · FinMem −0.253 · FinAgent 0.094 | 주당 $0.0049 · 최소 $0.99 | 상장폐지 포함 과거 S&P500 구성 | "LLM-derived alpha is likely a methodological artefact of narrow, biased evaluations." | https://arxiv.org/html/2505.07078v5 · VERIFIED-PRIMARY |
| G9 | StockBench | 일 1회 매매 · 4개월(2025-03-03~06-30, 82거래일) | DJIA 상위 20종목. 보유 기준 +0.4% · 낙폭 −15.2%. 최고 Kimi-K2 +1.9%, Qwen3 +2.5% | **미반영**: "do not model trading costs, slippage, or liquidity limits" | 학습 컷오프 이후 기간 | "all LLM agents underperform the passive baseline during the downturn but outperform it in the upturn" | https://arxiv.org/html/2510.02209v2 · VERIFIED-PRIMARY |
| G10 | INVESTORBENCH | 에이전트 벤치마크 | 초록에 성과 수치 없음 | — | — | — | https://arxiv.org/abs/2412.18174 · VERIFIED-PRIMARY (초록만) |
| G11 | Jensen · Kelly · Pedersen, "Is There a Replication Crisis in Finance?" | 월 | 요인 대부분 재현 · 13개 테마 · "work out-of-sample in a new large data set covering 93 countries" | — | 베이지안 요인 재현 모형 | 감쇠 수치는 초록에 없음 | https://research.cbs.dk/en/publications/is-there-a-replication-crisis-in-finance/ · VERIFIED-PRIMARY (초록) |
| G12 | Cakici 외, "Machine learning goes global" | 월 | 46개 시장 · 148 특성. 모형 결합이 특히 효과적 · 성과는 기업 규모와 최근 정보에 의존 · 국가 간 차이는 상장사 수와 고유위험(차익 한계) | 초록에 없음 | — | — | https://ideas.repec.org/a/eee/dyncon/v155y2023ics0165188923001318.html · VERIFIED-PRIMARY (초록) |
| G13 | Avramov · Cheng · Metzker, "Machine Learning vs. Economic Restrictions" | 월 | 딥러닝 수익은 차익이 어려운 종목 · 시기에서 나오고, 초소형 · 부실주 · 고변동 시기를 빼면 크게 줄며, 합리적 비용에서 더 나빠진다 | 예 | — | — | Management Science 69(5), 2023 · **SECONDARY**(검색 요약) |
| G14 | Rahimikia · Ni · Wang, "Re(Visiting) Time Series Foundation Models in Finance" | 일 초과수익률 · 94개국(검색 요약) | "off-the-shelf pre-trained TSFMs perform poorly in zero-shot and fine-tuning settings" · 금융 데이터로 처음부터 사전학습한 모형은 개선 | 초록에 수치 없음 | — | — | https://arxiv.org/abs/2511.18578 · VERIFIED-PRIMARY (초록) |
| G15 | 선택적 · 컨포멀 예측의 금융 적용 | 1 · 5일 비정상수익 방향 | FinAbstain(arXiv 2607.24875, 2026-07): 컨포멀 보정 + 기권. 횡단면 주식 수익률에 컨포멀 · 기권을 적용한 2024–2025 논문은 못 찾음 | — | — | — | SECONDARY (검색 요약) · 횡단면 적용은 NOT-FOUND |
| G16 | Bali 외 ML 횡단면 · FinBen | — | 열어 보지 않았다 | — | — | — | NOT-FOUND (미조사) |

**B 의 공통 결론**
1. 뉴스 제목 기반 LLM 신호의 지평은 **1~2거래일**이고 소형주 · 악재에 몰린다(G1).
2. 비용 전 수치는 크지만 왕복 20bp 에서 사라진다(G1). 비용을 안 넣은 벤치마크(G9)는 근거로 쓰기 어렵다.
3. 감쇠가 관측된다 — 4년 사이 샤프가 1/5 수준(G1).
4. 미래 참조 편향은 "항상 치명적"도 "항상 무시 가능"도 아니다: G2 는 작다고, G3 는 26.4bp/σ 라고 본다. 따라서 **자기 과제에서 직접 재야 한다**(G4 의 LAP 검정).
5. LLM 에이전트(매매 결정까지 맡기는 방식)는 길고 넓은 평가에서 단순 보유를 못 이긴다(G8 · G9).

---

## C. 종합

### C-1. 한국 주식에서 근거가 가장 좋은, 검정 가능한 신호 6개 (1시간~5일)

> 효과 크기는 원 논문의 지평(대부분 월) 수치다. 1~5일 크기는 사전 등록한 전진 시험으로 재야 한다.

| # | 신호 · 조건 | 방향 | 근거의 효과 크기 | 필요한 데이터 | 근거 | 검정 설계 |
|---|---|---|---|---|---|---|
| S1 | **단기 반전** — 직전 1주~1개월 급등 종목(특히 개인 순매수 · 코스닥 · 소형) | 되돌림 | 1개월 반전 FF5 알파 월 1.275% (t = 3.22) · 12-2 모멘텀은 유의하지 않음 | 일봉 · 투자자별 순매수 | A3-1 · A3-2 · A1-1 · A1-5 | 직전 5 · 20일 수익률 5분위 × 개인 순매수 부호 → 이후 1 · 3 · 5일 초과수익률 |
| S2 | **야간 갭 과열** — 종가→시가 수익률이 지속적으로 높은 종목 | 이후 부진 · 당일 장중 반전 | 상위−하위 10분위 월 −1.566% (t = −2.39) · FF-4 −1.570% | 일봉 시가 · 종가(5분봉이면 장중 경로까지) | A2-6 · (A2-7 · A2-8 은 SECONDARY) | 당일 갭 · 최근 20일 평균 갭 5분위 → 시가→종가, 이후 1 · 5일 |
| S3 | **복권형 · 테마 급등(MAX)** — 최근 일 최대 수익률이 크고 고평가 · 개인 집중 | 이후 부진 | 고−저 MAX 월 −2.08% (t = −5.01) · 고평가군 −2.58% · 정치 테마 사건 뒤 5일 CAR −7.70% | 일봉 · 테마 분류 · 투자자별 순매수 | A3-3 · A3-7 | 최근 5 · 20일 MAX 분위 → 이후 5일. 테마 사건일 전후 CAR |
| S4 | **수급 주체 × 거래량 급증** — 거래량이 20일 평균의 5배 초과인 날, 기관 · 외국인 순매수 강도(시총 대비) 상위 vs 개인 주도 | 기관 · 외국인 주도는 지속, 개인 주도는 평평 | 기관 Q4 Day+20 CAR +9.85% vs 개인 Q4 +0.74% (프리프린트 · 비용 전 · 내부 수치 불일치) | 일봉 거래량 · 투자자별 순매수 · 시가총액 | A1-2 · A1-1 · 반대 근거 A1-3 | 사건일 **다음 날 시가 진입** 기준으로 +1 · +5일 재계산. 같은 정의로 A1-3 의 저거래량 프리미엄과 대조 |
| S5 | **공시 · 뉴스 당일 반응의 되돌림과 잔여 표류** — 수주 공시는 당일 · 다음 날 고점 뒤 하락. LLM 점수 기준 악재 · 소형주는 1~2일 표류 | 호재 공시 급등은 되돌림 · 악재는 지속 | 한국 수주 공시: 크기 수치 미확인(방향만). 미국 LLM 표류: 일 34bp(비용 전), 20bp 비용에서 소멸, 샤프 6.54 → 1.22 감쇠. 한국 공시 반영 속도: 1분 뒤 0.92% | DART 공시 제목 + 접수 시각 · 뉴스 제목 + 시각 · 5분봉 | A4-4 · A4-6 · G1 | 공시 유형별로 접수 뒤 첫 5분봉 종가 진입 → +1시간 · 당일 종가 · +1 · +3 · +5일 |
| S6 | **선반영 조건** — 뉴스 · 공시 전 `CAR(−5,−1)` · `CAR(−20,−1)` 이 큰가. 뉴스 없는 급등의 조회공시 답변 유형 | 선반영이 크면 발표 뒤 추가 수익 없음 또는 반전 · "미확정" 답변은 지속 · "중요 정보 없음"은 무반응 | 기업부정 풍문: 공시 전 20일 −14.76% · 60일 −25.55% · 당일 −7.66%(코스닥이 훨씬 큼). 조회공시 "미확정" 뒤 10일 CAR ±6% | 일봉 · 뉴스 · 공시 첫 공개 시각 · 조회공시 답변 본문 | P1 · P13 · P17 · P18 · P16(SECONDARY) | B′-4 의 조건부 검정. 한국 직접 근거는 없다(P20) — 앱의 고유 결과가 될 수 있다 |

**차점**: 외국인 공매도(A1-6 — 효과 크기 미확인) · 시장 수준 뉴스 심리 4~5일(A5-1 — 종목이 아니라 지수) · 52주 고가 근처의 호실적 표류(A3-6).

### C-2. 약하거나 서로 부딪히는 주장

1. **고거래량 프리미엄** — 한국은 저거래량 프리미엄이라는 동료 심사 결과(A1-3)와, 주체를 나누면 고거래량 프리미엄이 나온다는 프리프린트(A1-2)가 맞선다. 후자는 수치 불일치가 있고 같은 저자의 다른 논문이 누출로 철회됐다(A6-4).
2. **수주 공시 사전 유출** — 있다(A4-5, 코스닥 · 2015년 전)와 없다(A4-4)가 맞선다. 표본 기간 · 규제 변화가 원인일 수 있다.
3. **한국 PEAD** — 사건일과 서프라이즈 정의에 따라 생기고 사라진다(A4-2). 개인이 역방향으로 판 종목에만 있다(A4-1).
4. **52주 고가** — 지지(JKDAS 2021)와 기각(KAIST 2018)이 공존(A3-5).
5. **개인 순매수의 예측력** — 월 단위는 음(A1-1), 초단기는 유동성 공급 보상으로 소폭 양(A1-4), 2020–2021 은 예외(A1-2).
6. **종목토론방 · KR-FinBERT 예측** — 20종목 중 13종목 50% 초과(A5-2), 주가 수준 RMSE 개선(A5-3)은 예측력의 증거로 약하다.
7. **밸류업 공시 효과** — 공시 기업 4.5% vs 미공시 −16.9% 는 선택 편향이 섞인 단순 비교(A4-9).
8. **프로그램 매매 · 신용융자 · 시간외 단일가 · VI 발동 뒤 · 상한가 다음 날** — 예측력을 뒷받침하는 1차 근거를 확인하지 못했다(A1-8 · A1-9 · A2-4 · A2-5 · A2-10).
9. **LLM 에이전트가 시장을 이긴다** — 길게 · 넓게 평가하면 사라진다(G8), 비용 미반영(G9).
10. **뉴스 LLM 신호의 크기** — 비용 20bp 에서 소멸 · 4년에 걸쳐 감쇠(G1). 한국은 개인 비중이 높아 반응이 느릴 수 있다는 것은 **가설**이지 확인된 사실이 아니다(A5-5).

### C-3. 누출 없이 한국에서 예측력을 주장하기에 가장 방어 가능한 AI 방법 · 평가 설계

**방법 (권고)**
- LLM 은 **특성 추출기**로만 쓴다: 뉴스 · 공시 제목 → 임베딩 또는 방향 점수 → 릿지 · GBM 이 횡단면 순위를 낸다(G6 · G1 · G2 구조). 매매 결정을 LLM 에이전트에 맡기는 방식은 G8 · G9 때문에 방어하기 어렵다.
- 정형 특성은 C-1 의 여섯 개(반전 · 야간 갭 · MAX · 수급 × 거래량 · 공시 유형 · 선반영 CAR)를 함께 넣고, **텍스트가 정형 특성 위에 더하는 증분**을 보고한다. G12 가 말하듯 ML 의 예측력은 대개 단순 요인에서 나온다.

**심사자가 받아들일 평가 설계**
1. **컷오프 이후만 채점** — 사용 모델의 지식 컷오프 뒤 날짜만 시험 구간으로 쓴다(G1). 가능하면 시점 일치 모델(G2 · G3 계열)로 과거 구간을 보강하되, 한국어 지원 여부는 확인해야 한다(미확인).
2. **누출 직접 측정** — 종목명 익명화 대조(G5)와 LAP 검정(G4)을 같이 보고한다. 컷오프 전 · 후 성능 차이를 표로 낸다.
3. **사전 등록 전진 시험** — 가설 · 지평 · 임계 · 통과 기준을 먼저 적고 라이브로 쌓는다. 과거 검산은 보조 근거.
4. **매매 가능한 시점** — 뉴스 · 공시의 **첫 공개 시각**을 쓰고, 진입은 그 뒤 첫 5분봉 종가 또는 다음 날 시가. 초기 반응(매매 불가 구간)은 성과에서 뺀다(G1 이 둘을 분리해 보고). A4-6 처럼 1분 안에 0.92% 가 반영되므로 이 구분이 결과를 좌우한다.
5. **비용 민감도 표** — 왕복 0 · 10 · 20 · 30bp 와 한국의 실제 증권거래세 · 수수료 · 호가 스프레드를 넣은 순수익. 손익분기 비용을 적는다(G1 은 20bp).
6. **대조군** — (가) 섞은 뉴스 점수(블록 플라시보) (나) 특성 없는 기준(늘 많은 쪽) (다) 정형 특성만 (라) 단어 가방 · KR-FinBERT. LLM 이 (다) · (라) 위에 더하는 것만 주장한다.
7. **통계** — 날짜 군집 표준오차 또는 블록 부트스트랩, 순위 IC 와 적중률을 함께, 여러 지평 · 신호를 본 만큼 다중검정 보정.
8. **표본** — 시점 일치 유니버스(상장폐지 · 거래정지 · 관리종목 포함), 코스피 · 코스닥 · 규모 분위별로 나눠 보고(G13: 예측력이 차익이 어려운 종목에 몰리는지), 상 · 하한가 · VI 로 체결 불가인 날 처리 명시.
9. **감쇠 보고** — 연도 · 분기별 성과(G1 의 6.54 → 1.22 형식).
10. **선반영 통제** — 발표 전 `CAR(−5,−1)` 을 통제 변수로 넣어 "LLM 점수가 이미 오른 종목을 고른 것"과 구분한다(B′-4).
11. **기권 허용** — 신뢰가 낮은 날은 판단을 내지 않고 커버리지 대 정확도 곡선을 보고한다(G15 — 근거는 아직 SECONDARY).

---

## 부록 — 열어 본 URL 목록

**본문 · PDF 확인**
- https://arxiv.org/pdf/2304.07619v6 (로컬 텍스트 추출)
- https://arxiv.org/html/2502.21206v3 · https://arxiv.org/abs/2502.21206
- https://arxiv.org/html/2505.07078v5
- https://arxiv.org/html/2510.02209v2
- https://arxiv.org/html/2512.14134v2 · https://arxiv.org/abs/2512.14134
- https://koreascience.kr/article/JAKO202013150643330.pdf (로컬 텍스트 추출)
- https://www.koreascience.or.kr/article/JAKO201606050645997.pdf (로컬 텍스트 추출)
- https://www.koreascience.kr/article/JAKO201634347491168.pdf (로컬 텍스트 추출)
- https://koreascience.kr/article/JAKO202034965718425.pdf (로컬 텍스트 추출)
- https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr512.html (PDF · 로컬 텍스트 추출)
- https://emerald.com/insight/content/doi/10.1108/JDQS-09-2023-0031
- https://emerald.com/insight/content/doi/10.1108/JDQS-02-2021-0005/full/html
- https://www.kcmi.re.kr/report/report_view?report_no=727
- https://www.kcmi.re.kr/report/report_view?report_no=2229
- https://www.kcmi.re.kr/publications/pub_detail_view?syear=2026&zcd=002001016&zno=1942&cno=6865
- https://koreascience.kr/article/JAKO202014862061210.pub?lang=ko
- https://jacobslevycenter.wharton.upenn.edu/wp-content/uploads/2024/09/ExpectedReturnAndLLM_Discussion_SophiaZhengziLi_NoPause.pdf (토론 슬라이드 · 로컬 텍스트 추출)

**초록 페이지 확인**
- https://arxiv.org/abs/2603.11838 · https://arxiv.org/abs/2512.23847 · https://arxiv.org/abs/2309.17322 · https://arxiv.org/abs/2510.19203 · https://arxiv.org/abs/2412.18174 · https://arxiv.org/abs/2511.18578 · https://arxiv.org/abs/2601.07131
- https://scholarworks.sookmyung.ac.kr/item/a0ed24e7-35cf-440a-93c9-4588e0f54952
- https://ideas.repec.org/a/spr/fininn/v11y2025i1d10.1186_s40854-025-00870-0.html
- https://nisc.com/products/abstracts/38749/momentum-and-reversal-effects-in-the-korean-stock-market
- https://ideas.repec.org/a/eee/pacfin/v58y2019ics0927538x1930160x.html
- https://ideas.repec.org/a/mes/emfitr/v51y2015is5ps1-s20.html
- https://ourarchive.otago.ac.nz/esploro/outputs/journalArticle/Investor-types-trading-around-theshort-termreversal-pattern/9926494806001891
- https://econpapers.repec.org/RePEc:eee:pacfin:v:32:y:2015:i:c:p:56-75
- https://ideas.repec.org/a/eee/pacfin/v82y2023ics0927538x2300269x.html
- https://asianonlinejournals.com/index.php/AJEER/article/view/259
- https://www.earticle.net/Article/A304504 · https://www.earticle.net/Article/A238207
- https://ideas.repec.org/a/eee/pacfin/v80y2023ics0927538x2300152x.html
- https://ideas.repec.org/a/eee/pacfin/v44y2017icp150-159.html
- https://econpapers.repec.org/RePEc:eee:pacfin:v:53:y:2019:i:c:p:379-398
- https://koreascience.kr/article/JAKO201823965854148.page
- https://scholar.kyobobook.co.kr/article/detail/4010028244090 · https://scholar.kyobobook.co.kr/article/detail/4010026048564 · https://scholar.kyobobook.co.kr/article/detail/4010070472339
- https://dcollection.sogang.ac.kr/dcollection/srch/srchDetail/000000079223
- https://ideas.repec.org/a/bla/finmgt/v50y2021i2p487-518.html
- https://ideas.repec.org/a/bla/jfinan/v56y2001i3p877-919.html
- https://www.nber.org/papers/w13090
- https://research.cbs.dk/en/publications/is-there-a-replication-crisis-in-finance/
- https://ideas.repec.org/a/eee/dyncon/v155y2023ics0165188923001318.html

**2차 자료로만 본 것**
- https://eiec.kdi.re.kr/policy/domesticView.do?ac=0000207901 · https://eiec.kdi.re.kr/policy/domesticView.do?ac=0000207699
- https://www.kukinews.com/article/view/kuk202603110082

**열기 실패**
- https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4416687 (403)
- https://www.mdpi.com/1911-8074/15/3/105 (403) · cdar.berkeley.edu (호스트 없음)
- https://link.springer.com/article/10.1007/s11142-009-9104-9 (인증 리다이렉트)
- https://open.icm.edu.pl/... · https://www.econbiz.de/... · https://media.suub.uni-bremen.de/... (403 · 봇 차단)
- https://archives.kdischool.ac.kr/handle/11125/31123 · https://s-space.snu.ac.kr/handle/10371/175053 (로딩 화면만)
- https://scholar.xjtlu.edu.cn/... (404) · https://nlpecofin.web.ox.ac.uk/node/3041271 (사이트 폐쇄) · bohrium.com (봇 차단)
- https://www.kcmi.re.kr/report/report_view?report_no=2254 는 다른 보고서(개인투자자 해외투자)였다 — 본 보고서에 쓰지 않았다
