# Research F — Crypto evidence for a KRW-spot coach (1h–5d horizon)

Date of research: 2026-11-13. Scope: fills the crypto gap left by the earlier pass (which covered Liu & Tsyvinski 2021, Liu-Tsyvinski-Wu 2022, one hourly-BTC ML preprint, Choi-Lehar-Stauffer, FSC/FIU surveys — not repeated here).

## How to read the grades

- **VERIFIED-PRIMARY** — I opened the paper / regulator page / official doc itself (PDF text extracted locally, or the abstract/landing page fetched) and the number and quote come from it.
- **SECONDARY** — the number comes from a press article, a practitioner report, a search-result rendering of an abstract, or the authors' blog summary rather than the paper's tables. Treat as a lead, not as a fact.
- **NOT-FOUND** — searched, nothing usable; or the source refused to open (stated).

Things I could **not** open (403/404/bot wall): SSRN 4184367 (Félez-Viñas et al. full paper), the AUT-hosted PDF of Han-Kang-Ryu, the JFQA-hosted PDFs (the Cambridge copy of the trend-factor paper did open), econbiz/ICM records for Cakici et al., the Springer page for "Crypto-influencers", the BIS PDFs via direct download (the BIS HTML landing pages did open). Numbers from those are graded SECONDARY or NOT-FOUND accordingly.

Naming: the second KRW exchange is written "국내 2위 원화 거래소"; the messenger whose outage halted Upbit log-ins in 2022 is not named.

---

## 1. Return predictability after 2021 — what survives honest evaluation and costs

### 1.1 Trend / momentum (weekly horizon, cross-section)

**Fieberg, Liedtke, Poddig, Walker, Zaremba — "A Trend Factor for the Cross Section of Cryptocurrency Returns", JFQA 60(7), 2025 (online 15 Jul 2025).** VERIFIED-PRIMARY (full text opened).
URL: https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0022109024000747

- Sample: 3,000+ coins, Apr 2015 – May 2022, 423 weekly observations. Quote: "sample period starts in Apr. 2015 and ends in May 2022, yielding a total 423 weekly observations."
- Gross long-short (top minus bottom quintile, value-weighted, weekly rebalanced): 3.87%/week, t = 5.19. Quote: "between the extreme quintiles equals 3.87% (t-stat = 5.19)".
- After costs: turnover 68%/week; net 2.90% (t = 3.89) to 2.35% (t = 3.16) depending on cost assumption (30/40 bps up to higher tiers); break-even cost 1.41%. Quote: "the BETC rate, at which the mean net return is erased to 0, equals 1.41%."
- Largest 100 coins only: gross 3.40% (t = 4.48), net 2.45%–1.90%, break-even 1.25%. Quote: "A CTREND factor based on the largest 100 cryptocurrencies earns between 2.45% and 1.90% per week — all statistically significant."
- Plain Liu-Tsyvinski-Wu momentum (CMOM) is weaker and fragile: across 6,144 research designs "CMOM is only significant in 49% of all" designs, median Sharpe 0.83, minimum −4.47; the authors conclude "the CMOM factor is redundant and should be replaced by CTREND".
- Out-of-sample status: the signal is built with expanding-window ML forecasts ("All results are based on out-of-sample estimates over the period from Apr. 2016 to May 2022"), but **the sample stops in May 2022**. No replication on 2022–2026 data was found (see 1.6).
- Relevance: horizon is one week, long-short. A long-only spot app can only use the long leg; the long leg's raw return is contaminated by the 2015–2022 bull market.

**Fičura — "Impact of size and volume on cryptocurrency momentum and reversal", FFA Working Paper 3/2023 (Prague).** VERIFIED-PRIMARY (working paper, not peer-reviewed).
URL: https://wp.ffu.vse.cz/pdfs/wps/2023/01/03.pdf

- Weekly reversal exists only in small illiquid coins; large liquid coins show weekly momentum. Quote: "weekly return reversal occurs for small and illiquid coins only (t-stat = -7.31), while the large and liquid coins exhibit weekly momentum effect instead (t-stat = 2.33)."
- Distance from 1-week high: "predicts negatively future returns of small and illiquid coins (t-stat = -9.03) and positively future returns of large and liquid coins (t-stat = 4.93)."
- No transaction-cost or out-of-sample table was read; effect sizes in % not extracted. Treat the sign split as the finding.

**Zaremba, Bilgin, Long, Mercik, Szczygielski — "Up or down? Short-term reversal, momentum, and liquidity effects in cryptocurrency markets", Int. Rev. Financial Analysis 78, 2021.** SECONDARY (abstract as rendered in search results; RePEc page not opened).
URL (listing): https://ideas.repec.org/a/eee/finana/v78y2021ics1057521921002349.html

- 3,600+ coins, daily: low last-day-return coins outperform high last-day-return coins; "the handful of largest and most tradeable coins exhibit daily momentum rather than a reversal."

**Dobrynskaya — "Cryptocurrency Momentum and Reversal", J. Alternative Investments 26(1), 2023.** SECONDARY (abstract via search; the HSE PDF I opened turned out to be a different paper by the same author).
- ~2,000 coins, 2014–2020: momentum up to 2–4 weeks, reversal beyond one month.

**Han, Kang, Ryu — "Time-Series and Cross-Sectional Momentum in the Cryptocurrency Market: A Comprehensive Analysis under Realistic Assumptions".** SECONDARY (PDF returned 403; abstract via search).
URL (not openable): https://acfr.aut.ac.nz/__data/assets/pdf_file/0009/918729/Time_Series_and_Cross_Sectional_Momentum_in_the_Cryptocurrency_Market_with_IA.pdf
- Reported: time-series momentum evidence strong, cross-sectional weak; time-series momentum "concentrated in a bullish market"; "the t-test of the mean return is insufficient to test profitability"; many portfolios are liquidated once costs and daily fluctuations are modelled. No numbers verified.

### 1.2 Short-term reversal (daily) and costs

**Bianchi, Babiak, Dickerson — "Trading volume and liquidity provision in cryptocurrency markets", Sveriges Riksbank WP 413 (May 2022); J. Banking & Finance 142, 2022.** VERIFIED-PRIMARY (Riksbank PDF).
URL: https://www.riksbank.se/globalassets/media/rapporter/working-papers/2022/no.-413-trading-volume-and-liquidity-provision-in-cryptocurreny-markets.pdf

- Sample: USD pairs on multiple centralised exchanges, 1 Mar 2017 – 1 Mar 2022.
- Reversal is concentrated in low-volume pairs. Value-weighted reversal conditional on low volume 0.65%/day (p = 0.002) vs −0.19% (p = 0.251) for high-volume pairs. Quote: "the average returns from a value-weighted reversal strategy conditional on low volume is 0.65% (p-value: 0.002) against -0.19% (p-value: 0.251) obtained by focusing on high volume pairs."
- With 30 bps (long) / 40 bps (short) costs, equal-weighted reversal stays at 1.68%/day (p = 0.001) — i.e. it lives in small illiquid pairs — but value-weighted alphas die. Quote: "Once we account for transaction costs, the alphas drastically decrease and are no longer statistically significant."
- Reading for the app: daily reversal is a liquidity-provision premium in thin coins, not a directional edge in the top coins; the paper's long-short return is not reachable long-only at quoted prices.

