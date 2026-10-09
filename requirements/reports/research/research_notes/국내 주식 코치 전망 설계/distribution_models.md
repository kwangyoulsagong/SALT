# Distribution / volatility models for 1–4 week individual-stock return quantiles (Korea focus)

Context for the reader: the current system is a random-walk normal (trailing 1-year vol) plus an empirical-quantile ensemble, with normalized pooled CQR, a weekly grid and a 52-week calibration pool. On a biased 51-stock Korean sample it beat RW by only 0.4–1.0% pinball, and all of that came from a positive median shift. These notes cover what the literature says can beat those baselines, and by how much.

Research budget note: about 20 searches and fetches. Primary sources were opened for Gu-Kelly-Xiu (PDF text extracted), Baruník et al. (arXiv HTML) and TCP (arXiv HTML). Everything else rests on abstracts or search summaries, and is marked that way where it matters.

## 1. Volatility forecasting at weekly/monthly horizons (EWMA, GARCH family, HAR, range proxies), including Korean evidence

### Takeaway
At weekly to monthly horizons, the evidence that GARCH-family models beat plain historical volatility is weak and mixed. The robust gains come from three sources, none of them a fancier univariate GARCH:
- richer volatility inputs: range or realized measures, and implied volatility such as VKOSPI
- longer-memory or multi-window structure (HAR-like or ML on multi-window volatility)
- pooling across stocks

For Korea, every out-of-sample study I found is at the index level (KOSPI/KOSPI200). I found no study of individual Korean stocks.

