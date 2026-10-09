# Korea-specific signals for 1–20 trading-day volatility, tail risk, and direction (free, point-in-time)

Scope note: the coordinator asked us to rank signals by how much they would help the **existing** features: the forecast range card, coach judgment rules, sizing, risk budget, realized vol, and behavior mirror. That puts **volatility and tail ranges first** and direction last. All we have today is daily OHLCV from KIS. Research budget: 16 tool calls. Most academic sources were seen only as **abstracts or metadata**. Any claim about magnitude or out-of-sample results is unverified unless it says otherwise.

## Q0. Summary table: signal → evidence → free source → available_at → history → license → verdict

| Signal | Evidence (target, OOS?) | Free data source | available_at (leakage) | History | License | Verdict for vol/tails | Verdict for direction |
|---|---|---|---|---|---|---|---|
| **VKOSPI** (market IV) | Beats GARCH, BS-IV and RiskMetrics at forecasting KOSPI200 realized vol (Ryu 2012; Chun-Cho-Ryu 2019). It is biased, so it needs a calibration step. Out-of-sample forecast comparisons are reported in the abstracts. One master's thesis dissents (Choi 2010). | KRX data portal (data.krx.co.kr), index statistics. Not confirmed via KIS. | After the 15:45 close of KOSPI200 options. Safe to use as of T close for a T+1 forecast. | Index from 2009, back-calculated to 2003 (not verified this session) | KRX portal terms of use (not verified) | **Strong** for the market vol level. Feeds stock-level ranges only through beta or market-vol scaling | Weak |
| **Own-stock realized vol / OHLC range** (already in the pipeline) | Generic HAR/GARCH literature. Korea: past RV is "good but biased" (Chun et al. 2019) | KIS OHLCV (in hand) | T close | Full | Already in use | **Strong** (baseline) | n/a |
| **±30% daily price limit (since 2015-06-15)** | Structural change: limits widened from 15% to 30% (KRX). After the change, more stocks pass random-walk tests (Seddighi & Yoon 2018, suggestive). No Korea-specific post-2015 study of magnet effects was found. | KRX rules. Computable from OHLCV | Known ex ante | Regime break at 2015-06-15 | Public rule | **Strong as a constraint.** It truncates the daily tail, so tail models should cap at ±30% per day and drop pre-2015 data | No evidence |
| **Investor-type net buying (foreign/institutional/individual)** | Prior-day foreign and institutional net purchases predict next-day open-to-close returns (Korean study, 2003–2011, in-sample). Retail net-buying shows no short-term predictive power for KOSPI200 stocks (Ewha). Foreign flows engage in feedback trading and do not destabilize the market (Choe-Kho-Stulz 1999, 1996–97 sample, old). Pre-announcement foreign trading predicts earnings surprise (PEAD study). | KIS `inquire-investor` (FHKST01010900). KRX "Trading by investor" | KIS: "today's data is provided after market close." Treat as available at T close + some margin (e.g. 16:00 or later). Never use it for a forecast made at T close without a buffer. | KIS look-back depth unknown. KRX portal goes back years | KIS terms / KRX terms | No vol evidence found | **Weak** (old or in-sample; 1-day horizon) |
| **Short selling (daily volume / net short balance)** | Stock-level short selling relates negatively to returns and positively to skewness (2005–2016). Short-interest surprise (SUSIR) predicts the cross-section negatively (KAIST). Foreign short selling predicts short-run returns and does **not** raise volatility (SNU, 2006–2010). It predicts 1-month returns only for investment-grade firms (Wang 2023, PBFJ). | KRX data portal: short-selling trades and net short balance. KRX "short-selling daily brief" | Daily trades: after close. Balance: published with a lag (T+2 in practice, not verified this session). Store the actual publish date. | **Broken**: full ban 2023-11-06 to 2025-03-30, resumed 2025-03-31. Before that, only KOSPI200/KOSDAQ150 names were allowed from 2020-03 (to 2021-05) onward | KRX terms | Weak (skewness link only) | **Weak**. Regime breaks make walk-forward history short |
| **Margin debt (신용잔고) / forced liquidation (반대매매)** | No Korean study found that tests stock-level margin balance against future returns or volatility. Margin balance rises with the market (Kyunghyang). It is concentrated in semis and capital goods, and forced selling can amplify declines (sell-side commentary) | KRX/KOFIA statistics. Stock-level margin ratio appears on broker pages | Usually T+1 (not verified) | — | — | **No evidence** (plausible tail amplifier, untested) | No evidence |
| **KOSPI200 periodic rebalancing (June/Dec)** | Permanent price effect plus partial reversal. Anticipatory trading and a **volatility effect** around the effective date (Yun & Kim 2010, IRFA). Additions show positive CAR on news and announcement days and a negative reaction on the change day (Ewha thesis) | KRX index notices (announcement ~2 weeks before the effective day: the day after June/Dec options expiry) | Announcement date. The constituent list must be stored as of announcement | Many years | Public notice | **Weak to moderate** (event-window vol up; small affected set) | Weak |
| **Quad witching (2nd Thursday of Mar/Jun/Sep/Dec)** | No Korean study measuring it was found. News only describes it as "usually volatile" (Korea Herald; Edaily 2026-09-10) | Calendar (known ex ante) | Ex ante | — | — | **No evidence** (an anecdote, not an effect) | No evidence |
| **Preliminary earnings (잠정실적, DART)** | Market reaction to preliminary earnings is significant (CAU accounting study). Firms delay bad news to Friday, pre-holiday and after-hours (Kim 2021). Korean PEAD is comparable to the US. No study measured **volatility** around 잠정실적 | OpenDART `list.json` (pblntf_ty=I, detail I002 fair disclosure; filter report_nm for "(잠정)실적"). Free API key | `rcept_dt` is **date only, no time** (secondary source). Intraday vs after-close cannot be told from the API. Conservative rule: available from the T+1 open | OpenDART coverage from ~1999+ (not verified) | OpenDART public data terms | **Moderate by analogy** (generic earnings-vol literature). No direct Korean vol evidence | Weak (PEAD) |
| **Rights offering / CB issuance / major-shareholder stake change** | No Korea-specific short-horizon vol studies found this session | OpenDART major-event reports (주요사항보고서) API | Same date-only `rcept_dt` problem | — | — | No evidence found (gap) | No evidence found |
| **Market alerts (투자주의/경고/위험) and inquiry disclosure (조회공시)** | KRX's own analysis: after designation, gains slow or reverse. Politically themed stocks' price-change rate fell from 59.4% (5 days before an inquiry) to 1.3% (5 days after). In 21 investment-warning stocks (Nov 2024), the average post-designation return was -10.5% and 14 of 21 fell. No academic event study found; selection effects uncontrolled | KRX KIND market-alert listings | Designation is announced the prior day (designation criteria themselves are known, computable from OHLCV) | — | — | **Weak** (mechanical: no margin buying, 100% deposit, possible halt, so vol is likely to compress) | Weak (reversal) |
| **Retail attention (Naver search)** | Lagged Naver search predicts lower KOSPI returns 1 week ahead (Pyo 2017, index level). A FEARS index from Naver comes with lower returns that reverse in ~3 weeks plus a **short-lived vol increase** (Chae-Kim-Koo). Highly searched firms react more on announcement days, with less PEAD (Chae-Kim-Han 2020) | Naver DataLab API (free, relative index, rate limited) | Daily granularity. The index is **rescaled per query window**, so storing it point-in-time requires snapshotting | ~2016+ | Naver API terms | Weak (index-level, short-lived) | Weak |
| **Abnormal turnover (거래대금 급증)** | No Korea-specific source found this session. The generic attention literature (above) is consistent | Computable from KIS OHLCV (in hand) | T close | Full | — | Plausible / untested in Korea | Plausible reversal / untested |
| **Short-term reversal vs momentum** | Korean momentum profits are concentrated in the window carried over from a ~2-month reversal. Excluding the last 2 months greatly weakens momentum (Sim & Kim 2021, JDQS, OA). End-of-day intraday reversal is strongest in illiquid small caps (KAIST thesis, 2011–2020) | Computable from OHLCV | T close | Full | — | — | **Weak** for momentum. Short-term reversal plausibly present (see Q8) |