**Caporale & Plastun — "Price Overreactions in the Cryptocurrency Market", CESifo WP 6861, 2018 (J. Economic Studies 2019).** VERIFIED-PRIMARY (ifo/CESifo abstract page).
URL: https://www.ifo.de/en/cesifo/publications/2018/working-paper/price-overreactions-cryptocurrency-market

- BTC, LTC, XRP, DASH daily 2013–2017 (period from search listing — SECONDARY). Tests "confirm the presence of price patterns after overreactions", but trading simulations show these "do not give rise to exploitable profit opportunities" and "cannot be seen as evidence against the Efficient Market Hypothesis".
- Directly relevant to the app's "after a −2σ day in a top-10 coin, next-day up-rate 56.0% vs 45.9%": the literature says conditional patterns after extreme days do exist but have not been shown to be exploitable. Pre-2018 sample.

### 1.3 Intraday predictability

**Shen, Urquhart, Wang — "Bitcoin intraday time-series momentum", Financial Review 57(2), 2022.** SECONDARY (repository listing via search; accepted PDF link failed).
- First-half-hour return predicts last-half-hour return when "opening/closing" is defined by volume; strongest when the first session has high volume/volatility. No effect size verified.

**Wen, Bouri, Xu, Zhao — "Intraday return predictability in the cryptocurrency markets: Momentum, reversal, or both", North American J. Economics & Finance 62, 2022.** VERIFIED-PRIMARY (RePEc abstract page; abstract only).
URL: https://ideas.repec.org/a/eee/ecofin/v62y2022ics1062940822000833.html
- BTC high-frequency 2013–2020; both intraday momentum and a reversal "unique to the cryptocurrency market"; a timing strategy "produces higher economic value than the benchmark strategy". No cost-adjusted numbers in the abstract.

**Mroziewicz & Ślepaczuk — walk-forward EMA strategy on intraday BTC, arXiv 2602.10785 (Feb 2026).** VERIFIED-PRIMARY (arXiv PDF; preprint).
URL: https://arxiv.org/pdf/2602.10785v1
- 1–60-minute bars, 81 walk-forward window combinations, 19-month training, single-shot 21-month test, 0.1% fee per transaction.
- In training every combination beat buy-and-hold; in the untouched test period "the strategy performed similarly to Buy-and-Hold but with lower drawdown and a higher Information Ratio." Break-even "around 0.4% per transaction".
- This is the honest shape of most intraday results: in-sample dominance, out-of-sample ≈ buy-and-hold with lower drawdown.

### 1.4 Machine learning on the cross-section

**Cakici, Shahzad, Będowska-Sójka, Zaremba — "Machine learning and the cross-section of cryptocurrency returns", Int. Rev. Financial Analysis 94, 2024.** SECONDARY (both repository pages blocked; abstract via search).
- Reported: most ML strategies remain profitable after trading costs despite high turnover, but alphas are concentrated in "small, illiquid, and volatile coins"; profits come from the long leg. No numbers verified.

**Zhu & Cai — "Artificial Intelligence in Equity and Crypto Markets: Progress, Profitability Evidence, and the Limits of Automated Investing", arXiv 2609.04917 (literature cutoff 31 Aug 2026).** VERIFIED-PRIMARY (arXiv PDF; review preprint).
URL: https://arxiv.org/pdf/2609.04917
- Quote: "Within the public evidence examined here, no general AI architecture is shown to deliver persistent, cross-regime, capacity-aware net alpha."
- Quote: "the AI-specific crypto record examined here is thinner than the equity record."
- Lists the failure modes: "Temporal contamination, repeated selection, survivorship, weak benchmarks, implementation costs".

### 1.5 LLM / news sentiment and time-series foundation models

**Li, Luo, Wang, Chen, Liu, He — "CryptoTrade: A Reflective LLM-based Agent to Guide Zero-shot Cryptocurrency Trading", EMNLP 2024, arXiv 2407.09546.** VERIFIED-PRIMARY for the abstract only.
URL: https://arxiv.org/abs/2407.09546
- Abstract claims "superior performance in maximizing returns compared to traditional trading strategies and time-series baselines". The abstract page says nothing about knowledge-cutoff or look-ahead control. The 2026 review above classifies it as "Beats selected learned baselines; does not…" (sentence truncated in my extract) — i.e. not evidence of beating buy-and-hold. Leakage control: NOT-FOUND.

**"Market-Derived Financial Sentiment Analysis: Context-Aware Language Models for Crypto Forecasting", arXiv 2502.14897 (2025).** VERIFIED-PRIMARY (arXiv PDF; preprint).
URL: https://arxiv.org/pdf/2502.14897v2
- Labels tweets by the price path that followed; "up to an 11% improvement in short-term trend prediction accuracy over traditional sentiment-based benchmarks"; "an accuracy of 89.6% on a curated dataset of 227 impactful Bitcoin-related news events with significant market impacts".
- Caution (my reading): the 89.6% is on events selected because they moved the market — a selected sample, not a deployable hit rate. The benchmark is other sentiment models, not the majority class.

**Crypto-specific LLM study with an explicit post-knowledge-cutoff test window: NOT-FOUND.** The post-cutoff designs I found are equity studies.

