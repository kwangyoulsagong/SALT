# Korean equity microstructure & survivorship-free data for 1–4 week return-distribution forecasts

Research date: 2026-10-09. Facts are dated where possible. Many official KRX rulebook pages could not be fetched; where a fact rests on press/secondary sources, it is labeled.

## 1. Daily price limits (±30% since 2015-06-15): frequency, clustering, magnet effect

### Takeaway
KOSPI/KOSDAQ stocks, DRs, ETFs and ETNs have had a ±30% daily limit on the reference price (usually the prior close) since 2015-06-15 (±15% before). KONEX stayed at ±15%. After the widening, limit hits became rare: per KRX data cited by press, daily average limit-up names fell from 18.7 to 6.1 and limit-down from 4.1 to 0.3. Korean magnet-effect evidence exists but predates 2015. No post-2015 Korean study of limit-hit frequency was found.

### Cited Findings
- KRX widened the price limit from ±15% to ±30% for KOSPI/KOSDAQ shares, DRs, ETFs and ETNs effective 2015-06-15. KONEX shares kept ±15%. At the same time KRX introduced static VI and reworked circuit breakers. — [이투데이 2015](https://www.etoday.co.kr/news/view/1127429); [Crowe Korea news 2015-05-29](https://www.crowe.com/kr/news/news20150529_kr)
- One year after the change, KRX data cited by press showed the daily average number of limit-up stocks fell from 18.7 to 6.1, and limit-down from 4.1 to 0.3. The number of stocks moving more than ±15% was also lower than before. A 자본시장연구원 official commented that wider limits made "상한가 굳히기"-type manipulation harder. — [시사경제 2016 "가격제한폭 확대 1년…상한가 종목 3분의 1로"](https://www.sateconomy.co.kr/news/view/179588243542547)
- A Korean study comparing 50 trading days before and after the widening found trading activity rose, real friction fell, information friction rose, and total market friction did not change. — [earticle A303382](https://www.earticle.net/Article/A303382)
- Magnet effect on KRX (pre-2015 data, ±15% regime): Du, Liu & Rhee used KRX transaction and limit-order-book data and found significant acceleration in returns, volume, volatility, order flow and order type as a limit hit approached. Narrower limits showed higher acceleration. Upper-limit hits drew heavier volume and more market orders than lower-limit hits. — [Hitotsubashi WP 2005-17](https://hermes-ir.lib.hit-u.ac.jp/hermes/ir/re/13490/wp2005-17a.pdf); [Int'l Review of Finance 2009 (IDEAS)](https://ideas.repec.org/a/bla/irvfin/v9y2009i1-2p83-110.html)
- First day of the ±30% regime: no market-wide shock reported. — [서울신문 2015-06-15](https://m.seoul.co.kr/news/2015/06/15/20150615800079)
- New listings, since 2023-06-26: the listing-day limit is 60–400% of the IPO price, and the IPO price becomes the reference price directly. Previously the opening price was set in a 90–200% pre-open auction, followed by ±30%. From day 2, the normal ±30% applies. Press noted day-1 declines can reach −40%, beyond the normal −30%. — [이코노미스트 2023-06](https://economist.co.kr/article/view/ecn202306200029); [비즈워치 2023-06-26](https://news.bizwatch.co.kr/article/market/2023/06/26/0024); [fnnews 2023-06-25](https://www.fnnews.com/news/202306251818424814)

### Inferences
- Under ±30%, daily limit hits are rare events (single digits per day across about 2,500 names, under 0.3%/day). They are not negligible in small-cap KOSDAQ names or in theme or clearance-trading situations. Censoring matters mostly for the tails of small-cap distributions, not for the interior quantiles of 1–4 week intervals.
- A daily cap implies a mechanical bound on an h-day log return of h·ln(1.3) up and h·ln(0.7) down. For h=5 that is roughly +272% / −83%, and for h=20 it is far beyond any useful quantile. Truncation therefore binds only for 1-day horizons. For weekly/monthly horizons, clipping is harmless as a sanity bound but does not shape the distribution.
- Because of magnet effects and delayed price discovery, a limit-hit close is a censored observation of the "true" price. The next-day return is positively autocorrelated. Volatility estimated from close-to-close returns around limit hits is biased downward on the hit day and upward afterwards. Treating limit-close days as censored, or excluding them from vol-of-vol fitting, is a defensible choice.

### Gaps
- No post-2015 academic study was found with limit-hit frequencies by market (KOSPI vs KOSDAQ), clustering of consecutive limit days, or post-hit return continuation under ±30%.
- No 자본시장연구원 primary report was located. The 18.7→6.1 statistic comes from a press article citing KRX.

## 2. VI, circuit breakers, sidecar, halts, designations, 정리매매, auctions, after-hours

### Takeaway
Intraday VIs (dynamic 3%/6%, static 10%) convert a stock to a 2-minute call auction. They smooth intraday paths but barely affect daily close-to-close distributions. Market-wide circuit breakers (−8/−15/−20%) and sidecars fired at record frequency in 2026: 37 KOSPI sidecars and 7 circuit breakers in 2026 through mid-July. That makes 2026 a regime-shift period with fat tails for any window that includes it. 정리매매 has no price limit, runs as 30-minute call auctions, and usually lasts about 7 trading days. KRX launched an after-hours (after-market) session on 2026-09-14.

### Cited Findings
- **VI (KRX official, English page):**
  - Trigger price = reference ± reference × VI rate.
  - Dynamic VI uses the last execution price: 3% for KOSPI200 constituents and 6% for other KOSPI and all KOSDAQ names during continuous trading (09:00–15:20); 2% and 4% in the closing auction (15:20–15:30); 3% and 6% in the after-market (16:00–20:00).
  - Static VI uses the prior close before the open, then the last call-auction price. The rate is 10% for KOSPI200; the rate for others is in a footnote that could not be read.
  - A VI triggers a 2-minute call auction, extended if it triggers during an auction. Circuit breakers override VIs.
  - Exempt: newly listed stocks on listing day, issues scheduled for delisting (i.e., 정리매매), and temporarily overheated issues.
  - — [KRX Global VI page](https://global.krx.co.kr/contents/GLB/06/0602/0602020204/GLB0602020204T7.jsp)
- Secondary sources likewise give a static VI of ±10% from the reference price for all stocks, and dynamic VI of 3% (KOSPI200) and 6% (others/KOSDAQ). — [iter.kr](https://iter.kr/vi-발동-사이드카-서킷브레이커)
- Dynamic VI was adopted in 2014 and static VI in 2015. NXT (the alternative exchange) ran only dynamic VI as of 2025. — [아시아경제 EN 2025-04-03](https://view.asiae.co.kr/en/article/2025040315170045038)
- **After-hours market (new, 2026):** the first KRX after-hours trading day was 2026-09-14. That day saw 1,112 VI triggers after hours (KOSPI 228, KOSDAQ 884) versus 391 in the regular session (KOSPI 70, KOSDAQ 321). KRX applies the regular-session VI thresholds after hours. — [디지털투데이 2026-09-15](https://www.digitaltoday.co.kr/cn/view/103788/krx-after-hours-market-first-day-vi-triggered-1112-times-volatility-concerns); [Herald 2026 "VI triggers surge to 4 times regular-session rate"](https://biz.heraldcorp.com/article/10874639)
- **Circuit breakers (secondary sources):** levels 1, 2 and 3 trigger when the index falls 8%, 15% or 20% from the prior close and stays there for 1 minute. Levels 2 and 3 also require an additional ≥1% decline beyond the prior level. Levels 1 and 2 halt all trading for 20 minutes, then a 10-minute call auction follows. Level 3 closes the market for the day. — [KB Think](https://kbthink.com/investment/101/sidecar.html); [brunch](https://brunch.co.kr/@kid008/1116)
- **Sidecar:** program trading is halted for 5 minutes when KOSPI200 futures move ±5% for 1 minute, or KOSDAQ150 futures move ±6% (with KOSDAQ150 spot ±3%, per some sources) for 1 minute. — [KB Think](https://kbthink.com/investment/101/sidecar.html)
- **2026 frequency (dated 2026-07-16):** the KOSPI sidecar triggered 37 times in 2026, an annual record (prior record 26 in 2008), out of 97 all-time. By month: Feb 3, Mar 7, Apr 3, May 6, Jun 10, Jul 8 (through 16 Jul). By direction: 19 sell-side, 18 buy-side. Circuit breakers fired 7 times in 2026 (March, June, July), more than half of the 13 all-time. In July 2026, a sidecar or CB fired on 9 of 12 trading days. — [파이낸셜뉴스 2026-07-16](https://www.fnnews.com/news/202607161454213305)
- **정리매매 (pre-delisting clearance trading):** no price limit; 30-minute single-price call auctions (about 13 per day); usually about 7 trading days (sources say 5–15 days depending on case). Prices often collapse toward the minimum. — [fnnews 2025-09-02](https://www.fnnews.com/news/202509020945348809); [비즈워치 2022-08-31](https://news.bizwatch.co.kr/article/market/2022/08/31/0014); [비즈한국](https://bizhankook.com/articles/31540.html)
- Of 266 KOSPI+KOSDAQ stocks delisted after 2015-09-03, 163 had a 정리매매 period. About 20% (53) were merger or wholly-owned-subsidiary cases where holders received consideration, not −100%. — [AlgoLab 2026 survivorship article](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)

### Inferences
- Official close = closing call auction (15:20–15:30). VIs and the after-market do not change the daily close used for close-to-close returns. After-hours trades are, however, a new information channel: from 2026-09-14 the next-day open can gap on after-hours news more than before.
- For a forecast universe, exclude names in 정리매매 (no limit, call-auction only, deterministic decay) and names on the listing day (60–400% band). Flag names with active trading halts (거래정지): their "return" over a halt is realized as a jump at resumption and is not captured by a daily-vol model.
- 2026 is an unusually volatile regime (record sidecars and CBs). Rolling-window vol estimates fitted mostly on 2026 will be much wider than ones fitted on 2017–2025. Calibration and scoring should be checked by regime.

### Gaps
- Official KRX Korean rulebook pages (유가증권시장 업무규정 시행세칙) for 관리종목, 투자주의/경고/위험 designation criteria and their trading consequences (e.g., single-price trading for 투자위험 or 관리종목 in some cases; one-day halts on designation) could not be fetched or verified here.
- The static VI rate for non-KOSPI200 names is 10% per secondary sources but could not be read from the official table.
- The CB thresholds come from secondary sources, not the official rulebook.
- Dates of the seven 2026 circuit breakers were not given.
- Official KRX hours for the 2026 after-market are given as 16:00–20:00 in the KRX table; I did not confirm whether a pre-market session also exists.

## 3. Short-selling ban (2023-11 – 2025-03-30) and reopening

### Takeaway
Short selling was fully banned from November 2023 and fully reopened on 2025-03-31. Before the ban, only KOSPI200 and KOSDAQ150 names had been shortable since May 2021. That makes 2025-03-31 the first time in about 5 years that small and mid caps were shortable. Evidence from earlier Korean bans (2008, 2011) on volatility is mixed. No study of the 2023–25 episode was found.

### Cited Findings
- FSC decided on 2025-03-21 to fully resume short selling from 2025-03-31. KOSPI200 and KOSDAQ150 names resumed after 17 months; all other names after about 5 years. The ban history: a full ban from March 2020 (COVID); partial resumption for the 350 KOSPI200+KOSDAQ150 names in May 2021; a full ban again from November 2023 after the global-IB naked-shorting cases. The overheated-stock designation scheme was temporarily expanded through 2025-05-31. Securities-lending repayment was capped at 90 days (12 months with extensions), and the 대주 collateral ratio was cut from 120% to 105%. — [한국경제 2025-03-21](https://www.hankyung.com/article/2025032106066); [메트로서울 2025-03-21](https://www.metroseoul.co.kr/article/20250321500400); [경향 2025-02-24](https://www.khan.co.kr/article/202502241631011)
- Evidence from earlier bans is mixed. One study of the 2008 and 2011 bans found intraday volatility and VKOSPI rose during 2008–09 but fell during 2011. KDI School work found no evidence that the ban raised volatility or worsened liquidity. A paper in the Int'l J. Managerial Finance found higher return volatility and weaker price discovery, especially for stocks without derivatives. — [KDI School "Short sales restrictions and market quality"](https://archives.kdischool.ac.kr/handle/11125/41815); [IJMF "Regulatory overkill?"](https://www.emeraldinsight.com/insight/content/doi/10.1108/IJMF-12-2014-0191/full/html); [KDI School 2008 ban](https://archives.kdischool.ac.kr/handle/11125/30886)

### Inferences
- The 2023-11-06 → 2025-03-30 window and the 2020-03 → 2025-03 non-index window are a structural regime for small and mid caps (no shorting). A model fitted across this boundary may mis-estimate downside tails for KOSDAQ non-KOSDAQ150 names after reopening. At minimum, a regime dummy or a separate calibration check is warranted.

### Gaps
- No empirical study of the 2023–25 ban or the 2025 reopening's effect on volatility was found. The exact FSC ban start date (2023-11-06) is from background knowledge and was not re-verified in this session.

## 4. Corporate actions, dividends, and what 수정주가 does and does not handle

### Takeaway
Korean "수정주가" (adjusted price) as used by KRX-derived data and brokers adjusts for share-count events: splits, bonus issues (무상증자), rights issues (유상증자 권리락), capital reductions and mergers or consolidations. It generally does not adjust for cash dividends. It is therefore a price-return series, not total return. The 2023 dividend-procedure reform lets firms set the record date after the AGM, so ex-dividend days are no longer clustered at year-end for adopters.

### Cited Findings
- The purpose of 수정주가 is to give price continuity when rights change (권리락). Bonus or rights issues lower the price mechanically on the 권리락 date in proportion to the new shares. — [wikidocs 376431](https://wikidocs.net/376431); [MTN 2022 노터스 권리락](https://news.mtn.co.kr/news-detail/2022060317285710384)
- With unadjusted prices, stock-split suspension periods and before/after prices can be misread as a decline. Analyses over more than one day should use 수정주가. — [wikidocs 92123](https://wikidocs.net/92123)
- pykrx `get_market_ohlcv` returns prices adjusted to the last requested date by default; `adjusted=False` gives raw prices. — [pykrx GitHub](https://github.com/sharebook-kr/pykrx). Per a pykrx issue, the KRX source does not supply adjusted closes but does cover delisted stocks' closes, while Naver supplies adjusted prices but not delisted names. — [pykrx issue #89](https://github.com/sharebook-kr/pykrx/issues/89)
- **2023 dividend reform:** in January 2023 the FSC and Ministry of Justice announced that the voting-rights record date and the dividend record date can be separated, with the dividend record date set after the AGM ("선 배당액 확정, 후 배당기준일"), per a 상법 §354 interpretation. Standard articles were revised in February 2023. By 2023-03-29, 646 of 2,267 December-FY listed firms (28.5%) had amended their articles. Firms paying stock dividends must still set the record date before the AGM. — [FSC press release](https://www.fsc.go.kr/po010101/79358); [이투데이](https://www.etoday.co.kr/news/view/2235394); [메트로서울 2024-03-04](https://www.metroseoul.co.kr/article/20240304500073)
- Repo fact (internal): our KIS client calls `FHKST03010100` with `FID_ORG_ADJ_PRC: "0"`, which our FEATURE-011 spec (sourced to the official KIS examples) says means **수정주가** (1 = 원주가). — `salt-server/src/market/infrastructure/KisClient.ts:252`; `pm/requirements/specs/in-progress/FEATURE-011-kr-stock-kis.md:188`

### Inferences
- Cash-dividend ex-dates show up as negative price returns in 수정주가. Korean dividend yields are about 2% on average and higher for banks, holding companies and preferred shares. A one-day drop of that size matters for weekly interval coverage on ex-date weeks of high-yield names, and for back-scoring. With the 2023 reform, ex-dates for adopters move from the last trading day of December to roughly March/April. A dividend-event calendar from OpenDART is needed to flag them.
- Adjusted series are rewritten backwards whenever a new corporate action occurs. Bars stored server-side from KIS with adjustment = 0 therefore become inconsistent after a split or bonus issue unless the history is re-fetched. Store raw prices plus an adjustment-factor table, or re-pull the adjusted window after each detected event. A day-over-day jump in the overlapping history between two pulls is a cheap detector.
- Rights offerings (유상증자) adjust the price by the theoretical ex-rights formula. That is an approximation, and the realized dilution effect is not neutralized.

### Gaps
- No official KRX document was found that states which events are included in 수정주가 and that cash dividends are excluded. The cash-dividend exclusion is standard practice knowledge, not verified from a primary source here.
- The KIS documentation for `FID_ORG_ADJ_PRC` was verified only via our internal spec. The public KIS GitHub page listed the files but the content was not fetched.

## 5. How an interval forecast should handle limits, new listings, and halts

### Takeaway
For 1–4 week horizons, the ±30% daily limit is a weak constraint. Handle it as a hard clip on simulated paths and as censoring in estimation, not as a distributional shape. The bigger issues are excluding or flagging special states (listing day/early life, 정리매매, halts, 관리종목) and the 2026 high-volatility regime.

### Cited Findings
- Limit hits under ±30% averaged about 6.1 up and 0.3 down per day market-wide in the first year. — [시사경제 2016](https://www.sateconomy.co.kr/news/view/179588243542547)
- Listing-day band is 60–400% of the IPO price (since 2023-06-26). — [이코노미스트 2023](https://economist.co.kr/article/view/ecn202306200029)
- 정리매매 has no price limit and uses 30-minute call auctions. — [fnnews 2025-09-02](https://www.fnnews.com/news/202509020945348809)
- VI is exempt for listing-day and delisting-scheduled issues. — [KRX Global VI](https://global.krx.co.kr/contents/GLB/06/0602/0602020204/GLB0602020204T7.jsp)

### Inferences
- **Estimation:** treat days that close at the limit as right- or left-censored. Either exclude them from realized-vol estimation and instead use the next unconstrained day, or use a Tobit-style or two-day-aggregated return. Do not fit daily kurtosis from raw limit-close days.
- **Simulation:** if the model simulates daily paths, clip each simulated daily return to [ln 0.7, ln 1.3] relative to the prior simulated close. For quantile-only models on h-day returns, apply only the sanity bound [h·ln0.7, h·ln1.3]. It virtually never binds for h≥5.
- **New listings:** require a minimum history (e.g., ≥60 trading days after listing) before forecasting. Days 1–20 of IPOs are high-volatility and mean-reverting, and day 1 sits in a different limit regime.
- **Halts:** a halted name has no bars. Do not interpolate. Suppress the forecast while halted, and mark the first post-resumption return as a jump excluded from vol estimation.
- **Designated names** (관리종목, 투자경고/위험, 정리매매): suppress the forecast or show a status instead. These states carry delisting risk that a price-only model does not see, and the coaching app's product rules forbid confident statements.
- **Scoring:** a delisted name's final return should be the 정리매매 last price or the merger consideration, not dropped. Otherwise realized coverage is overstated (see §7).

### Gaps
- No Korea-specific literature was found on interval-forecast calibration under price limits. The recommendations above are inferences.

## 6. Data sources: history, adjustment, delisted coverage, access, limits, licensing

### Takeaway
No free official source cleanly provides adjusted, survivorship-free daily history with redistribution rights. KRX 정보데이터시스템 (via pykrx/FinanceDataReader scraping) has the deepest coverage: from 2000, including delisted names' raw closes and the delisting list. Its terms are unclear, and some endpoints now need a KRX login. The KRX OPEN API (official, key-based, said to cover 2010-onward daily data) is the cleanest official route for raw prices. The data.go.kr 금융위원회_주식시세정보 API is KOGL Type 4 (no commercial use, no modification), with redistribution prohibited. KIS gives adjusted prices but is a broker API for listed codes.

### Cited Findings
**KRX 정보데이터시스템 (data.krx.co.kr) via scraping**
- The delisting list (`MDCSTAT23801`) and delisted prices (`MDCSTAT23902`) are served via `getJsonData.cmd`, at most a 2-year span per request. KRX provides data from 2000-01-01. — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)
- The full KRX delisting file (as of 2026-09-03) has 4,185 rows: KOSPI 2,135, KOSDAQ 1,930, KONEX 120. Common stock only: 2,105. Over the last 10 years, 575 common stocks were delisted: KOSDAQ 353, KONEX 115, KOSPI 107. — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)
- Six-digit codes are reused over time (e.g., 030270 mapped to two securities). Store the 12-digit ISIN. — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)

**pykrx**
- pykrx scrapes KRX and Naver. "데이터의 저작권은 각 제공처에 있습니다," and commercial use must follow the providers' terms. Users are asked to avoid excessive calls; the example sleeps 1 second per ticker. Some APIs now require KRX membership credentials (`KRX_ID`, `KRX_PW`). Default OHLCV is adjusted; `adjusted=False` gives raw. `get_market_price_change` includes stocks delisted in the period (close 0, −100%). — [pykrx GitHub](https://github.com/sharebook-kr/pykrx)
- OHLCV defaults to Naver, which does not cover delisted names. The KRX path covers delisted closes but not adjusted closes. — [pykrx issue #89](https://github.com/sharebook-kr/pykrx/issues/89)
- `get_market_ticker_list(date, market)` reconstructs the as-of-date universe. Failures return an empty DataFrame silently (`@dataframe_empty_handler`). The StockTicker singleton caches per process. — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)

**FinanceDataReader**
- `fdr.StockListing('KRX-DELISTING')` returns the delisting list, and `fdr.DataReader('KRX-DELISTING:<code>')` returns delisted prices. It reportedly maintains a daily-refreshed cached CSV of the KRX delisting list. Failures also return empty silently. The `ToSymbol` field marks successor securities. — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)

**KRX OPEN API (openapi.krx.co.kr)**
- This is the official KRX service. Users must agree to the T&C and get an authentication key; KRX may amend the T&C with notice. — [KRX OPEN API terms](https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO005.jsp)
- Third-party docs (not official) say: daily data from 2010, updated 08:00 KST, 10,000 calls/day limit, separate approval per category (KOSPI, KOSDAQ and KONEX daily trades; basic info), and about 1 day for approval. — [openkrx-mcp](https://github.com/RealYoungk/openkrx-mcp); [Glama OpenKRX](https://glama.ai/mcp/servers/utqetst3bt)

**공공데이터포털 금융위원회_주식시세정보 (data.go.kr 15094808)**
- Provider: FSC; the data belongs to KRX. Updated once a day, after 13:00 on the next business day (the metadata inconsistently says "실시간"). Covers stocks, beneficiary certificates and warrants, with OHLC and volume. The page does not say whether prices are adjusted or what history range is covered. Development accounts get 10,000 calls; production limits can be raised.
- License: 공공누리 제4유형 (attribution, no commercial use, no modification). Third-party redistribution is prohibited, and commercial use requires buying the data from KRX Data Marketplace. Delisted coverage is not stated.
- — [data.go.kr 15094808](https://www.data.go.kr/data/15094808/openapi.do)
- The companion 금융위원회_KRX상장종목정보 (15094775) is updated daily and lists currently listed securities' basic info. — [data.go.kr 15094775](https://www.data.go.kr/data/15094775/openapi.do)

**OpenDART (opendart.fss.or.kr)**
- The FSS public-disclosure API (pilot from January 2020) runs from disclosure lists to detailed filings. The key is free. Major-event reports (주요사항보고서), including paid-in capital increases and capital reductions, are queryable. — [아시아경제 2020-01-20](https://cm.asiae.co.kr/en/article/2020012011020597913); [dart-fss PyPI](https://pypi.org/project/dart-fss); [OpenDART MCP README](https://glama.ai/mcp/servers/@RealYoungk/opendart-mcp/blob/d27e615b11b2c1ba6d39ab806ecd6e1274eabacc/README.md)

**KIS Open API (한국투자증권)**
- `FHKST03010100` (`inquire-daily-itemchartprice`): `FID_PERIOD_DIV_CODE` D/W/M/Y; `FID_ORG_ADJ_PRC` 0 = 수정주가, 1 = 원주가; `FID_INPUT_DATE_1/2`; at most 100 rows per call. — internal `pm/requirements/specs/in-progress/FEATURE-011-kr-stock-kis.md:188` (labeled [공식] there, sourced to `koreainvestment/open-trading-api` `examples_llm/domestic_stock/inquire_daily_itemchartprice`); file listing confirmed at [GitHub](https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/domestic_stock/inquire_daily_itemchartprice)
- A blog example uses the same TR with `fid_org_adj_prc="0"`. — [tistory example](https://tistorymaster.duckdns.org/9)

**Index constituents**
- No free source for the historical KOSPI200 membership timeline was found in this session.

### Inferences
- **Practical recipe for our setup** (KIS mock key at about 2 req/s, about 2,450 listed commons):
  - Backfill: 100 rows/call means about 13 calls per name for 5 years, so about 32k calls in total, about 4.5 hours at 2 req/s. That is feasible as a one-off.
  - Survivorship-free history cannot come from KIS. Delisted codes are almost certainly not queryable through a broker quote TR (not verified).
  - For research and backtests, pull the delisting list and delisted raw closes from KRX via pykrx or FinanceDataReader with a KRX login, cached locally and not redistributed.
  - Corporate-action dates come from OpenDART.
- **Licensing:** showing users KIS-derived forecasts is governed by the KIS terms. Using KRX-scraped or data.go.kr data inside the product, rather than only for internal research and calibration, is risky. data.go.kr Type 4 explicitly bars commercial use and redistribution, and KRX itself asks commercial users to buy from KRX Data Marketplace. Keep survivorship-free data in the offline calibration/evaluation path only, and never serve it to users.

### Gaps
- No official KRX OPEN API docs were fetched for history start, call limits, delisted inclusion or the adjusted flag. The "2010 / 10,000 per day" figures are third-party.
- Not verified: whether KIS `FHKST03010100` returns data for delisted codes; the maximum lookback; and whether the mock-trading (모의투자) domain serves the same history as production.
- OpenDART daily call limit (commonly cited as 20,000/day) and commercial-use terms: not verified.
- pykrx and FinanceDataReader software licenses were not confirmed from the README content fetched. The data rights belong to KRX and Naver regardless.
- KOSPI200 historical membership: KRX publishes periodic rebalancing notices, but no machine-readable free history was confirmed.

## 7. Point-in-time universe construction and survivorship-bias magnitude in Korea

### Takeaway
About 14% of the KOSPI+KOSDAQ names that existed in September 2015 were delisted by September 2026: 266 of about 1,842. Delistings ran 63 in 2024, 79 in 2025, and 65 in 2026 through Sep 3. KOSDAQ dominates. About 20% of delistings are mergers with consideration, not wipe-outs. A PIT universe needs listing/delisting dates, ISIN (codes get reused), successor mapping, and as-of status flags.

### Cited Findings
- 266 stocks listed on 2015-09-03 were later delisted, out of a reconstructed universe of about 1,842 (1,576 survivors + 266), or 14.4% by count. The source gives no return-bias estimate. — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)
- Delistings per year: 2024: 63; 2025: 79; 2026 (Jan 1 – Sep 3): 65. The table appears to cover KOSPI+KOSDAQ common stock. — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)
- Top 10-year delisting reasons (common stock):
  - 피흡수합병 (absorbed in a merger): 61
  - SPAC merger extinction: 53
  - going-concern / listing-standards failures: 52
  - failure to file a listing application: 51
  - conversion into a holding company's wholly owned subsidiary: 31
  - — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)
- Best practices from the same source:
  - Assert a minimum row count on delisting-list pulls, because failures are silent.
  - Key securities by ISIN.
  - Treat `ToSymbol` successors as transfers.
  - Don't assume an exit at the last pre-정리매매 close.
  - — [AlgoLab 2026](https://algolab.co.kr/blog/survivorship-bias-backtest-delisted-krx-2026)

### Inferences
- With our master of about 2,450 currently listed commons and no delisted history, any backtest or calibration (coverage of 80% intervals, PIT scores) over 2015–2026 omits about 14% of names. The omitted names are skewed toward KOSDAQ small caps that ended in large losses (going-concern, filing failures). That biases realized left-tail frequency down and makes intervals look better calibrated than they are, especially at the 5th and 10th percentiles.
- Minimum PIT schema: `isin`, `code`, `market`, `list_date`, `delist_date`, `delist_reason`, `successor_code`, plus daily status flags (관리종목, 투자경고/위험, 거래정지, 정리매매) as-of. Status-flag history is the hardest part. KRX publishes current designations, but a historical as-of series would have to be reconstructed from KRX notices or KIND disclosures (not verified as freely available in bulk).
- SPAC delistings (53 of the 10-year total) should be dropped from the evaluation universe entirely rather than counted as "bias", since SPACs are not operating companies.

### Gaps
- Most quantitative survivorship numbers come from one 2026 practitioner blog (AlgoLab) that used KRX data. No independent academic estimate of the return bias was found.
- No free bulk source of historical 관리종목 or 투자경고 designation as-of flags was confirmed. KRX KIND (kind.krx.co.kr) is the likely source but was not examined.