## Q1. Investor-type net buying and foreign ownership

### Takeaway
The Korean evidence on investor flows predicting returns is old, in-sample, or 1-day only. Retail net buying shows no short-term return predictability. No source linked flows to future stock volatility. The data is free through KIS, but **today's values only appear after the close**, so a forecast made at T close must not use day-T flows without an explicit time buffer.

### Cited Findings
- A Korean study on daily data from 2003 to 2011 finds that the prior day's net purchases by foreign and institutional investors have a significantly positive effect on the next day's open-to-close return. It is in-sample and has a 1-day horizon. — [Search summary of Korean study (earticle)](https://m.earticle.net/Article/A164764)
- Choe, Kho and Stulz (1999, JFE; data 1996-11-30 to end-1997) find that foreign investors showed positive feedback trading and herding before the crisis. Their sales were **not** followed by negative abnormal returns, and the market adjusted quickly. — [NBER w6661](https://www.nber.org/papers/w6661)
- Choe-Kho-Stulz (2005, RFS): foreign money managers pay more when buying and receive less when selling than domestic managers. This is a trading-cost finding. — [SUFE newsletter summary](https://academicnewsletter.sufe.edu.cn/info/355548)
- An Ewha study of KOSPI200 stocks finds that individual-investor buy and sell dominance variables have **no** short-term return predictability. — [Ewha repository](https://dspace.ewha.ac.kr/handle/2015.oak/183734)
- In Korea, foreign investors' trading before earnings announcements predicts the earnings surprise. — [IDEAS (Emerging Markets Finance & Trade 2021)](https://ideas.repec.org/a/mes/emfitr/v57y2021i12p3538-3564.html)
- KIS endpoint: GET `/uapi/domestic-stock/v1/quotations/inquire-investor`, tr_id `FHKST01010900`. It returns a list by date. Market code J (KRX) / NX (NXT) / UN (combined). KIS's official example notes say **"today's data is provided after market close."** — [AlgoLab blog (secondary)](https://algolab.co.kr/blog/kis-api-investor-frgn-orgn-net-buy-2026)
- The KRX data portal has a "Trading by investor" table (buy, sell, net buy by investor type). — [data.krx.co.kr](https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd?locale=en)
- An Edaily article published 15:33 on 2026-09-10 already reported market-level investor net buying. This suggests the market totals appear within minutes of the 15:30 close. — [Edaily](https://en.edaily.co.kr/news/eda202609105578)
- The KRX after-market (16:00–20:00) opened on 2026-09-14 and reports its own investor breakdown. Retail was 93% of turnover on day one. — [Digital Today](https://www.digitaltoday.co.kr/en/view/103299/krx-after-market-posts-1-8-trillion-won-turnover-on-first-day-retail-share-93-percent)

### Inferences
- Since 2026-09-14 there is an 16:00–20:00 after-market. A "daily close" value for flows or prices could therefore be revised after 15:30. Pin which session the KIS daily bar and the investor data cover (J vs UN), or vintages will mix.
- For sizing and vol ranges, flows have no documented value. For judgment rules, at most an explanatory "who is selling" line, not a scored signal.

### Gaps
- Official publication time for stock-level investor data (KRX/KIS), and whether values are revised after the after-market. Not found.
- How many trading days KIS `inquire-investor` returns. Not documented. The HTS limit of "max 200 days" at another broker is not evidence about KIS.
- No post-2015 out-of-sample study on flows → returns or vol was found. Foreign ownership change (보유비중) was not specifically researched.

## Q2. Short selling, short balance, ban and resumption

### Takeaway
Pre-ban Korean studies link short selling to lower future returns and higher skewness at the stock level, but the **2023-11 to 2025-03 full ban** plus the 2020-03 to 2021-05 partial regime makes usable walk-forward history very short, roughly 18 months since 2025-03-31. Verdict: weak, and do not build a scored rule on it yet.

### Cited Findings
- Short selling fully resumed on 2025-03-31 after about 17 months. It is the first all-stock resumption since March 2020. — [Ajunews](https://www.ajunews.com/view/20250331163839226); [newsis](https://www.newsis.com/view/NISX20250324_0003110387)
- Under the new system (NSDS central monitoring), institutions must submit stock-level balance data within **2 business days**. This is a reporting deadline, not necessarily the public release lag (January 2025 plan). — [MTN](https://news.mtn.co.kr/news-detail/2025010216364030917)
- KRX data-portal short-selling trade and net-short-balance data is "not reflected in real time." The KRX "short-selling daily brief" lists top stocks by balance and by trading value each day. The article cites a balance-disclosure threshold of "0.01% of issued shares or ₩1bn." (Caution: that figure is likely the *reporting* threshold. The public *disclosure* threshold was historically 0.5%. Unverified.) — [Ajunews](https://www.ajunews.com/view/20250331163839226)
- Short balance after resumption: KOSPI ₩7.07tn plus KOSDAQ ₩3.22tn as of 2025-06-10. KOSPI net short balance was ₩9.04tn as of 2025-07-09, up 131% since March. — [fnnews](https://www.fnnews.com/news/202506111536058618); [SBS Biz](https://biz.sbs.co.kr/amp/article/20000246381)
- Data from 2005-01 to 2016-03: short-selling variables relate negatively to firm-specific returns and positively to return skewness. — [KoreaScience](https://www.koreascience.or.kr/article/JAKO201623562837921.page)
- Short-interest-ratio surprise (SUSIR) predicts the Korean cross-section of returns negatively. — [KAIST](https://koasas.kaist.ac.kr/handle/10203/321904?mode=full)
- Foreign investors account for most short sales and act as contrarians. Their heavy short selling predicts short-run returns, and foreign short selling does **not** raise volatility (2006–2010). — [SNU S-Space](https://s-space.snu.ac.kr/handle/10371/119347?mode=full)
- Short selling predicts one-month returns for investment-grade firms but not speculative-grade ones (Wang 2023, PBFJ). — [Ajou repository](https://aurora.ajou.ac.kr/handle/2018.oak/33759?mode=full); [IDEAS](https://ideas.repec.org/a/eee/pacfin/v82y2023ics0927538x2300269x.html)
- Short sellers read firm-specific sentiment better than margin traders. Extreme sentiment predicts lower returns for shorted stocks (Park & Suh 2023). — [JED](https://jed.cau.ac.kr/archives/48-4/48-4-4.pdf)
- Aggregate short selling by foreign and individual investors rises after market declines, a momentum-like pattern that differs from the stock-level contrarian pattern. — [Ajou](https://aurora.ajou.ac.kr/handle/2018.oak/30985)

### Inferences
- The balance series has gaps over the ban, so any feature built on it needs an explicit "regime" flag. Mixing pre-2023 and post-2025 data assumes the same market structure, which is false because of NSDS and the new rules.
- For the range card, the most defensible use is none. At most it could be a tail-skew note, and only after ~2 years of post-resumption data.

### Gaps
- The exact public release lag of stock-level net short balance on the KRX portal (commonly cited as T+2) was **not confirmed by a primary source** this session. Verify on the KRX portal before use, and store the observed publish date.
- No post-resumption (2025+) study of short selling vs volatility.
- Securities lending balance (대차잔고): not researched. No source found.

## Q3. Margin debt (신용잔고), forced liquidation (반대매매), securities lending

### Takeaway
No Korean academic test of stock-level margin balance predicting returns or volatility was found. Commentary treats it as a tail amplifier on the way down. Verdict: no evidence.

### Cited Findings
- Margin loan balance hit a record ₩38.63tn on 2026-06-24, then fell to ₩27.40tn on 2026-08-04. Forced-liquidation amounts swung from ₩122bn (2026-07-31) to ₩31.5bn (2026-08-04). Margin balance "usually rises when the market rises." — [Kyunghyang](https://www.khan.co.kr/article/202608051749001)
- Margin lending is concentrated in capital goods and semiconductors, and forced selling could amplify declines in those sectors (sell-side commentary, 2025-11). — [Herald](https://www.heraldk.com/article/2025110821054038842)
- A KAIST master's thesis (2018) studies return predictability of short-selling and margin-trading strategies. Only the title was available. — [KAIST](https://koasas.kaist.ac.kr/handle/10203/265749)

### Inferences
- Margin balance is mostly a lagging reflection of past returns. For tail risk, the more useful version would be a stock-level margin ratio, which is not readily free point-in-time.

### Gaps
- Free point-in-time source for stock-level margin balance and its publication lag. Not verified.
- 대차잔고: no evidence collected.

## Q4. Program trading, KOSPI200 rebalancing, quad witching

### Takeaway
KOSPI200 constituent changes have documented price effects, partial reversal, and a volatility effect around the effective date (Yun & Kim 2010). Quad witching has **no** measured Korean effect, only news anecdotes. Neither is a strong driver of the 1–20 day stock-level range.

### Cited Findings
- Yun & Kim (2010, IRFA): permanent price effects plus partial return reversal for added and deleted stocks. Some evidence of anticipatory trading before the effective dates and a **volatility effect**. Abnormal returns persist after factor models. — [IDEAS](https://ideas.repec.org/a/eee/finana/v19y2010i4p258-269.html); [KAIST](https://dspace.kaist.ac.kr/handle/10203/93428)
- An Ewha thesis separates news, announcement, and change days. Additions show positive abnormal returns on news and announcement days and a negative reaction on the change day. Deletions show the opposite. Additions may be partly predictable before announcement. — [Ewha](https://dspace.ewha.ac.kr/handle/2015.oak/190664?mode=full)
- Deletion from KOSPI200: negative short-run abnormal return that later turns positive, consistent with price-pressure reversal (Ahn & Choi 2014). — [earticle](https://www.earticle.net/Article/A242883)
- Park & Lee (EFMA 2005 draft) find inclusion and exclusion volume effects insignificant except for special changes. This conflicts with Yun & Kim on volume. — [EFMA paper](https://www.efmaefm.org/0EFMAMEETINGS/EFMA%20ANNUAL%20MEETINGS/2005-Milan/papers/191-park_paper.pdf)
- Quad witching is described as "usually" causing volatile trading, with volatility arriving "a few days before." This is analyst opinion, not measured. — [Korea Herald](https://m.koreaherald.com/article/408322)
- 2026-09-10 witching day: heavy supply/demand volatility and over ₩2.5tn of foreign net selling, yet KOSPI held 7,000. — [Edaily](https://en.edaily.co.kr/news/eda202609105578)
- KOSPI200 futures listing was associated with higher spot volatility. This concerns listing, not expiry. — [UOS](https://pure.uos.ac.kr/en/publications/futures-trading-spot-market-volatility-and-market-efficiency-the-/)

### Inferences
- The rebalancing calendar is fully ex ante, and constituent lists are known at announcement. That makes them a cheap, leakage-safe event flag. The effect is concentrated in a small set of names around the effective date.
- Quad witching can be shown as a calendar fact, but it should not widen ranges without our own walk-forward test.

### Gaps
- No post-2015 study of rebalancing volatility. No study of program-trading volume as a predictor. No Korean expiry-day volatility study found. Searching 동시만기일 / 만기일 효과 on KCI could close this.

## Q5. Corporate events via DART (earnings, dividends, rights offerings and CBs, major-holder changes)

### Takeaway
Preliminary earnings move prices, and Korean firms time bad news for Friday, pre-holiday, and after-hours slots. No source measured realized-vol response in Korea. The binding practical problem is **timing**: OpenDART gives only the filing date, not the time.

### Cited Findings
- OpenDART `list.json` returns `rcept_dt` as **date only (YYYYMMDD)**, with no time. Suggested workaround: log first-seen time yourself. Preliminary earnings are found with pblntf_ty=I (exchange disclosure), detail I002 (fair disclosure), filtering report_nm for "(잠정)실적." Secondary source. — [AlgoLab](https://algolab.co.kr/blog/dart-preliminary-earnings-disclosure-bot-filter-2026)
- For backtests, use financial data only from the `rcept_dt` onward. — [AlgoLab](https://algolab.co.kr/blog/dart-opendart-financial-statement-api-lag-2026)
- Market reactions to preliminary earnings announcements are significantly positive and preempt the reaction at the shareholders' meeting. — [CAU](https://scholarworks.bwise.kr/cau/handle/2019.sw.cau/32268?mode=full)
- Sources conflict on whether preliminary earnings disclosure is compulsory (Yoo & Chun 2023) or voluntary (the CAU accounting study). — [IDEAS JRFM 2023](https://ideas.repec.org/a/gam/jjrfmx/v16y2023i12p504-d1295008.html); [CAU](https://scholarworks.bwise.kr/cau/handle/2019.sw.cau/32268)
- Bad earnings news tends to be released on Fridays, before holidays, and after market hours (Kim 2021). — [IDEAS EMFT 2021](https://ideas.repec.org/a/mes/emfitr/v57y2021i12p3538-3564.html)
- More-searched firms react more strongly on announcement day and show weaker PEAD (Chae, Kim, Han 2020). — [IDEAS Sustainability](https://ideas.repec.org/a/gam/jsusta/v12y2020i22p9358-d443168.html)

### Inferences
- Because the time is missing and bad news clusters after hours, the leakage-safe convention is that any filing dated T affects the forecast from the **T+1 open**. An after-hours filing on T is then correctly attributed to T+1 movement.
- Scheduled earnings dates are not reliably announced in advance in Korea. Preliminary-earnings timing is firm-chosen, so "days to next earnings" cannot be known point-in-time except from a firm's past filing seasonality. That makes earnings mainly a **post-event** vol-regime flag, not a pre-event range widener.

### Gaps
- Korean realized-vol response around 잠정실적, 유상증자, CB, and stake changes. Not found.
- Point-in-time ex-dividend and record dates. Korea's dividend-procedure reform lets firms set record dates after the dividend decision. Not researched this session.
- Structure of `rcept_no` (believed to be date plus sequence number). Not verified.

## Q6. VKOSPI and KOSPI200 options

### Takeaway
VKOSPI is the best-documented Korea-specific vol predictor. It beats historical vol, GARCH-family, and BS-IV forecasts of KOSPI200 realized vol in most studies, but it is biased, so it needs a calibration step. It informs the **market** component of stock-level ranges.

### Cited Findings
- Chun, Cho & Ryu (2019): historical and implied vol both predict but are biased. **VKOSPI shows the best forecasting performance.** Adding GJR-GARCH may improve it. — [KAIST](https://koasas.kaist.ac.kr/handle/10203/247595?mode=full); [IDEAS Physica A](https://ideas.repec.org/a/eee/phsmap/v514y2019icp156-166.html)
- Ryu (2012): VKOSPI is slightly biased but outperforms BS-IV, RiskMetrics, and GJR-GARCH in forecasting future realized vol. It responds asymmetrically to positive and negative shocks. — [IDEAS EMFT 2012](https://ideas.repec.org/a/mes/emfitr/v48y2012i0p24-39.html)
- Choi (2010, master's thesis, 5-min RV) finds Heston-based IV best and VKOSPI weaker. Dissenting. — [Ewha](https://dspace.ewha.ac.kr/handle/2015.oak/205367?mode=full)
- VKOSPI explains reversals and drifts after large price moves in distribution-sector stocks (2004–2022). — [accesson JDS](https://accesson.kr/jds/v.21/5/101/36517?lang=en)
- The KOSPI200 put-call IV spread has forecasting power for KOSPI200 returns. — [earticle](https://www.earticle.net/Article/A243331)

### Inferences
- For the range card, scaling a stock's vol forecast by (VKOSPI / its recent average) or using VKOSPI as an extra regressor in a HAR-type model is well-motivated. Whether it helps **individual stocks** beyond their own RV needs our own walk-forward check.

### Gaps
- Free point-in-time VKOSPI history: KRX portal availability and licence terms not verified this session. Whether KIS serves VKOSPI was not checked. Free KOSPI200 options chain data was not checked.

## Q7. Retail attention, turnover spikes, market alerts

### Takeaway
Attention signals consistently point to **short-lived vol increases and later reversal**, but the evidence is index-level or event-window and mostly in-sample. KRX market-alert designations come with deceleration or reversal afterwards and mechanically restrict buying. Verdict: weak, though the designation flag is cheap and leakage-safe.

### Cited Findings
- Pyo (2017): negative contemporaneous link between KOSPI returns and Naver search. Lagged search predicts lower returns one week ahead. A "high attention = bearish" rule beat the benchmark (index-level). — [IDEAS EAER](https://ideas.repec.org/a/ris/eaerev/0327.html)
- Naver DataLab FEARS index: lower same-week returns that reverse in about 3 weeks, a **short-lived rise in volatility**, and flight to safety, driven by individuals. — [earticle](https://www.earticle.net/Article/A302022)
- KRX's own analysis: after market alerts and inquiry disclosure requests, gains slow or reverse. A definitive answer to the inquiry stabilizes prices more than a non-definitive one. Politically themed stocks' price-change rate fell from 59.4% to 1.3% (5 days before vs 5 days after). — [Newstomato](https://newstomato.com/ReadNews.aspx?no=1114319)
- In 21 investment-warning stocks (Nov 2024), the average post-designation return was -10.50%, and 14 of 21 fell. Small sample. — [Dailian](https://www.dailian.co.kr/news/view/1427011)
- Investment-warning stocks have margin buying banned and a 100% deposit requirement, and further surges can trigger a halt. — [SBS Biz](https://biz.sbs.co.kr/amp/article/20000278147); [MyDailyByte](https://www.mydailybyte.com/post/투자경고제도-sk하이닉스-2512)
- In 2026 KRX discussed refining designation criteria, including excess return vs the index and excluding mega caps, after an SK hynix designation. — [MTN 2026-04](https://news.mtn.co.kr/news-detail/2026040714535874944)

### Inferences
- Since the designation criteria are price-based and public, a "would be designated" flag can be computed from OHLCV point-in-time. That also gives the coach an honest explanation ("restrictions apply").
- A turnover spike (거래대금 급증) is computable from KIS data. Generic literature supports it as an attention proxy, but **no Korean source was collected**.

### Gaps
- No academic event study of 투자경고 → subsequent realized vol. No Korean study on turnover spikes → vol.
- Naver DataLab gives relative indices rescaled per query, so point-in-time storage requires daily snapshots. API limits not verified.

## Q8. Short-term reversal vs momentum (relevant to crypto-validated coach rules)

### Takeaway
Korean momentum is weak and largely an artifact of a ~2-month reversal carryover. Excluding the last two months substantially weakens it. Trend or momentum judgment rules validated on crypto should be **re-validated, not ported**, on Korean stocks.

### Cited Findings
- Sim & Kim (2021, JDQS, CC BY 4.0): Korean momentum profits are concentrated when the reversal window is about 2 months. Excluding the past 2 months greatly weakens momentum. The term structure comes from a carryover of 2-month return reversal. — [Emerald JDQS](https://emerald.com/insight/content/doi/10.1108/JDQS-02-2021-0005/full/html)
- KOSPI intraday (809 stocks, 2011–2020): no first-30-minute momentum, but a last-hour reversal. The reversal is stronger in low-volume, illiquid, small-cap stocks and is linked to liquidity provision. Master's thesis. — [KAIST](https://koasas.kaist.ac.kr/handle/10203/294938)
- Variance-ratio tests: KOSPI showed mean aversion before 1997 and weak mean reversion after. KOSDAQ shows weak mean reversion. Old. — [accesson JDS](https://www.accesson.kr/jds/v.21/5/101/50998)
- After the 2015 widening to ±30%, more stocks follow a random walk (Seddighi & Yoon 2018, 2012–2017, "suggestive"). — [AJEER](https://asianonlinejournals.com/index.php/AJEER/article/view/259)
- The ±30% limit took effect on 2015-06-15. The previous limit was 15% (from 1998-12-07). — [KRX Daily Price Limits](https://global.krx.co.kr/contents/GLB/06/0602/0602010201/GLB0602010201T5.jsp)
- Market commentary (2026-07): "the trend is no longer your friend as the KOSPI momentum trade unwinds." Opinion only. — [FXStreet](https://www.fxstreet.com/analysis/the-trend-is-no-longer-your-friend-as-the-kospi-momentum-trade-unwinds-202607170527)

### Inferences
- At the 1–20 day horizon, a short-term reversal (1-week to 1-month losers bounce, winners fade) is more consistent with the Korean evidence than trend following, especially for illiquid KOSDAQ names. Any coach rule should therefore have its hit rate measured on Korean data separately, with a ±30% limit and a 2015-06-15 start.
- Daily ±30% limits truncate realized tails. Daily-return distributions and range models fitted on crypto (no limits) will be miscalibrated for Korean tails unless they are capped per day. Multi-day compounding of limit-up or limit-down runs is still possible.

### Gaps
- No post-2015 Korean study of 1-week / 1-month reversal profits specifically was retrieved. No Korean price-limit magnet-effect study after 2015 was found (Du, Liu & Rhee 2006 exists only as a citation).