**Noguer i Alonso & Pereira Franklin — "Pretrained Time-Series Foundation Models for Financial Return Forecasting", arXiv 2606.27100 (June 2026).** VERIFIED-PRIMARY (arXiv PDF; equities, not crypto).
URL: https://arxiv.org/pdf/2606.27100
- TimeGPT, TimesFM-2.5, Moirai-2.0, Chronos, Chronos-2 vs trained-from-scratch nets on five US stocks. Quote: "gains over the random-walk benchmark are small and sparse. A one-sided Diebold–Mariano test rejects equal or inferior predictive accuracy only for Chronos on AMZN and Moirai-2.0 on GOOG."
- **A rigorous foundation-model benchmark on crypto returns: NOT-FOUND** (one master's thesis and a blog post surfaced; neither opened, neither counted).

### 1.6 Replication of the Liu-Tsyvinski-Wu factors on post-2021 data

**NOT-FOUND** as a dedicated replication. The closest evidence is inside the trend-factor paper (1.1): through May 2022 the LTW momentum factor is significant in only 49% of reasonable research designs and is spanned by the trend factor. Nothing I could open tests 2022–2026.

### 1.7 Bottom line on "what survives ~10–15 bps"

| Signal | Horizon | Survives 10–15 bps? | Catch |
|---|---|---|---|
| Multi-horizon price+volume trend, cross-sectional | 1 week | Yes in-sample-period to May 2022 (break-even 1.25–1.41%) | Long-short; 68% weekly turnover; no post-2022 test |
| Plain 1–4-week momentum (LTW style) | 1–4 weeks | Fragile (significant in 49% of designs) | Left-tail crashes |
| Daily reversal | 1 day | Only equal-weighted, i.e. in thin coins | Value-weighted alpha gone after costs; needs shorting / maker fills |
| Daily momentum in the very largest coins | 1 day | Not established | Sign documented, cost-adjusted size not found |
| Intraday EMA / time-series momentum on BTC | minutes–hours | ≈ buy-and-hold out of sample | Lower drawdown is the only robust gain |
| ML / LLM / foundation models | any | No persistent net alpha shown | Selection, contamination, weak baselines |

Consistent with the app's own result (59.0% vs 59.0% majority class): direction at 1h–5d is not where the documented, cost-surviving structure is.

---

## 2. Volatility and range forecasting

**Hu, Härdle, Kuo — "Risk of Bitcoin Market: Volatility, Jumps, and Forecasts", arXiv 1912.05228 v3 (Dec 2021).** VERIFIED-PRIMARY (arXiv PDF; preprint).
URL: https://arxiv.org/pdf/1912.05228v3

- Data: BTC 5-minute returns, Jan 2017 – Dec 2020, 1,385 days, 288 bars per day (same bar size the app has). 5-minute log returns "span from -18.64% up to 10.30%".
- Out-of-sample (90-day rolling window, re-estimated daily), Mincer-Zarnowitz R² of realized-variance forecasts (Table 5):

| Horizon | HAR | HAR + jumps (RVJ) | Signed semivariance (RSV) | RSV + signed jumps |
|---|---|---|---|---|
| 1 day | 0.130 | 0.066 | 0.177 | 0.111 |
| 7 days | 0.223 | 0.224 | 0.261 | 0.343 |
| 30 days | 0.400 | 0.462 | 0.533 | 0.539 |

- Quote: "MZ-R2 is 0.130 in HAR, while it is 0.066 in RVJ, which accounts for the separated jump estimators." Jump modelling hurts at 1 day and helps at 7–30 days.
- Quote (abstract): "the jumps, especially positive ones, significantly reduce future realized variance".
- Compare with the app's direction skill of zero: a plain HAR on its own 5-minute bars should explain roughly 13–18% of next-day realized variance and 22–34% at one week for BTC. Alt-coin figures: NOT-FOUND.

**Shen, Urquhart, Wang — "Forecasting the volatility of Bitcoin: The importance of jumps and structural breaks", European Financial Management 2020.** SECONDARY (search summary only). 18 HAR variants, 2012–2018; jumps and structural breaks improve forecasts at all horizons; HARQ-F-J best out of sample. Conflicts with Hu et al. at the 1-day horizon — so "add jumps" is not a settled improvement at 1 day.

**Hansen, Kim, Kimbrough — "Periodicity in Cryptocurrency Volatility and Liquidity", arXiv 2109.12142 (2021); J. Financial Econometrics 22(1), 2024.** VERIFIED-PRIMARY (arXiv PDF).
URL: https://arxiv.org/pdf/2109.12142v2

- BTC and ETH on two centralised exchanges and one decentralised exchange. "systematic patterns in both volatility and volume" by day of week, hour of day and minute within the hour.
- Weekend: "both volatility and volume tend to be smaller on weekends, which is most pronounced on Saturdays."
- Within-hour bursts at :00, :15, :30, :45 (search rendering of the abstract — SECONDARY for that sentence).
- Adding periodicity to a volatility model improves out-of-sample log-likelihood (in-sample 2017–2019, out-of-sample Jan 2020 – Jul 2021). Size of improvement not extracted.
- This is a volatility/volume seasonality, not a return seasonality.

**Interval coverage — Aich, Aich, Jain, "Temporal Conformal Prediction (TCP)", arXiv 2507.05470 (v1 Jul 2025; v6 Jan 2026).** VERIFIED-PRIMARY (arXiv HTML v1; preprint, numbers changed across versions).
URL: https://arxiv.org/html/2507.05470v1

- BTC-USD daily log returns, Nov 2017 – May 2025, one-day-ahead intervals, nominal 95%:

| Method | Empirical coverage | Mean width |
|---|---|---|
| Rolling quantile regression | 0.951 | 10.311 |
| Historical simulation | 0.944 | 18.058 |
| Conformal (TCP) | 0.885 | 9.611 |
| GARCH | 0.853 | 11.391 |

- Quote (v1): "maintaining coverage of 88.5% with significantly narrower intervals (9.61) compared to QR (10.31) and Hist (18.06)". The v6 abstract reverses the framing: "QR baselines yield the sharpest intervals but are materially under-calibrated" and "TCP achieves near-nominal coverage".
- Reading: a parametric GARCH 95% band on BTC covered about 85%; no method is reliably calibrated without checking realized coverage on the app's own data. The method ranking is version-dependent — do not cite it as settled.

**Jump behaviour / weekend effect on returns (direction): NOT-FOUND** as verified evidence beyond the above.

---

## 3. Event-conditioned effects

### 3.1 Exchange listings

**Ante — "Market reaction to exchange listings of cryptocurrencies", BRL Working Paper 5 (2019/2020).** VERIFIED-PRIMARY (working paper PDF).
URL: https://www.blockchainresearchlab.org/wp-content/uploads/2020/02/BRL-Working-Paper-5.pdf
- 250 cross-listings of 135 ICO tokens on 22 exchanges. Quote: "significant abnormal returns of 6.51% on the listing day and 9.97% over a seven-day window around the event"; "listings on individual exchanges yield returns of up to 34% on the event day, while others are negligible"; "lower prior trading volume and asset market capitalization have positive effect on listing returns"; "Investors use phases of high market liquidity to sell off positions".
- In-sample event study, 2017–2019 era.

**Laucht — "Cryptocurrency Cross-listing Incentives and Abnormal Returns", master's thesis, Erasmus (Sep 2022).** VERIFIED-PRIMARY (thesis, not peer-reviewed).
URL: https://thesis.eur.nl/pub/65625/Laucht_603384_Thesis.pdf
- 390 cross-listings on 11 exchanges, Jan 2020 – Dec 2021. Listing-day abnormal return "2.35% for the constant mean return model and 2.02% for the market model".
- Day −1 abnormal return exceeds day 0. Quote: "the AARs measured the day before the cross-listing event (t = -1) even exceed the AARs on the event day (t = 0)."
- Post-listing: "Starting from t = 2, the AARs become negative and remain negative until the end of the event window (t = 5). Overall, CAARs during the [1, 5] window are slightly negative but not statistically significant."
- US-licensed exchange listing: about 11.4% higher CAR.

**Korean KRW listings — Four Pillars, "2025 Korean CEX listings post-mortem" (11 Mar 2026).** SECONDARY as evidence (practitioner report), opened directly.
URL: https://research.4pillars.io/en/research/2025-korean-cex-listings-post-mortem
- New KRW pairs in 2025: 59 on Upbit, 144 on the 국내 2위 원화 거래소. $100 bought at each token's day-1 close and held to 11 Mar 2026.
- Portfolio return −69.5% (Upbit) / −69.1% (2위 거래소); median −80.9% / −82.1%. Quote: "The median ROI was -80.9% for Upbit and -82.1% for Bithumb." [exchange name appears in the source's own sentence]
- In profit: 2 of 59 on Upbit; 8 of 144 on the other.
- Raw, not benchmark-adjusted; the holding period overlaps a broad alt-coin drawdown; a global exchange's 2025 listings did −71.7% by the same method — so this is "new listings in a bear market", not a Korea-specific effect.

**Four Pillars, "The dying Upbit listing pump" (12 Aug 2026).** SECONDARY (practitioner; method and data source not described).
URL: https://research.4pillars.io/en/data/content/the-dying-upbit-listing-pump
- 58 new KRW markets in Jan–Jul 2026. Through 14 Jun: median day-one gain 42% on median turnover ₩142 billion. From 15 Jun (14 listings): median day-one gain 10%, median turnover ₩54 billion; "8 of the 14 closed their first day below the open."
- For listings that pumped more than 40%: day-7 close was 20–65% below the day-1 high, median 45%.
- Coins that got a KRW pair after already trading on the BTC market: median 19% gain.
- Consistent in sign with the app's own listing-day figure (next-day up-rate 23.4% vs 45.9%).

**Four Pillars, "The tale of the tail in the Korea CEX" (20 Jul 2026).** SECONDARY.
URL: https://research.4pillars.io/en/research/the-tale-of-the-tail-in-the-korea-cex
- Panel of 605 listings since Jun 2021: median Upbit listing sheds most debut liquidity within 10–15 weeks; at week 51, 42.7% of Upbit listings still trade above 10% of debut liquidity.

**Academic event study of Upbit / Korean KRW listing announcements: NOT-FOUND** (English and Korean searches). Korean regulator data on listing-day returns: NOT-FOUND (regulators publish counts only — see §5).

### 3.2 Delisting / 거래지원 종료 / 유의종목

- **Academic event study of delisting or 유의종목 designation returns: NOT-FOUND** (English and Korean).
- Counts only (regulator; see §5): H2 2025 거래중단 66건 · 유의종목 95건 (press rendering); H1 2026 신규 135건 · 거래중단 108건 (press) · 유의종목 139건 (press snippet).
- Press anecdotes exist of both −20% to −94% after delisting decisions and speculative spikes after 유의 designation on single-exchange coins when deposits are frozen. SECONDARY, anecdotal, unverified; do not quantify.

### 3.3 Exchange outage (Korea-specific natural experiment)

**"…service interruption at Upbit…" event study (PMC10395473; Heliyon-type journal, 2023).** VERIFIED-PRIMARY for the abstract.
URL: https://rcastoragev2.blob.core.windows.net/92ef3059898b619c824f50cf9f1cc0cd/main.PMC10395473.pdf
- 20-hour interruption on 15 Oct 2022. Quote: "Event study estimation using price data from Binance … shows the sharp and negative reactions to cryptocurrencies mostly traded at Upbit." Magnitudes not extracted. Shows that Korea-concentrated coins are priced by Korean flow.

### 3.4 Token unlocks

**Keyrock — "From Locked to Liquidity: What 16,000+ Token Unlocks Teach Us" (page undated; chart paths suggest Dec 2024).** SECONDARY (market-maker report, opened directly).
URL: https://keyrock.com/from-locked-to-liquidity-what-16000-token-unlocks-teach-us/
- "16,000+ unlock events across 40 tokens"; ±30-day window; ETH-normalised prices.
- "90% of unlocks create negative price pressure, regardless of size or type." (derivation not shown)
- Impact "often start[s] 30 days before the unlock event"; "Team unlocks trigger the worst crashes (-25%)"; "Ecosystem development unlocks are among the few with positive effects (+1.18% on average)"; larger unlocks "sharper price drops (2.4x)".
- Not peer-reviewed, 40 tokens, in-sample. Horizon is weeks, not 1h–5d. Peer-reviewed unlock study: NOT-FOUND.

### 3.5 Hard forks / airdrops

**NOT-FOUND** (no source opened). Do not assert an effect.

### 3.6 Macro announcements (CPI / FOMC)

**Benigno & Rosa — "The Bitcoin–Macro Disconnect", FRB New York Staff Report 1052 (Feb 2023).** VERIFIED-PRIMARY.
URL: https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr1052.pdf
- Intraday event study. Quote: "unlike other U.S. asset classes, Bitcoin is orthogonal to monetary and macroeconomic news."

**Mahmoudi — "Examining the Effect of Monetary Policy and Monetary Policy Uncertainty on Cryptocurrencies Market", arXiv 2311.10739 (2023).** VERIFIED-PRIMARY (preprint).
URL: https://arxiv.org/pdf/2311.10739
- Monthly data Jul 2010 – Aug 2023, regime-switching VAR: higher monetary-policy uncertainty lowers BTC returns, "-0.028 in regime 1 and -0.44 in regime 2". Monthly horizon — not usable at 1h–5d.

**Later claims that BTC's CPI sensitivity rose after 2021 (e.g. "29–30 bp per 1σ CPI surprise", "5.5% per 1pp surprise in the first hour"): SECONDARY / unverified** — they came from a news site and a derivatives-analytics blog in search results; the supposed Federal Reserve study could not be located. Evidence is therefore **mixed**: the one primary source says no systematic response through its sample.
- Safe statement for the app: scheduled macro releases are known times of elevated volatility risk; direction is not predictable from the calendar. Effect on alt-coins specifically: NOT-FOUND.

### 3.7 ETF flows

**FalconX market commentary (11 Oct 2024).** SECONDARY (industry note, opened directly).
URL: https://falconx.io/newsroom/what-can-spot-etf-flows-tell-us-about-the-trajectory-of-bitcoin-prices-a-preliminary-statistical-investigation
- Ten months of daily data from Jan 2024. Correlation of 7-day flow change and 7-day price change 0.30; "less than 10% of the change in prices can be explained by the change in net flows"; impulse response peaks "around days 3-4 with approximately a 1.2% price increase"; "Granger causality doesn't prove actual causation."
- A different industry note (search rendering only, not opened) reports flows correlate 0.54 with the prior five sessions' returns and 0.03 with the following five — i.e. flows chase price. SECONDARY, unverified.
- Peer-reviewed out-of-sample evidence that ETF flows predict BTC returns: NOT-FOUND. A "flows explain 95% of price levels" result seen in search is a levels regression and should not be read as predictability.

### 3.8 Liquidation cascades, funding, open interest, basis (app has no derivatives data)

**Schmeling, Schrimpf, Todorov — "Crypto carry", BIS Working Paper 1087 (Apr 2023; later Management Science).** VERIFIED-PRIMARY (BIS landing page; abstract level).
URL: https://www.bis.org/publ/work1087.htm
- Futures-spot carry "averaging above 10% annually", "up to 60% p.a."; driven by "smaller investors" seeking leveraged upside and scarce arbitrage capital; "a high crypto carry predicts future price crashes".
- Horizon and size of the crash prediction not extracted. Would need: futures and spot prices by maturity (or perpetual funding rates), ideally plus liquidation volumes.

**Cheng, Deng, Wang, Yu — "Liquidation, Leverage and Optimal Margin in Bitcoin Futures Markets", arXiv 2102.04591 (2021).** VERIFIED-PRIMARY (preprint).
URL: https://arxiv.org/pdf/2102.04591
- BitMEX perpetuals: "daily forced liquidations to outstanding futures are substantial at 3.51%, and 1.89% for long and short"; liquidated investors "trade aggressively with average leverage of 60X".

**Garcia Seuma — "Where does the criticality live? Early-warning signals are event-heterogeneous across seven crypto-perpetual liquidation cascades", arXiv 2607.27070 (Jul 2026).** VERIFIED-PRIMARY (preprint, single author).
URL: https://arxiv.org/pdf/2607.27070
- Seven BTC cascades 2022–2025, minute prices + 5-minute leverage/flow data, 39 configurations each. Quote: "No variable is event-invariant." Price shows the warning signature "in five of seven events but is silent in exactly the two sudden-news (tariff) shocks". A compression of taker-flow variance passes a 300-onset placebo test but "is a population-level precursor, not a per-event alarm."
- **Next-day spot return after a liquidation cascade: NOT-FOUND.**

What the app would need to test any of this: perpetual funding rate history, open interest, liquidation prints, and dated-futures basis from a derivatives venue whose API terms permit that use. None of it can be approximated from KRW spot bars.

### 3.9 Stablecoin flows

**Griffin & Shams — "Is Bitcoin Really Un-Tethered?", SSRN draft 13 Jun 2018; J. Finance 75(4), 2020.** VERIFIED-PRIMARY (2018 draft PDF, mirrored).
URL: https://www.macrobusiness.com.au/wp-content/uploads/2018/06/SSRN-id3195066.pdf
- Quote: "purchases with Tether are timed following market downturns and result in sizable increases in Bitcoin prices. Less than 1% of hours with such heavy Tether transactions are associated with 50% of the meteoric rise in Bitcoin and 64% of other top cryptocurrencies."
- 2017–2018 only; contested; needs on-chain flow attribution. Post-2020 replication: NOT-FOUND.

### 3.10 On-chain exchange flows and whale transfers

**Ante & Fiedler-type study of large BTC transfers, Finance Research Letters (DOI 10.1016/j.frl.2020.101619), as summarised by the author in Crypto Valley Journal (25 Aug 2021).** SECONDARY (author's own summary; journal article not opened).
URL: https://cryptovalleyjournal.com/focus/background/the-price-impact-of-large-bitcoin-transactions
- 2,132 transfers of ≥ 500 BTC, Oct 2018 – Sep 2019. Effects are measured in **minutes** (31-minute window): price falls until about 5 minutes after a transfer, then rises; sign depends on transfer type (cold-wallet withdrawals positive; hot-wallet deposits 27% of the sample with "hardly any relevant or significant results"). No percentages given in the summary.

**Sak — "Whales and Retail Attention: Dual Channels of Bitcoin Return Dynamics" (Turkish university journal, accepted Jun 2026).** VERIFIED-PRIMARY but low-tier venue, in-sample.
URL: https://dergipark.org.tr/tr/download/article-file/5483714
- 2,647 daily observations Jan 2018 – Mar 2025, top-100 non-custodial wallets + search-volume attention. Whale-event days are followed by returns higher by 0.79% (7 days), 1.66% (14 days), 2.44% (28 days); attention shocks have no immediate effect, then +1.76% (14d) and +2.36% (28d). No 1-day effect, no out-of-sample test, BTC drift over 2018–2025 not obviously removed.

**Makarov & Schoar — "Blockchain Analysis of the Bitcoin Market", NBER WP 29396 (version 18 Apr 2022).** VERIFIED-PRIMARY (abstract).
URL: https://mitsloan.mit.edu/sites/default/files/2022-06/Bitcoin-blockchain%20-%20AER.pdf
- Quote: "the Bitcoin eco-system is still dominated by large and concentrated players." Descriptive; not a return-prediction result.

Verdict: whale-transfer effects are either minute-scale (too fast for a coach), sign-ambiguous by transfer type, or multi-week in-sample drift. Nothing verified at 1h–5d out of sample. The app's "large-trade" data is exchange prints, not on-chain attribution — a different object from what these papers measure.

---

## 4. Pre-announcement run-ups, pump-and-dump, abnormal volume

**Félez-Viñas, Johnson, Putniņš — "Insider Trading in Cryptocurrency Markets" (SSRN 4184367, Aug 2022).** Authors' own summary on the Columbia Law School Blue Sky Blog (26 Aug 2022): VERIFIED-PRIMARY for the headline numbers. Full paper: could not open (403).
URL: https://clsbluesky.law.columbia.edu/2022/08/26/insider-traders-have-found-their-way-to-cryptocurrency-markets/
- Quote: insider trading in "10-25 percent of the cryptocurrency listings"; four connected wallets earned "$1.5 million"; "significant abnormal returns and run-up patterns".
- SECONDARY (press, not verified against the paper): 146 Coinbase listings, Sep 2018 – May 2022, prices tracked from −300h to +100h, run-up visible from about −250 hours. **Run-up size in percent: NOT-FOUND.**
- Corroboration from an independent sample: Laucht (3.1) finds day −1 abnormal return larger than day 0 across 11 exchanges.

**Li, Shin, Wang — "Cryptocurrency Pump-and-Dump Schemes" (working paper version; published JFQA, online 4 Apr 2025).** VERIFIED-PRIMARY (2019 conference draft PDF; published version's numbers may differ).
URL: https://abfer.org/media/abfer-events-2019/annual-conference/investment-finance/AC19P3078_Cryptocurrency_Pump-and-Dump_Schemes.pdf
- 3,412 announcements from 80 Telegram channels; analysis on 500 hand-collected events on three exchanges.
- Quote: "In the first 70 seconds after the start of a P&D, the price increases by 25% on average, trading volume increases 148 times, and the average 10-second absolute return reaches 15%. A quick reversal begins 70 seconds after the start of the P&D. After an hour, most of the initial effects disappear."
- Pre-pump: "prices of pumped tokens begin rising five minutes before a P&D starts. The price run-up is around 5%, together with an abnormally high volume."
- Outsiders: someone buying within the first 20 seconds and selling a minute later "will lose 0.72%"; mean (median) maximum return 68.94% (24.39%).
- Base rate: "likelihood that a token will be pumped on a given day is 0.3%". Target tokens: market cap comparable to the 10th percentile of US stocks.
- An exchange's ban on pump groups is used as a natural experiment: pumps are "detrimental to the liquidity and price of cryptocurrencies".

**Dhawan & Putniņš — "A New Wolf in Town? Pump-and-Dump Manipulation in Cryptocurrency Markets", Review of Finance 27(3), 2023.** SECONDARY (both mirrors blocked; numbers from search renderings).
- 355 pumps in six (or seven) months on two exchanges; ~65% average price rise within minutes; ~$350 million traded; 197 coins; manipulators ~ $6 million. Participants join despite negative expected returns (overconfidence, gambling preference).

**Ardia & Bluteau — "The Role of Twitter in Cryptocurrency Pump-and-Dumps", arXiv 2306.02148 (Jun 2023).** VERIFIED-PRIMARY (preprint).
URL: https://arxiv.org/pdf/2306.02148v1
- Pre-event: "a one standard deviation increase in the cumulative abnormal number of tweets corresponds to a contemporaneous increase of 0.325% in cumulative abnormal returns."
- Post-event: "a one standard deviation increase in the number of abnormal tweets before the event leads to a negative cumulative abnormal return of -2.202%." Twitter-informed participants sell late and lose most.

**Merkley, Pacelli, Piorkowski, Williams — "Crypto-influencers", Review of Accounting Studies 29(3), 2024.** SECONDARY (Springer page redirected to a login; numbers from university/press summaries).
- ~36,000 tweets, 180 influencers, 1,600+ assets, two years to Dec 2022. Mean return +1.83% at one day, +1.57% at two days; cumulative −2.24% at 10 days and −6.53% at 30 days; strongest for self-described experts and small-cap assets.

**Hamrick et al. (pump-and-dump economics, Telegram/Discord): not opened — NOT-FOUND in this pass.**

**Does abnormal volume without news predict subsequent moves?** No paper tests exactly "5-minute volume spike with no news → next 1h–5d return" on spot exchanges: NOT-FOUND. What the opened sources support: (i) in thin coins, an abnormal-volume price spike organised off-exchange reverses within an hour; (ii) socially promoted spikes are followed by negative drift over days to weeks; (iii) the base rate is low (0.3% of token-days in the 2018–19 sample) and targets are micro-caps. Upbit's own market-warning flags (§7d) are an official, usable marker of the same phenomenon.

---

## 5. Korea-specific

### 5.1 Regulator statistics (금융위 · FIU · 금감원)

**’25년 상반기 가상자산사업자 실태조사 결과 (2025-09-30).** VERIFIED-PRIMARY.
URL: https://www.fsc.go.kr/no010101/85419
- 시가총액 "95.1조원" (△14%), 일평균 거래규모 "6.4조원" (△12%), 거래가능 이용자 "1,077만명" (+11%), 원화예치금 "6.2조원" (△42%), 가격변동성((최고가-최저가)/최고가) "72%", 단독상장 "279개", 1백만원 미만 보유 "804만명". Self-reported by operators; not an official national statistic.

**’25년 하반기 가상자산사업자 실태조사 결과 (2026-03-25).** VERIFIED-PRIMARY.
URL: https://www.fsc.go.kr/no010101/86534
- 시가총액 "87.2조원", 일평균 거래규모 "5.4조원", 거래가능 계정 "1,113만개", 원화예치금 "8.1조원", 가격변동성 "73%", 단독상장 "296개", 1백만원 미만 보유 "826만명", 최다 연령대 "30대".
- SECONDARY (press rendering, not on the page I read): 거래중단 66건 (+14%), 유의종목 지정 95건 (+32%).

**2026년 상반기 가상자산사업자 실태조사 결과 (2026-10-02).** VERIFIED-PRIMARY via the KDI 경제정책자료 copy (summary level); fsc.go.kr original page not located.
URL: https://eiec.kdi.re.kr/policy/materialView.do?num=287644
- 평가총액 △33%, 일평균 거래규모 △44%, 원화예치금 △35%, 이용자 계정 +0.4%, "단독상장 가상자산(234종)".
- SECONDARY (경향신문 2026-10-02, opened: https://khan.co.kr/article/202610020600011): 총 거래규모 555조원 (전기 1001조원 대비 △44.6%), "상반기 신규 거래지원(상장)은 135건" (전기 250건), 거래중단 108건 (+64%), 40대 계정 26.9%가 30대 26.7%를 처음 앞섬. 유의종목 139건 · 종목 평균 변동성 69%는 search snippet only — unverified.

Implication for the app's universe: in H1 2026 roughly 108 trading suspensions against 135 new listings across Korean exchanges — delisting is a base-rate risk, not a tail event; and one in several listed coins is single-exchange (234종).

**「가상자산이용자보호법」 시행 2년 불공정거래 조사 성과 (2026-07-20).** VERIFIED-PRIMARY.
URL: https://www.fsc.go.kr/po010107/87357
- "총 40여건에 대해 조사를 완료하였고", "그 중 30여건을 수사기관 고발·통보"; 시세조종이 대부분; "부당이득은 평균 14억원 수준"; 혐의자 25명.
- Named methods: 경주마 (주문을 특정 시간대에 집중해 상승률 상위에 올린 뒤 매수 유인), 가두리 (입출고 차단 중 가격을 올린 뒤 처분), API 키 대여 단기 시세조종, 발행자 SNS 허위정보.
- Exchanges apply 이상거래 적출기준 · 상시감시 · 반복 시 주문 제한; counts of preventive measures not published on this page.

**Investor loss statistics from Korean regulators: NOT-FOUND.** The surveys report holdings distribution (most accounts under ₩1 million), not profit and loss.

**DAXA statistics on abnormal trading: NOT-FOUND** (two PDF links surfaced; not opened).

**Effect of the 2024-07 Act on prices / listing pumps (causal study): NOT-FOUND.** Only enforcement counts above.

### 5.2 Market structure

- Four Pillars (20 Jul 2026), SECONDARY, citing third parties: alt-coins about 85% of Korean volume; tail assets outside the top 30 are 58% of Upbit volume vs 23% and 19% on two global exchanges; Upbit near 72% domestic share; kimchi premium "averaged 2 to 3% and peaked at 10.88% in March 2024", negative by late 2025. URL as in 3.1.
- 한국은행 2025 하반기 금융안정보고서: 국내 가상자산→주식 전이효과 0.5% vs 글로벌 3.2%, attributed to a retail, spot-only structure. SECONDARY (press rendering only; BOK document not opened).

### 5.3 Kimchi premium as a predictor

- Makarov & Schoar, "Trading and arbitrage in cryptocurrency markets", JFE 135(2), 2020: SECONDARY in this pass (search rendering): premia widen when BTC appreciates; a common order-flow component explains about 80% of BTC returns across exchanges.
- 조기정·박종현·안현철 (2023), 한국산학기술학회논문지 24(10) — VERIFIED-PRIMARY (PDF): https://www.kais99.org/jkais/journal/Vol24No10/vol24no10p041.pdf. Upbit vs a global exchange BTC, 2017-09-26 ~ 2023-04-06. "평균 김치프리미엄으로 회귀하는 경향"을 선형회귀로 보였다 — premium mean-reverts; framed as cross-border arbitrage that a Korean retail user cannot execute. Not a return-direction result.
- **Kimchi premium level or change predicting subsequent KRW returns, out of sample: NOT-FOUND.** Claims that "premium turning positive precedes rallies" or "high premium marks tops" come from media commentary and contradict each other.

### 5.4 Korean academic work

- Choi, Kang, Yoon — "Herding behaviour in Korea's cryptocurrency market", Applied Economics 54(24), 2022. VERIFIED-PRIMARY (RePEc abstract): https://ideas.repec.org/a/taf/applec/v54y2022i24p2795-2809.html. Hourly data, eight major coins, CSAD method: "anti-herding behaviour at shorter time intervals"; "herding behaviour is stronger over longer time intervals in a down market."
- Upbit outage event study — see 3.3.
- **Account-level study of Korean crypto retail performance: NOT-FOUND.** Only a self-report survey (more than half say they profited) seen in a search snippet — SECONDARY, unverified, and self-report.
- 자본시장연구원 / 한국금융연구원 report quantifying listing or delisting price effects: NOT-FOUND (their crypto output found is legal/institutional).

---

## 6. Retail behaviour and losses

**Auer, Cornelli, Doerr, Frost, Gambacorta — BIS Working Paper 1049 (14 Nov 2022; revised 2023).** VERIFIED-PRIMARY (BIS landing page).
URL: https://www.bis.org/publ/work1049.htm
- 95 countries, 2015–22, daily exchange-app usage. Quote: "a rising Bitcoin price is followed by the entry of new users"; "About 40% of these new users are men under 35".
- Quote: "back of the envelope calculations suggest that around three-quarters of users have lost money on their Bitcoin investments"; "an estimated 73-81% of retail investors have likely lost money on their initial investment."
- This is a simulation from app-download timing and prices, **not** observed account profit and loss. The statement that large holders sold while small holders bought is in the PDF, which I could not open — NOT-FOUND here.

**Kogan, Makarov, Niessner, Schoar — "Are Cryptos Different? Evidence from Retail Trading", NBER WP 31317 (Jun 2023); JFE 159, 2024.** VERIFIED-PRIMARY (NBER page + conference draft PDF).
URLs: https://www.nber.org/papers/w31317 · https://conference.nber.org/conf_papers/f175907/f175907.pdf
- 200,000+ retail accounts at one international broker, 1 Jan 2015 – 15 Dec 2019. Quote: "Retail traders in our sample are contrarian in stocks and gold, yet the same traders follow a momentum-like strategy in cryptocurrencies."
- Mechanism: the crypto pattern "is predominantly driven by investors not actively" rebalancing after price moves — they let winners ride — whereas in stocks they actively sell into rises. The relationship extends about one week ("a much weaker but still positive relationship for cumulative lagged returns one week out").
- Quote: "price changes imply a change in the likelihood of future widespread adoption".
- Use for a coach: the user's instinct after a rise in a coin differs from their instinct after a rise in a stock; the mirror should be asset-class specific.

**Schatzmann & Haslhofer — "Exploring investor behavior in Bitcoin: a study of the disposition effect", arXiv 2010.12415; Digital Finance 2023.** VERIFIED-PRIMARY (abstract).
URL: https://arxiv.org/abs/2010.12415
- On-chain proxy (transfers to exchanges = sales): "investors in Bitcoin were indeed subject to the disposition effect, with varying intensity", more evident from 2017. An unpublished thesis using one exchange's account data reports the opposite sign (SECONDARY, not opened) — the crypto disposition effect is **not settled**.

**Leverage / liquidation losses of retail accounts:** only the aggregate liquidation rates in 3.8. Account-level loss study: NOT-FOUND. (Not applicable to a KRW spot-only user in any case.)

**Attention / social media → buying → returns:** see §4 (influencer tweets: up for one to two days, negative by day 10 and day 30 — SECONDARY; Twitter-promoted pumps: −2.2% per 1σ — VERIFIED-PRIMARY preprint). Reddit/Telegram attention study with out-of-sample test: NOT-FOUND in this pass.

---

## 7. Synthesis for the app

Constraints restated: KRW spot, ~100 coins, 5-minute and daily bars, news, listings; no derivatives, no order book, no on-chain attribution; horizon 1h–5d; no execution; the app's direction model has zero skill over the majority class.

### 7(a) Six best-evidenced, concretely testable conditions

Every test below should report, side by side: (i) the unconditional rate over the same dates and coins, (ii) the majority-class rate, (iii) a **coverage-matched placebo** — the same number of coin-days drawn at random within the same month and size bucket, repeated to get a distribution — and (iv) the BTC-adjusted version (coin return minus β × BTC return).

**1. New KRW listing → negative drift over the next 1–7 days.**
- Evidence: 2026 Upbit listings — day-7 close 20–65% (median 45%) below day-1 high for >40% pumps; 8 of 14 recent listings closed day one below the open (practitioner, SECONDARY). 2025 listings bought at day-1 close: median −80.9% to Mar 2026 (SECONDARY, unadjusted). Academic cross-listing samples: abnormal returns negative from day +2, but CAAR[1,5] "not statistically significant" (thesis). App's own: next-day up-rate 23.4% vs 45.9%.
- Expected size: large in raw terms, unknown after BTC/alt-market adjustment.
- Honest baseline: same-date up-rate of all non-new coins; small-cap bucket up-rate; placebo.
- Main risk: tiny n per year (59 Upbit KRW listings in 2025); the whole sample sits in an alt-coin bear market; the pump itself is shrinking (median day-one gain 42% → 10% in mid-2026), so the conditional distribution is non-stationary.

**2. Next-day and next-week realized range/volatility from the app's own 5-minute bars (HAR).**
- Evidence: BTC out-of-sample MZ-R² 0.13 (HAR) to 0.18 (signed semivariance) at 1 day; 0.22–0.34 at 7 days (VERIFIED-PRIMARY, 2017–2020).
- Honest baseline: yesterday's realized variance; 22-day mean; hour-of-week seasonal profile.
- Report interval coverage, not just R²: a 95% GARCH band covered 85.3% on BTC; conformal 88.5% in one version. Target: realized coverage within ±2pp of nominal on a rolling year.
- Main risk: alt-coin evidence not found; jumps degrade 1-day forecasts when modelled separately; listing days and warning-flag days must be excluded or separately bucketed.

**3. Time-of-week volatility profile (weekend/Saturday lull, on-the-hour bursts).**
- Evidence: day-of-week, hour-of-day and within-hour periodicity; weekend volatility and volume lower, "most pronounced on Saturdays"; periodicity improves out-of-sample fit (VERIFIED-PRIMARY, 2017–2021, USD venues).
- Expected size: not extracted; test on KRW bars in KST.
- Baseline: flat profile.
- Main risk: this is about the size of moves, not direction; Korean retail hours may shift the profile relative to the USD-venue result.

**4. Sign of short-horizon autocorrelation split by coin size/liquidity.**
- Evidence: weekly reversal in small illiquid coins (t = −7.31) vs weekly momentum in large liquid coins (t = 2.33) (working paper); daily reversal concentrated in low-volume pairs — 0.65%/day vs −0.19% value-weighted (VERIFIED-PRIMARY) and gone after 30–40 bps for value-weighted portfolios.
- Expected size at the app's level: a few percentage points of conditional up-rate at most; the paper returns are long-short portfolio returns, not hit rates.
- Baseline: majority class within each liquidity tercile (not pooled — pooling hides the opposite signs).
- Main risk: Korean "tail" coins are heavily traded locally (58% of Upbit volume outside the top 30 — SECONDARY), so global size ≠ local liquidity; choose the bucketing variable before looking.

**5. Abnormal volume/price spike in a small coin with no matching news → reversal.**
- Evidence: organised pumps +25% in 70 seconds, reversal from 70 seconds, "After an hour, most of the initial effects disappear" (VERIFIED-PRIMARY, 2018–19); Twitter-promoted events −2.2% post-event CAR per 1σ of pre-event tweets (preprint); influencer tweets −2.24% at 10 days, −6.53% at 30 days (SECONDARY). Korean regulator describes the same shape as 경주마 and 가두리.
- Test: 5-minute volume z-score and return spike, no news item in the prior N hours, small-cap bucket → return over next 1h, 1d, 3d. Add Upbit's official caution flags as a second trigger definition.
- Baseline: placebo spike times in the same coin; spikes **with** news as the contrast group.
- Main risk: with 5-minute bars the pump and most of the reversal are already inside one or two bars; base rate 0.3% of token-days in the source sample; the no-news label depends on the app's news coverage, so missing news looks like "no news".

**6. Extreme down day in a large coin → next-day rebound (the app's own 56.0% vs 45.9%).**
- Evidence: patterns after overreaction days are statistically present in major coins but "do not give rise to exploitable profit opportunities" (VERIFIED-PRIMARY abstract, 2013–2017); the largest coins show daily momentum rather than reversal in a 3,600-coin sample (SECONDARY) — which **points the other way**.
- Expected size: the app's +10pp is larger than anything the literature supports; treat as a hypothesis to break.
- Baseline: placebo (random top-10 coin-days, same months); split by BTC regime (above/below 200-day mean); cluster by date — ten coins falling on the same day are one event, not ten.
- Main risk: date clustering inflates n; survivorship in "top-10" membership (define membership as of the day before); bear-market bounces vs bull-market dips behave differently.

Not in the six, but worth a note: the multi-horizon trend factor is the best-documented cost-surviving return signal (net 1.90–2.45%/week in the top 100 through May 2022), yet it is a one-week, long-short, 68%-turnover portfolio with no post-2022 test — it is a ranking backdrop for "which coins are in an uptrend", not a 1h–5d direction call.

### 7(b) Popular signals that are fragile or contradicted

| Popular claim | Status | Source |
|---|---|---|
| "Momentum works in crypto" (plain 1–4 week) | Significant in only 49% of reasonable designs; crash-prone | Trend-factor paper, VERIFIED |
| "Buy the dip / oversold bounce" in alt-coins | Reversal is a thin-coin liquidity premium; value-weighted alpha gone after costs | Riksbank WP 413, VERIFIED |
| "Buy the new listing" | Day-1-close buyers of 2025 KRW listings: median −80.9% | Practitioner, SECONDARY |
| "Whale alert = sell/buy signal" | Minute-scale, sign depends on transfer type, largest category shows nothing | Author summary, SECONDARY |
| "CPI/FOMC days move BTC in a predictable direction" | Primary source finds BTC "orthogonal to monetary and macroeconomic news"; later contrary claims unverified | NY Fed SR 1052, VERIFIED |
| "ETF inflows predict price" | <10% of 7-day price change explained; flows also react to price | Industry notes, SECONDARY |
| "Kimchi premium predicts tops / rallies" | No out-of-sample evidence either way | NOT-FOUND |
| "Influencer or community buzz is bullish" | Up for 1–2 days, negative by day 10 and 30 | SECONDARY + preprint |
| "LLM / deep-learning model predicts crypto direction" | No persistent net alpha shown; selected-event accuracy figures are not deployable hit rates | Review preprint, VERIFIED |
| "Liquidation cascades can be anticipated" | "No variable is event-invariant" across seven cascades | Preprint, VERIFIED |
| "95% volatility bands" from a standard model | Covered 85.3% (GARCH) on BTC in one study | Preprint v1, VERIFIED |

### 7(c) Not testable without data the app lacks

- **Derivatives**: funding rates, basis/carry ("a high crypto carry predicts future price crashes"), open interest, liquidation volumes, cascade precursors.
- **On-chain**: exchange inflow/outflow by wallet type, whale wallet accumulation, stablecoin issuance and flow attribution.
- **Order book**: spoofing/허수주문, depth imbalance, the first 70 seconds of a pump, maker-side reversal capture.
- **Cross-venue**: kimchi premium by coin needs a reference price from a global venue plus an FX rate; deposit/withdrawal suspension status (the 가두리 condition) needs the exchange's wallet-status data.
- **Account-level behaviour**: whether Korean users lose money, and how, needs the user's own entered trades — the app can only mirror its own user.

### 7(d) "Cause → evidence → result" for coins vs stocks

Stocks have filings, earnings and analyst numbers as first-party facts. Coins mostly do not. The verifiable equivalents, in order of how much of a typical move they explain:

1. **Market-wide share first.** For an alt-coin the opening line should be how much of the move is the market's: rolling β to BTC × BTC's move, with the residual shown separately. Support: a common component explains about 80% of BTC returns across venues (SECONDARY) and alt-coins are 85% of Korean volume (SECONDARY). This is computable from the app's own bars, so it is always available and never "unknown".
2. **Exchange status facts (official API).** Upbit's 페어 목록 조회 returns `market_event` — "종목 경보 정보" — with `warning` ("유의 종목 여부") and `caution` types `PRICE_FLUCTUATIONS` ("가격 급등락 경보"), `TRADING_VOLUME_SOARING` ("거래량 급증 경보"), `DEPOSIT_AMOUNT_SOARING` ("입금량 급증 경보"), `GLOBAL_PRICE_DIFFERENCES` ("국내외 가격 차이 경보"), `CONCENTRATION_OF_SMALL_ACCOUNTS` ("소수 계정 집중 거래 경보"). VERIFIED-PRIMARY: https://docs.upbit.com/kr/reference/list-trading-pairs.
   - These flags are the coin analogue of a stock's 투자주의/경고 designation and are a citable fact with a timestamp.
   - A new market code appearing in that list is itself the listing fact; a `warning` flag is the 유의종목 fact. Both come from the official API rather than from scraping notice pages. (This derivation is my inference from the documented fields — confirm against the API terms of use; I did not read the terms.)
3. **Listing age.** Days since the KRW market opened, with the conditional base rate from signal 1.
4. **Scheduled supply events.** Unlock/vesting dates from the project's own documentation or contract; effect evidence is practitioner-only (§3.4), so present as a dated fact, not as a forecast. Third-party unlock calendars: check their terms before use.
5. **Protocol events.** Upgrades, forks, governance votes from the project's own repository or governance forum (first-party, public). No verified return effect — cite as fact only.
6. **Scheduled macro times.** CPI and FOMC dates from the issuing agencies' public calendars; say "known time of higher volatility risk", never a direction (§3.6).
7. **Regulator facts.** 금융위 · FIU · 금감원 press releases (public): enforcement patterns (경주마, 가두리), delisting counts, single-exchange coin counts — useful as context for "what kind of coin is this".
8. **News items the app already holds**, with a first-seen timestamp, and the explicit absence of news as a fact ("no item in our coverage in the prior N hours") — worded as a coverage statement, not as proof nothing happened.

What differs in the "result" step: for stocks the result can be tied to a fundamental quantity (earnings surprise → drift). For coins the honest result line is a **conditional base rate with its baseline and sample size** ("after this kind of day, up the next day 56.0% of the time vs 45.9% usually; n = …; random-day placebo …") plus the volatility forecast, because that is where the measurable skill is.

Sources deliberately **not** proposed: scraping exchange notice pages, messenger/community channel monitoring, unofficial liquidation or whale feeds, and any third-party aggregator whose terms were not read.

---

## Appendix — source list by grade

VERIFIED-PRIMARY (opened): JFQA trend factor (Cambridge PDF) · FFA WP 3/2023 · Riksbank WP 413 · CESifo WP 6861 abstract · NAJEF intraday abstract (RePEc) · arXiv 2602.10785 · arXiv 2609.04917 · arXiv 2407.09546 (abstract) · arXiv 2502.14897 · arXiv 2606.27100 · arXiv 1912.05228 · arXiv 2109.12142 · arXiv 2507.05470 v1 · BRL WP 5 · Erasmus thesis 65625 · PMC10395473 abstract · NY Fed SR 1052 · arXiv 2311.10739 · BIS WP 1087 page · arXiv 2102.04591 · arXiv 2607.27070 · Griffin-Shams 2018 draft · dergipark 5483714 · Makarov-Schoar 2022 draft · CLS Blue Sky authors' post · ABFER draft of Li-Shin-Wang · arXiv 2306.02148 · BIS WP 1049 page · NBER w31317 + conference draft · arXiv 2010.12415 abstract · Applied Economics 54(24) abstract (RePEc) · KAIS 24(10) PDF · fsc.go.kr 85419, 86534, 87357 · KDI copy 287644 · docs.upbit.com 페어 목록 조회.

SECONDARY (practitioner / press / search rendering): Four Pillars ×3 · Keyrock · FalconX · Crypto Valley Journal author summary · 경향신문 2026-10-02 · Zaremba et al. 2021 · Dobrynskaya 2023 · Han-Kang-Ryu · Cakici et al. 2024 · Shen-Urquhart-Wang ×2 · Dhawan-Putniņš 2023 · Merkley et al. 2024 · Makarov-Schoar 2020 · BOK 금융안정보고서 rendering · press counts of 유의종목/거래중단.

NOT-FOUND: post-2022 replication of LTW factors · crypto foundation-model benchmark · crypto LLM study with post-cutoff test · alt-coin HAR out-of-sample R² · academic Upbit listing or delisting event study · hard fork / airdrop effects · next-day returns after liquidation cascades · Fed study of rising CPI sensitivity · kimchi premium as an out-of-sample return predictor · Korean account-level retail performance · Korean regulator loss statistics · DAXA abnormal-trading statistics · causal effect of the 2024-07 Act · run-up size in percent from Félez-Viñas et al. · Hamrick et al.

Unverified assumption to check before using cost figures: the app's actual round-trip fee on Upbit KRW markets (I did not open the fee schedule).