### Cited Findings
- **Survey of 93 studies:** Poon & Granger reviewed 93 volatility-forecast comparison papers covering stocks, indices, FX and rates, in developed and emerging markets. They found option-implied volatility is best. Among time-series models they give only a tentative ranking, with historical volatility above GARCH above stochastic volatility, and state "no model is a clear winner." — [Poon & Granger, FAJ 2005 (IDEAS)](https://ideas.repec.org:443/a/taf/ufajxx/v61y2005i1p45-56.html); [review PDF](https://c.mql5.com/forextsd/forum/215/Forecasting%20Volatility%20in%20Financial%20Markets%20-%20A%20Review%20(revised%20edition).pdf)
- **Horizon and crisis behavior:** Brownlees, Engle & Kelly (J. Risk 2011/12) find that model rankings are insensitive to the forecast horizon. 2008 crisis volatility stayed within 1% risk bands up to one month ahead. Caveat: the test assets are equity indices and FX, not single stocks. — [Journal of Risk](https://www.risk.net/journal-risk/2161026/practical-guide-volatility-forecasting-through-calm-and-storm); [PDF](https://c.mql5.com/forextsd/forum/222/A%20Practical%20Guide%20to%20Volatility%20Forecasting%20through%20Calm%20and%20Storm.pdf)
- **ML vs HAR on single stocks:** Christensen, Siggaard & Veliyev (J. Financial Econometrics 2023) forecast realized variance for 29 DJIA stocks over 2001–2017.
  - ML (regularization, trees, NN) beats the HAR family even when its only inputs are daily/weekly/monthly lagged RV.
  - The advantage grows at longer horizons, which the authors attribute to the higher persistence the ML models capture.
  - Caveat: this uses intraday RV. I could not confirm from the abstract whether estimation was pooled across stocks. — [IDEAS](https://ideas.repec.org:443/a/oup/jfinec/v21y2023i5p1680-1727..html); [CREATES WP](https://repec.econ.au.dk/repec/creates/rp/21/rp21_03.pdf)
- **Korea, KOSPI200:** Chun, Cho & Ryu (Physica A 2019) compare lagged RV, GARCH-family models and implied measures. VKOSPI forecasts best overall. GJR-GARCH is best within the GARCH family. Both historical and implied measures are biased. — [IDEAS](https://ideas.repec.org/a/eee/phsmap/v514y2019icp156-166.html)
- **Korea, VKOSPI vs alternatives:** Ryu (2012) finds VKOSPI beats Black-Scholes IV, RiskMetrics and GJR-GARCH at forecasting realized volatility. GJR fits best in-sample, which is the classic in-sample vs out-of-sample reversal. — [IDEAS (EMFT 2012)](https://ideas.repec.org/a/mes/emfitr/v48y2012i0p24-39.html)
- **Korea, weekly KOSPI:** asymmetric models (GJR, QGARCH) do not clearly beat GARCH(1,1) out of sample. Results are mixed across horizons and criteria. The search summary attributes this to Hojin Lee; I did not verify the exact bibliographic mapping. — [IDEAS](https://ideas.repec.org/p/zbw/ifwedp/20157.html)
- **Korea, structural breaks:** a recursive full-sample GARCH(1,1) on KOSPI is hurt by two breaks in unconditional variance, and rolling windows do better out of sample. This directly supports short or rolling estimation windows over long fixed windows. — [Kyobo Scholar](https://scholar.kyobobook.co.kr/article/detail/4010024478822)
- **Korea, regime-switching:** MRS-GARCH on daily KOSPI (2000–2014) does poorly at short horizons and well at long horizons out of sample. — [KoreaScience, Heo & Sung 2015](https://koreascience.or.kr/article/JAKO201521056137941.page?&lang=ko)
- **Korea, HAR for VKOSPI:** Han, Kutan & Ryu (2015) model VKOSPI in a HAR framework. Adding US returns and VIX improves out-of-sample forecasts, so a global or market volatility state carries information. — [IDEAS](https://ideas.repec.org/a/ris/eaerev/0117.html)
- **Korea, VaR:** Jeon (2013) finds realized-volatility models give better VaR forecasts than GARCH-family models for KOSPI and KOSDAQ (index level). — [Emerald JDQS](https://www.emerald.com/jdqs/article/21/2/135/200432/Value-at-Risk-Forecasting-using-Realized)
- **Range-based inputs (daily-bar proxy when there is no intraday data):** range-based models give more accurate out-of-sample VaR than GARCH. Examples:
  - Brazil — [SciELO RCF](https://new.scielo.br/j/rcf/a/4T7yvwScttdFpDfpGCKQN8C/?lang=en)
  - Parkinson-range GARCH-t had zero VaR failure rate on 9 of 10 Asia-Pacific indices — [Philippine Review of Economics](https://pre.econ.upd.edu.ph/index.php/pre/article/view/178)
  - Brandt & Jones (2002) range-EGARCH beats the return-based model out of sample (secondary summary) — [MPRA 21028](https://mpra.ub.uni-muenchen.de/21028/1/MPRA_paper_21028.pdf)
  - Caveat: all of this is index-level.
- **Evaluation losses:** Patton (2011, J. Econometrics) shows that only "robust" losses keep the true ranking when the volatility proxy (squared returns, range, RV) is noisy. MSE and QLIKE qualify. QLIKE is reported to have more power and to be less dominated by extremes than MSE. — [Duke Scholars](https://scholars.duke.edu/publication/792433); [arXiv 2502.02695 summary](https://arxiv.org/pdf/2502.02695)

### Inferences
- Do not expect a per-stock GARCH or GJR to beat trailing volatility by much at 1–4 weeks. Several of the studies above find the reverse ordering or mixed results. Better candidates:
  - (a) Use OHLC range estimators (Garman-Klass, Yang-Zhang, Parkinson) as inputs, since they are more efficient than close-to-close returns.
  - (b) Use HAR-style multi-window volatility (1w/1m/3m/12m) instead of a single 1-year window.
  - (c) Add a market volatility state (VKOSPI, or KOSPI realized vol).
- A one-year trailing window is likely too slow. The Korean break evidence and the ML persistence result both point to blending short and long windows, which is the core HAR idea. EWMA (RiskMetrics) is the cheapest version of this.
- Use QLIKE to evaluate the scale component separately from pinball loss, so that scale gains are not hidden by location noise.

### Gaps
- I found no out-of-sample study of individual KOSPI or KOSDAQ stocks comparing HAR, GARCH and historical volatility at weekly or monthly horizons. The search pointed to DBpia, KCI and RISS, which I did not search directly. The closest is a 2010 Ewha thesis on 5 stocks, GARCH vs IGARCH only — [Ewha dspace](https://dspace.ewha.ac.kr/handle/2015.oak/212603).
- I could not extract typical QLIKE improvement percentages (vs historical volatility) for single stocks at weekly or monthly horizons from the sources I opened.

## 2. Cross-sectional / panel pooling and features

### Takeaway
Pooling is where the large, documented out-of-sample gains are:
- Panel HAR across assets (Bollerslev et al. 2018) beats per-asset models.
- A single pooled quantile neural network across thousands of stocks beats per-stock GARCH by about 2–9% in average pinball loss at a 22-day horizon, and by about 40% in volatility MAD/RMSE.
- Volatility has a strong common factor, so market and sector volatility are natural pooled features.

### Cited Findings
- **Panel HAR across assets:** Bollerslev, Hood, Huss & Pedersen, "Risk Everywhere" (RFS 2018). The data cover more than 50 instruments in commodities, FX, equity indices and bonds. Realized-volatility dynamics are similar across assets, and panel-estimated RV models produce out-of-sample forecasts that beat existing models and methods that ignore these cross-asset similarities. They also report utility gains. Disclosure: three of the authors are at AQR. — [RFS published PDF (CBS)](https://research-api.cbs.dk/ws/portalfiles/portal/57308061/lasse_heje_pedersen_et_al_risk_everywhere_publishersversion.pdf); [CEPR DP](https://ideas.repec.org/p/cpr/ceprdp/12687.html)
- **Pooled quantile neural network for stock return distributions:** Baruník, Hroník & Tobek, "Forecasting stock return distributions around the globe with quantile neural networks" (arXiv 2408.07497). — [arXiv HTML](https://arxiv.org/html/2408.07497v1)
  - **Design:** one network pooled across about 5,000 US stocks per month, retrained annually on an expanding window. It is applied out of sample to Europe, Japan and Asia-Pacific stocks for 1995–2018. Horizon is 22 trading days (about 1 month). It predicts 37 quantiles, interpolated with B-splines.
  - **Features:** 194 in total. These include 18 stock-level volatility estimates (EWMA at several decays, a downside variant, 3/6/12-month RV, Parkinson high-low) and 18 market volatility variables.
  - **Average pinball loss vs GARCH, full sample** (my % computed from reported values): US −4.1% (2.550 vs 2.659), Europe −6.6%, Japan −2.8%, Asia-Pacific −9.1%.
  - **Same comparison, liquid sample only:** −1.3% to −2.5%.
  - **Vs a plain 2-hidden-layer NN:** about −0.5%, often not significant.
  - **Volatility forecasts vs GARCH:** MAD about 37–42% lower, RMSE about 43–48% lower.
  - **Coverage of the data:** Korea is not in the sample.
  - **Interpretation:** most of the gain over GARCH appears in illiquid or full samples, which is where small-cap tails live. Architecture differences beyond "pooled NN with volatility features" add little.
- **Multi-quantile NN on firm characteristics:** Liu (SSRN 4491887) reports that a non-crossing multi-quantile NN on firm and macro characteristics beats linear, tree-based and feed-forward models. I saw the abstract only. — [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4491887)
- **Common factor in volatility:** Herskovic, Kelly, Lustig & Van Nieuwerburgh (JFE 2016) show that firm-level idiosyncratic volatilities share a strong common factor (CIV), which is also priced. — [NBER w20076](https://www.nber.org/papers/w20076.pdf)
- **Return predictability features:** in Gu, Kelly & Xiu (RFS 2020), the dominant return predictors across methods are momentum, liquidity and volatility signals. Liquidity variables include dollar volume, Amihud illiquidity, zero-trading days and bid-ask spread. — [NBER w25398](https://www.nber.org/papers/w25398.pdf)

### Inferences
- The highest-expected-value upgrade is a pooled model across the whole KOSPI+KOSDAQ universe, not 51 per-stock models. Two forms are possible:
  - pooled quantile gradient boosting or quantile NN on volatility-normalized returns
  - simpler: a pooled HAR-type regression of log realized/range variance on multi-window own volatility, market volatility (KOSPI RV or VKOSPI), size, turnover, price level and sector
- Expected gain over a per-stock baseline is a few percent in pinball loss overall. It should be larger for illiquid or small caps, based on the full-sample vs liquid-sample gap in Baruník et al.
- The 51-stock biased sample is too small to train or evaluate pooled models credibly. Pooling needs the full listed universe, including delisted stocks, to avoid survivorship bias.
- Earnings-announcement proximity and price-limit-hit history are plausible features but are not evidenced in the sources I opened.

### Gaps
- I found no pooled versus per-stock quantile-forecast comparison on Korean stocks.
- I found no source with explicit feature-importance rankings for volatility or tail quantiles. Baruník et al. do not rank features.
- I could not confirm pooled vs per-stock estimation in Christensen et al.

## 3. Should the median/location be zero for 1–4 weeks?

### Takeaway
Yes, by default. Individual-stock mean predictability is tiny: the best ML models reach about 0.4% monthly R² against a zero forecast. A historical-mean forecast is beaten by zero by about 3 percentage points of R². A positive median learned from a trailing sample is therefore the textbook way to "win" in-sample and lose out of sample. A 0.4–1.0% pinball gain that comes entirely from a median shift on a biased 51-stock sample should be treated as likely survivorship or sample-drift artifact.

### Cited Findings
- **Zero is the right benchmark (Gu, Kelly & Xiu, RFS 2020, PDF text):** they benchmark individual-stock R² against zero, not the historical mean, because "the historical mean stock return is so noisy that it artificially lowers the bar." Benchmarking against historical means inflates monthly R² of all methods "by roughly three percentage points"; for example, OLS-3 shows 3.74% against the historical mean. Their conclusion: "the historical mean is such a noisy forecaster that it is easily beaten by a fixed excess return forecast of zero." — [NBER w25398](https://www.nber.org/papers/w25398.pdf)
- **How small the predictable part is:** monthly stock-level out-of-sample R² is 0.33% (NN1) to 0.40% (NN3) for the best neural networks. Penalized or dimension-reduced linear models are lower. — [NBER w25398](https://www.nber.org/papers/w25398.pdf)
- **Pooled distribution model, mean and median:** global mean-forecast R² is about 1.36% for the two-stage distribution model. Median-based R² is about 0.09 on the full sample and about 0.50 on the liquid sample. The values are small, and they come from 194 characteristics, not from trailing drift. — [Baruník et al. arXiv 2408.07497](https://arxiv.org/html/2408.07497v1)

### Inferences
- Set the location to 0, or to a small risk-free or market-implied drift, and spend modeling effort on scale and shape. Over 1–4 weeks, a median shift of even a few tenths of a percent is far larger than any documented predictable mean.
- If the ensemble's entire edge over random-walk normal comes from a positive median, re-run with the median forced to 0. Also evaluate on a survivorship-free universe that includes delisted and KOSDAQ small caps. The expected result is that the edge disappears or reverses.
- Product implication, consistent with the repo's ADR-003 / no-point-target positioning: a zero-drift, scale-only distribution is also the most defensible not to imply direction.

### Gaps
- I found no Korean-specific estimate of weekly individual-stock mean predictability, or of the size of survivorship bias, in the sources I opened.

## 4. Distribution shape: fat tails, skew, ±30% limits; Student-t / skewed-t / FHS vs empirical quantiles

### Takeaway
Korean returns are fat-tailed. The 2015 widening of daily limits from 15% to 30% raised measured tail risk and intraday volatility, so pre-2015 data understate current tails. Studies of daily price limits also show that tight limits truncate and understate tail risk. Pooled models report that truncating extreme quantiles understates variance and kurtosis.

### Cited Findings
- **Tail risk vs limit width:** a Korean study on 1990–Oct 2015 data finds tail risk is underestimated when limits are tight. With wide limits, leptokurtic-distribution tail risk is 20–30% above normal-based estimates. Tail risk more than doubled in periods with limits of 12% or more versus earlier. I did not identify the authors. — [earticle A329658](https://www.earticle.net/Article/A329658)
- **Intraday volatility after the change:** Kim & Jun find intraday volatility rose after the 15 June 2015 change from 15% to 30%. — [arXiv 1805.04728](https://www.arxiv.org/pdf/1805.04728)
- **Liquidity after the change:** Seon (2016) finds no net change in liquidity after the expansion. — [Sunderland repository](https://sure.sunderland.ac.uk/id/eprint/9973/)
- **Random walks after the change:** more stocks follow a random walk under the 30% regime than under 15% (variance-ratio tests, 2012–2017). The authors call the result suggestive. — [AJEER](https://asianonlinejournals.com/index.php/AJEER/article/view/259)
- **Current limit:** KRX daily limit is ±30% of base price. — [KRX](https://global.krx.co.kr/contents/GLB/06/0602/0602010201/GLB0602010201T5.jsp)
- **Truncated tails in pooled models:** truncating extreme tails in quantile/distribution models leads to underestimated variance and especially kurtosis. — [Baruník et al.](https://arxiv.org/html/2408.07497v1)
- **Fat-tailed parametric choices in VaR:** Parkinson-range GARCH with Student-t was the best VaR model on Asia-Pacific indices. — [PRE](https://pre.econ.upd.edu.ph/index.php/pre/article/view/178)
- **Korean index VaR:** transformed-GARCH and fat-tailed/long-memory models are compared in Korean index VaR studies. — [Sookmyung](https://scholarworks.sookmyung.ac.kr/handle/2020.sw.sookmyung/13905?mode=full); [KoreaScience 2013](https://www.koreascience.or.kr/article/JAKO201309256124849.page)

### Inferences
- **Training window:** do not train tail quantiles on pre-June-2015 data without adjustment. For a 52-week empirical-quantile model this is moot, but it matters for any longer pooled history.
- **Recommended shape model:** the practical, well-founded choice is location 0, plus scale from the volatility model, plus standardized residual quantiles estimated from the pooled panel. This is filtered historical simulation applied to a panel of volatility-standardized returns. It adapts scale per stock and borrows tail shape from thousands of stocks. Per-stock empirical quantiles from 52 weeks hold about 52 points per stock, which is far too few to estimate 5%/95% tails at a 4-week horizon.
- **Skew:** allow skew by size or volatility bucket in the pooled standardized-residual distribution, rather than fitting skewed-t per stock.
- **Limit hits:** at 1–4 weeks, the ±30% daily limit rarely binds on the h-week sum. It matters mainly for consecutive limit-hit episodes, such as KOSDAQ themes.

### Gaps
- I found no source documenting skewness by size bucket for Korean small caps.
- I found no direct out-of-sample comparison of Student-t vs skewed-t vs FHS vs empirical quantiles for Korean individual stocks at weekly horizons.

## 5. Conformal calibration for non-exchangeable time series and panels

### Takeaway
Use conformalized quantile regression (CQR) on volatility-normalized scores, plus an online correction:
- ACI, or its adaptive-step successor
- or weighted, recency-decayed calibration (NexCP)

Check coverage per volatility bucket. Mondrian (group-conditional) calibration by ex-ante volatility bucket is the standard tool for "coverage must hold for high-vol small caps too." Do not trust "rolling conformal" finance papers at face value: the one finance-specific paper I examined (TCP) badly under-covers.

### Cited Findings
- **CQR:** Romano, Patterson & Candès (NeurIPS 2019) conformalize quantile regression. Intervals adapt to heteroskedasticity and are shorter than other conformal methods, with finite-sample marginal coverage under exchangeability. — [arXiv 1905.03222](https://arxiv.org/pdf/1905.03222.pdf)
- **ACI:** Gibbs & Candès (NeurIPS 2021) is a wrapper around any quantile or point forecaster. It adjusts the working miscoverage level online and achieves the target long-run coverage frequency without distributional assumptions.
  - The follow-up (JMLR 2024) notes that ACI needs a step size matched to the unknown rate of shift. It adds a step-size-tuning layer that adapts to the size and type of shift.
  - The follow-up is tested on stock-market volatility prediction and COVID case counts.
  - [arXiv 2106.00170](https://arxiv.org/abs/2106.00170v3); [JMLR v25 22-1218](https://www.jmlr.org/papers/v25/22-1218.html)
- **NexCP (weighted conformal):** Barber, Candès, Ramdas & Tibshirani (Annals of Statistics 2023) weight calibration points, for example with recency-decaying weights. The coverage loss is bounded by total-variation drift, and the original guarantees are kept if the data are exchangeable. On ELEC2 with drift, unweighted CP covers 0.852 against a 0.90 target, while NexCP reaches about 0.90. — [AoS](https://doi.org/10.1214/23-AOS2276); [arXiv 2202.13415](https://arxiv.org/pdf/2202.13415)
- **Split conformal under dependence:** Oliveira et al. (arXiv 2203.15885) show split conformal stays approximately valid under β-mixing dependence. In their financial experiments, conditional coverage stays near nominal across high- and low-volatility regimes, and larger calibration sets help. This is from a search-result summary; I did not open the full text. — [arXiv 2203.15885](https://arxiv.org/pdf/2203.15885)
- **EnbPI:** Xu & Xie (ICML 2021 / TPAMI 2023) use bootstrap ensembles with leave-one-out residuals. No data split and no exchangeability are needed, and coverage gaps vanish asymptotically under assumptions. — [arXiv 2010.09107](https://arxiv.org/pdf/2010.09107v12)
- **Mondrian conformal:** Mondrian conformal gives coverage ≥ 1−α within each predefined group. Binned conditional coverage is a special case. Standard conformal coverage is only marginal and can under-cover some regions while over-covering others. — [Angelopoulos et al., Theoretical Foundations of CP, arXiv 2411.11824](https://arxiv.org/pdf/2411.11824); [Unified review arXiv 2005.07972](https://arxiv.org/pdf/2005.07972)
- **TCP, a cautionary example:** "Temporal Conformal Prediction" (arXiv 2507.05470) uses LightGBM quantiles on a 252-day window plus an ACI-like threshold update with a "forgetting" heuristic. The heuristic is not covered by the paper's proof.
  - **Coverage at a 95% target (TCP):** S&P 0.861, BTC 0.885, Gold 0.881.
  - **Baselines on the same targets:** 252-day historical simulation covers 0.931 / 0.944 / 0.933. GARCH-normal covers only 0.827–0.853.
  - **Width:** TCP's only advantage is narrower intervals than historical simulation.
  - **Evaluation gaps:** no pinball, CRPS or Kupiec/Christoffersen tests; models are evaluated on different sample counts; there is no regime-conditional coverage table.
  - [arXiv 2507.05470v2](https://arxiv.org/html/2507.05470v2)
- **Four-stock thesis:** a Tampere thesis on 4 stocks compares inductive, Mondrian and time-weighted CP against GARCH and HAC regression. Inductive CP has robust coverage but wider intervals. Adaptive or time-weighted CP trades reliability for efficiency. Classical volatility models stay competitive. — [Tampere trepo](https://trepo.tuni.fi/handle/10024/232978)
- **Tail-specific conformal:** a 2026 paper builds intervals with separate lower- and upper-tail guarantees, exact under exchangeability and asymptotic otherwise. I saw only the abstract summary. — [papers.cool arXiv 2606.18199](https://papers.cool/arxiv/2606.18199)

### Inferences (recommended practice for a panel of many stocks)
- **Normalize first:** score = (realized h-week return − predicted quantile) / ex-ante σ̂, computed with CQR per quantile side. Pooling across stocks is then reasonable, because scale differences are absorbed by σ̂. This matches the current normalized pooled CQR.
- **Pooled scores are not independent:** scores from the same week are cross-sectionally dependent, because a common market shock hits all stocks. A 52-week pool has only 52 independent time points, not 52 × N. Expect weekly coverage to swing together across stocks. Evaluate coverage per week as well as on average.
- **Overlapping targets:** with weekly-step, 4-week-horizon targets, consecutive targets overlap. The effective calibration sample shrinks further. Use non-overlapping or lagged calibration so that no score's target window extends past the forecast origin (leakage).
- **Mondrian by ex-ante volatility (or size/market) bucket:** calibrate each bucket separately so that high-vol small caps get their own conformal quantile. Bin on forecast σ̂, never on realized volatility, which would be circular. Bins need enough weeks × stocks, so 3–5 buckets is realistic.
- **Online correction:** run an ACI-style online update of the miscoverage level on the pooled or per-bucket stream, or use recency-weighted (NexCP) calibration instead of an equal-weight 52-week window. Prefer the adaptive-step variant of ACI, because the rate of regime change is unknown.
- **Report and test:**
  - pinball loss / CRPS for sharpness plus calibration
  - unconditional and conditional coverage, with Kupiec/Christoffersen tests per bucket
  - QLIKE for the scale component
  - Diebold-Mariano or model-confidence-set comparisons across the panel

### Gaps
- I found no paper that tests pooled vs per-asset conformal calibration on a large stock panel.
- I found no public benchmark of Korean individual-stock interval forecasts reporting coverage or pinball/CRPS.
- Korean VaR studies are index-level (KOSPI/KOSDAQ) and use Kupiec-style hit rates — [Sookmyung](https://scholarworks.sookmyung.ac.kr/handle/2020.sw.sookmyung/13905?mode=full); [Emerald](https://www.emerald.com/jdqs/article/21/2/135/200432/Value-at-Risk-Forecasting-using-Realized).
- I could not obtain the ACI paper's numeric stock-volatility results; only the abstract was read.

## 6. Public benchmarks for Korean stock interval forecasts

### Takeaway
I found none. All Korean evidence is index-level volatility or VaR forecasting. The closest non-Korean large-panel benchmark is Baruník et al.: 22-day pinball loss on tens of thousands of global stocks, with GARCH as the baseline.

### Cited Findings
- **Index-level Korean VaR and volatility studies only:**
  - [Jeon 2013](https://www.emerald.com/jdqs/article/21/2/135/200432/Value-at-Risk-Forecasting-using-Realized)
  - [Chun-Cho-Ryu 2019](https://ideas.repec.org/a/eee/phsmap/v514y2019icp156-166.html)
  - [Inderscience good/bad times VaR, Korea](https://www.inderscience.com/filter.php?aid=57338)
- **Global panel benchmark without Korea:** [Baruník et al.](https://arxiv.org/html/2408.07497v1)

### Inferences
- The project would need to build its own honest benchmark:
  - survivorship-free KOSPI+KOSDAQ universe
  - weekly origins, h = 1–4 weeks
  - baselines (a) and (b) from the brief, with location 0
  - metrics: pinball/CRPS, coverage by volatility bucket and market, QLIKE
- Based on the global evidence, a realistic target improvement over random-walk normal is low single-digit percent pinball. This would come from scale and shape (multi-window or range volatility, market volatility, pooled tails), not from location.

### Gaps
- KCI, DBpia and RISS were not searched directly. Korean-language journals (한국증권학회지, 재무연구, 선물연구) may hold individual-stock studies that did not surface in web search.
