# Research B — Where short-horizon prediction / decision support actually works out of sample

Date: 2026-11-13. Scope: Korean stocks (5-minute and daily bars), KRW crypto pairs, headlines, disclosure titles, program / foreign / institution flows. No order execution. Horizon 1 hour to 5 days.

## How to read this file

- **Grades.** `VERIFIED-PRIMARY` = I downloaded and read the paper's own text (PDF full text, or the publisher/Crossref abstract) and the numbers and quote come from it. `SECONDARY` = the number comes from a search summary, press brief or practitioner report, not the paper itself. `NOT-FOUND` = I could not open a primary source; no number is given.
- **Method.** PDFs were fetched with `curl` and text-extracted locally; numbers were read from the extracted text, not from search snippets. Table cells extracted from PDFs can be misaligned, so any figure you intend to cite in a paper should be re-read in the original table.
- **Working-paper caveat.** Several sources are working-paper versions (noted per entry). Published versions may differ (e.g. Frydman-Wang 20% vs 17%, Barber et al. 5-day vs 20-day).
- **Not opened at all** (cited only as pointers, no numbers): Diebold-Mariano 1995, López de Prado purged/embargoed CV, Brier/Murphy decomposition, Holm 1979, Benjamini-Hochberg 1995, Tetlock 2011, Kaniel-Saar-Titman 2008. White 2000 and Hansen 2005 were opened only as bibliographic records with no abstract.

## Headline

1. **Direction is barely predictable; volatility and range are strongly predictable.** Best-documented short-horizon direction effects have R² of about 1-3% (intraday market momentum) or tens of basis points over days (event drift / reversal). Realized volatility has out-of-sample Mincer-Zarnowitz R² of 0.26-0.70 at one day.
2. **Selective prediction's headline accuracy is mostly base rate and persistence.** The one paper that checks coverage-matched naive baselines finds a gap of +1.7 to +7.4 pp, with only one of five horizons statistically distinguishable from zero.
3. **Korean investor-flow signals look strong in sample and fail out of sample** in the only paper found that runs a frozen-parameter test (OOS Sharpe -1.65).
4. **Conditional structure (events x news x volume x who is buying) is where the evidence points**, which matches the app's own finding that conditional base rates differ from the unconditional rate while the model shows no skill.

---

## 1. Selective prediction / abstention

### 1.1 Chalkidis & Savani (2021), "Trading via Selective Classification" — VERIFIED-PRIMARY
- URL opened: https://arxiv.org/pdf/2110.14914 (ICAIF'21, 8 pages)
- Predictable: sign of next move on 30-minute bars of commodity futures ("97482 30-minute intervals"), walk-forward train/validate/test.
- Effect size, binary classifiers (Table 1, test set): non-selective accuracy 51.23-53.66%; selective accuracy 52.19-56.52% at coverage 37.03-63.17%. Best: LSTM FS4 53.66% -> 56.52% at 38.14% coverage. Logistic regression FS1 53.24% -> 54.64% at 63.17%.
- Ternary (Table 2): non-selective 42.67-54.66%; selective 48.71-63.00% at coverage 16.83-55.11% (LR FS2 46.12% -> 63.00% at 17.95%).
- After costs: slippage 0-0.5 tick. Many out-of-sample Sharpe values in the results table are negative (e.g. LSTM rows -0.86, -0.89, -0.23, -0.76). The authors' claim is relative only.
- Quote: "Lower coverage values resulted in higher accuracy levels."
- Quote: "We consider these results to be a promising proof of concept"
- Weakness for our purpose: **no majority-class or persistence baseline at matched coverage is reported.** The gain is +1.4 to +2.9 pp in the binary case.
- Korea / crypto: not tested.

### 1.2 Gupta & Liu (2026), "Selective Prediction and the Persistence Illusion: A Diagnostic Decomposition of VIX Regime Classification", J. Risk Financial Manag. 19(8):609 — VERIFIED-PRIMARY
- URLs opened: https://mdpi-res.com/d_attachment/jrfm/jrfm-19-00609/article_deploy/jrfm-19-00609.pdf and Crossref record for DOI 10.3390/jrfm19080609. (The request cited "Risks"; the journal is JRFM.)
- Task: classify VIX >= 20 at N = 5, 10, 15, 20, 25 days ahead; 5000 trading days July 2006-May 2026; chronological 80/20 split (test 2022-2026); RF, HGB, XGBoost, 36 features. This is a **volatility-regime task, not return direction.**
- Table 4 (covered test days):

| N | RF coverage | Persistence coverage | Persistence acc. | RF selective acc. | RF - Persistence |
|---|---|---|---|---|---|
| 5 | 76.3% | 81.4% | 90.2% | 91.9% | +1.7 pp |
| 10 | 60.1% | 71.1% | 87.2% | 90.0% | +2.8 pp |
| 15 | 51.3% | 64.1% | 85.6% | 90.0% | +4.4 pp |
| 20 | 31.7% | 45.7% | 88.6% | 92.7% | +4.2 pp |
| 25 | 26.9% | 21.2% | 82.9% | 90.3% | +7.4 pp |

- Only N = 10 has a bootstrap interval excluding zero: "(+2.8 pp, 95% CI [+0.18, +5.27])"; and "only the N = 10 interval excludes zero."
- Base rate: majority class "achieves approximately 70% accuracy on the test window before any model is fit."
- At N = 25: "balanced accuracy equals 50%, indicating a coin-flip result despite 90% selective accuracy."
- Transitions: "the confidence filter yields 0% accuracy on every covered calm→high transition—across 16 distinct transition episodes at N = 5".
- On jointly covered days the RF and the persistence rule "disagree on at most 3 of 708 shared days".
- Answer to "does accuracy at low coverage survive honest baselines?": **mostly no.** The model abstains exactly where the information is (regime changes) and keeps the easy persistent days.
- Reusable protocol: coverage-matched baseline, joint-coverage decomposition (McNemar), transition audit, risk-coverage curve, abstention confound test.

### 1.3 FinAbstain, arXiv 2607.24875 (Torres, Cheng, Huang, 2026) — VERIFIED-PRIMARY (and it is not evidence)
- URL opened: https://arxiv.org/pdf/2607.24875
- Targets "one- and five-day abnormal-return direction, twenty-day volatility intervals".
- Quote: "Table II and all plots in this section contain simulated values"; "They are not outcomes of an executed backtest."
- The "72% of cases" coverage figure is a designed scenario. **Do not cite as empirical support.**

**Topic 1 verdict.** Abstention raises accuracy on covered cases by 1-3 pp in the one empirical trading paper, without honest baselines. Where baselines are matched, most of the gain is base rate. A paper from this app must report (a) majority class at the same coverage, (b) a coverage-matched naive conditional rule, (c) balanced accuracy, (d) accuracy on sign-change days.

---

## 2. Calibration and conformal prediction under distribution shift

### 2.1 Gibbs & Candès (2021), "Adaptive Conformal Inference Under Distribution Shift" — VERIFIED-PRIMARY
- URL opened: https://arxiv.org/pdf/2106.00170
- Section 2.2 applies ACI to daily realized volatility (squared return with a GARCH(1,1) point forecast) for stocks; target 1 - alpha = 0.9.
- Result is graphical (local coverage over a 500-day window): ACI coverage "always stay within the variation that would be expected from an i.i.d. Bernoulli sequence", while the non-adaptive method "undergoes large excursions away from the target level".
- Selection caveat stated by the authors: the four plotted stocks "were selected out of a total of 12 stocks that we examined because they showed a clear failure of the non-adaptive method."
- Guarantee is long-run marginal coverage for any data-generating process; it says nothing about interval width or tail calibration.

### 2.2 Aich, Aich & Jain (2025, v6), "Temporal Conformal Prediction (TCP): Rolling Calibration for Financial Risk Forecasting" — VERIFIED-PRIMARY (preprint)
- URL opened: https://arxiv.org/pdf/2507.05470 (latest version; earlier versions report different numbers, e.g. 88.5% for Bitcoin per search summary — SECONDARY)
- 13 financial series, 1,448 common forecast dates, nominal 95%.
- Coverage: TCP 0.9523 (S&P 500), 0.9537 (Bitcoin), 0.9427 (Gold). Plain rolling quantile regression: 0.8377, 0.8550, 0.8101. Clipped ACI: 0.9441, 0.9448, 0.9399. Mean absolute deviation from 0.95: CQR 0.003272, TCP 0.003432.
- The important negative: "In 52 paired interval-score comparisons between TCP and four volatility-based benchmarks, 42 favour the volatility model and ten show no significant difference."
- Quote: "good full-sample interval coverage does not ensure lower-tail calibration."
- Quote: "The standard split-conformal guarantee requires exchangeability and does not automatically apply to the dependent returns"

**Topic 2 verdict.** Hitting nominal coverage within about 0.5 pp on daily returns including Bitcoin is achievable with rolling/adaptive conformal. Uncorrected quantile regression under-covers by 10-14 pp. Coverage alone is a weak claim: a GARCH/HAR-scaled interval usually wins on interval (Winkler) score. The honest product is "volatility model for width + conformal wrapper for coverage", evaluated on both.
- Korea: NOT-FOUND (no Korean-market conformal study opened).

---

## 3. Volatility and range forecasting

### 3.1 Corsi (2009), "A Simple Approximate Long-Memory Model of Realized Volatility", J. Financial Econometrics 7(2) — VERIFIED-PRIMARY
- URL opened: https://statmath.wu.ac.at/~hauser/LVs/FinEtricsQF/References/Corsi2009JFinEtrics_LMmodelRealizedVola.pdf
- Table 5, out-of-sample Mincer-Zarnowitz R² of HAR(3) (daily re-estimation, 1000-observation moving window):

| Series | 1 day | 1 week | 2 weeks |
|---|---|---|---|
| USD/CHF | 0.551 | 0.609 | 0.570 |
| S&P 500 futures | 0.696 | 0.698 | 0.627 |
| T-Bond futures | 0.264 | 0.440 | 0.438 |

- AR(1) for comparison: S&P 500 0.640 / 0.323 / 0.166.
- Quote: "the parsimonious HAR(3) model steadily outperforms the short-memory models at all the three time horizons"
- Samples: USD/CHF Dec 1989-Dec 2003; S&P 500 futures Jan 1990-Jul 2007; tick data.

### 3.2 Christensen, Siggaard & Veliyev (CREATES RP 2021-03; J. Financial Econometrics 2023) — VERIFIED-PRIMARY (working-paper version)
- URL opened: https://repec.econ.au.dk/repec/creates/rp/21/rp21_03.pdf
- 29 Dow Jones stocks, 2001-2017, test set 847 days, one-day-ahead MSE relative to HAR.
- Reductions vs HAR with the larger predictor set (M3): ridge 8.5%, elastic net 9.0%, random forest 9.4%, neural nets 11.5% average (peak 11.8%). With only the three HAR lags (M1) ridge "is on par with HAR".
- Quote: "we notice only a minuscule decrease in MSE of 0.4% moving from M1 to M2."
- Reading: **HAR is the honest baseline and it is hard to beat by more than about 10%.**

### 3.3 Hu, Kuo & Härdle (2019/2021), "Risk of Bitcoin Market: Volatility, Jumps, and Forecasts" — VERIFIED-PRIMARY (preprint)
- URL opened: https://arxiv.org/pdf/1912.05228
- Full-sample HAR regressions for Bitcoin log realized variance: Mincer-Zarnowitz R² 0.237 (h = 1 day), 0.229 (h = 7), 0.238 (h = 30); with jump terms 0.211 / 0.245 / 0.329. These are **in-sample** fits; out-of-sample evaluation uses 90-day rolling windows (numbers not extracted).
- Quote: explicit jump modelling "is unnecessary for the short-term realized variance forecast."

### 3.4 Kim & Jun (2018), price-limit change and intraday volatility in Korea — VERIFIED-PRIMARY (preprint)
- URL opened: https://arxiv.org/pdf/1805.04728
- After the 15% -> 30% limit change on June 15, 2015: "the market becomes more volatile in the intraday horizon". Relevant as a regime break for any Korean volatility model trained across 2015.

**Topic 3 verdict.** Volatility R² (0.24 for Bitcoin, 0.26-0.70 for futures/FX at 1 day) is one to two orders of magnitude above direction R² (about 0.01-0.03, Section 4.6). 5-minute bars are the standard input for realized variance. This is the most reliable thing the app can forecast.
- Korea-specific HAR out-of-sample numbers: NOT-FOUND.

---

## 4. Event-conditioned predictability

### 4.1 Post-earnings-announcement drift (PEAD)

**Martineau (2022), "Rest in Peace Post-Earnings Announcement Drift", Critical Finance Review 11 — VERIFIED-PRIMARY (accepted draft)**
- URL opened: https://cfr.ivo-welch.info/published/papers/martineau2021rest.pdf
- Quote: "For large stocks, PEAD have been non-existent since 2006 but has only disappeared recently for microcap stocks."
- "since 2006 ... analyst earnings surprises fail to positively predict post-announcement returns over 60 days for all-but-microcap stocks, and since 2016 for microcap stocks."
- Announcement-date responsiveness in 2016-2019 vs 1984-1990: six times (all-but-microcap) and three times (microcap) higher.

**Rebuttals and reconciliation — SECONDARY**
- URL opened: https://anderson-review.ucla.edu/is-post-earnings-announcement-drift-a-thing-again (UCLA Anderson brief)
- Dickerson, Julliard & Mueller (JFE, in press) and Hirshleifer, Peng & Wang (RFS 38(3)) report drift alive (t about 14 in the latter). Subrahmanyam's working paper (SSRN 5930255), U.S. Feb 2001-Dec 2024: drift factor t = 2.18 all stocks, t = 1.43 excluding microcaps.
- Quote from the brief: "This suggests the inclusion of the microcaps was the reason PEAD appeared."

**Korea: Sustainability 12(22):9358 (2020), search attention and PEAD — VERIFIED-PRIMARY**
- URL opened: https://mdpi-res.com/d_attachment/sustainability/sustainability-12-09358/article_deploy/sustainability-12-09358.pdf
- KOSPI + KOSDAQ, January 2016-July 2019. Table 5, extreme SUE deciles (SUE10 - SUE1), abnormal returns in %:

| Window | All | KOSPI | KOSDAQ |
|---|---|---|---|
| CAR[0,0] | 1.756 | 1.653 | 1.831 |
| CAR[0,1] | 1.980 | 1.915 | 2.028 |
| CAR[2,61] | 5.055 | 4.073 | 5.758 |
| CAR[0,61] | 7.024 | 5.973 | 7.777 |

- Quote: "ﬁrms with more investor attention ... have stronger announcement-day reactions and weaker post-earnings-announcement drift."
- Reading: PEAD was still present in Korea in 2016-2019 and larger on KOSDAQ; it is weaker where retail attention is high. Short sample (3.5 years), in-sample, no costs, 60-day horizon (longer than the app's 5 days). Other Korean PEAD studies (Eom-Hahn-Sohn; Wang-Lee) were seen only as search summaries — SECONDARY.
- Data gap: needs earnings surprise (SUE). The app has disclosure **titles** only, so a quantitative SUE is not available without adding financial statement data.

### 4.2 News-driven drift vs non-news reversal

**Jiang, Li & Wang (2021), "Pervasive underreaction: Evidence from high-frequency data", JFE 141(2) — VERIFIED-PRIMARY (abstract only, via Crossref record of SSRN 2679614)**
- URL opened: https://api.crossref.org/works?query.title=Pervasive+underreaction... (DOI 10.2139/ssrn.2679614; journal DOI 10.1016/j.jfineco.2021.04.003)
- Quote: "Prices tend to drift in the same direction as the initial market response for several days after the news arrival without reversals."
- Quote: "remains profitable after transaction costs."
- Effect sizes: NOT-FOUND (full text paywalled; the PDF I tried was a different paper).

**Ke, Kelly & Xiu (2019), "Predicting Returns with Text Data", NBER w26186 — VERIFIED-PRIMARY**
- URL opened: https://www.nber.org/system/files/working_papers/w26186/w26186.pdf
- Dow Jones Newswires; one-day-ahead long-short on article sentiment: annualized Sharpe 4.29 equal-weighted vs 1.33 value-weighted; average one-day long-short return 33 bps; daily turnover about 94%.
- Speed: price response in the first 15 minutes is 52 bps for small stocks vs 11 bps for large; 59 bps for high-volatility vs 12 bps for low-volatility firms. Fresh news 39 bps vs 23 bps stale.
- After costs (10 bps per day assumed, turnover-limited portfolio): "the net Sharpe ratio peaks at 2.3 when γ = 0.5."
- Reading: predictability is concentrated in small, volatile stocks and decays within days; it needs full article text scored by a supervised model, not headlines.

**Tetlock (2007), "Giving Content to Investor Sentiment", J. Finance 62(3) — VERIFIED-PRIMARY**
- URL opened: https://www.columbia.edu/~pt2238/papers/Tetlock_Media_Sentiment_JF.pdf
- Quote: "a one standard deviation change in pessimism on the next day's Dow Jones returns is 8.1 basis points"; reversal over lags 2-5 is 6.8 bps. Market-level, daily, reverses within a week. Tiny.
- Tetlock 2011 (stale news): not opened — NOT-FOUND.

**Korea: Lee, Park & Son (2023), "A Study on Reversals after Stock Price Shock in the Korean Distribution Industry", J. Distribution Science 21(3) — VERIFIED-PRIMARY**
- URL opened: https://www.koreascience.kr/article/JAKO202308156805283.pdf
- KOSPI distribution-sector stocks, Jan 2004-Jul 2022; event = |daily return| > 10%. Table 3 (values as printed; whether "1 to 5" is a cumulative or average abnormal return should be re-checked in the original):
  - After large increases (7,317 events): day 1 +0.916***, days 1-5 -0.372***, days 1-20 -0.227***.
  - After large decreases (3,375 events): day 1 -0.716***, days 1-5 +0.779***, days 1-20 -0.339***.
- Pattern: **one more day of continuation, then reversal over days 1-5.** High event-day volume strengthens the reversal after rises.
- Quote: "A significant negative(positive) cumulative return appeared after a large-scale rise(fall) in stock price."
- The paper cites the drift-with-news / reversal-without-news split (Savor 2012) as motivation; the search summary says shocks without disclosure reversed and those with disclosure drifted — that split is SECONDARY here.
- Caveats: one sector, in-sample, no costs.

**Nagel (2011/2012), "Evaporating Liquidity", NBER w17653 — VERIFIED-PRIMARY**
- URL opened: https://www.nber.org/system/files/working_papers/w17653/w17653.pdf
- Short-term reversal returns "close to 1% per day" early in the sample, "declined steadily to less than 0.2% per day", and are "highly predictable with the VIX". Reversal profit is compensation for liquidity provision and rises when volatility is high — a conditioning variable the app can compute.

**Medhat & Schmeling (2022), "Short-term Momentum", RFS 35(3) — VERIFIED-PRIMARY (abstract only)**
- URL opened: https://openaccess.city.ac.uk/id/eprint/31278/
- Quote: "significant short-term reversal among low-turnover stocks"; "whereas high-turnover stocks exhibit short-term momentum". One-month horizon; numbers NOT-FOUND.

### 4.3 Overnight vs intraday

**Lou, Polk & Skouras (2019), "A tug of war", JFE 134 — VERIFIED-PRIMARY**
- URL opened: https://personal.lse.ac.uk/polk/research/TugOfWar.pdf
- Overnight-return persistence portfolio: overnight three-factor alpha 3.47% per month (t = 16.83), intraday alpha -3.02% per month (t = -9.74). Intraday persistence: 2.41% per month (t = 7.70) intraday, -1.77% overnight (t = -7.89).
- Quote: "profits are either earned entirely overnight ... or entirely intraday, typically with profits of opposite signs"
- U.S. sample; monthly formation. The mechanism (clienteles) is the reason to split every Korean target into overnight and intraday legs.

**Korea — SECONDARY (abstract-level only)**
- Kim & Byun (2011), KOSPI 2003-01-02 to 2011-04-30 (URL opened: https://koreascience.kr/article/JAKO201103750648232.page): previous-day foreign and institutional net purchases have a significantly **negative** effect on next-day close-to-close return and a **positive** effect on the overnight (close-to-open) leg. No coefficients on the page; the English abstract is internally inconsistent on the open-to-close leg.
- KAIST master's thesis (2021), 809 KOSPI stocks 2011-2020: no first-30-minute momentum, reversal in the last hour (search summary; the page did not load).
- Korean ETF preprint: positive overnight, negative intraday (search summary; download blocked).

### 4.4 Attention-driven buying and reversal

**Barber & Odean (2008), "All That Glitters", RFS — VERIFIED-PRIMARY**
- URL opened: https://faculty.haas.berkeley.edu/odean/papers%20current%20versions/allthatglitters_rfs_2008.pdf
- Individuals are net buyers of attention-grabbing stocks: "the buy-sell imbalance is −18.15% for stocks in the lowest volume decile. For stocks in the highest volume vingtile, the buy-sell imbalance is +29.5%".

**Barber, Huang, Odean & Schwarz (2020 WP; J. Finance 2022) — VERIFIED-PRIMARY (working-paper version)**
- URL opened: https://www.smallake.kr/wp-content/uploads/2020/12/SSRN-id3715077.pdf
- Quote: "Average five-day abnormal returns are -3% (-6%) for the top stocks purchased each day (more extreme herding) by Robinhood users."
- 20-day decline "totals almost 5% (9%)". Published abstract reports 20-day -4.7% (SECONDARY, search summary).
- U.S., 2018-2020, small and attention-heavy stocks; short side is hard to trade, but the app only needs a "this is a crowded-buy day" probability.

**Korea — SECONDARY (abstract)**
- JKDAS 26(5), 2024 (URL opened: https://scholar.kyobobook.co.kr/article/detail/4010070044002): KOSPI 1999-2023, five 5-year subperiods; individual net buying negatively Granger-causes future returns; response "dissipates almost entirely by the third day". No coefficients on the page.

### 4.5 Price limits, magnet effect, volatility interruptions (VI)

**Du, Liu & Rhee, magnet effect on the Korea Stock Exchange (2005 WP; Int. Review of Finance 2009) — SECONDARY**
- Not opened (download and RePEc page both failed). Search summary: magnet effect present in return, volume, volatility, order flow and order type as the limit nears; narrower limits accelerate faster. Pre-2015 (15% limits) and built on **order-flow and order-type data the app does not have.**

**Eom, Kwon, La & Park (2022), "Dynamic and Static Volatility Interruptions: Evidence from the Korean Stock Markets", JRFM 15(3):105 — VERIFIED-PRIMARY**
- URL opened: https://mdpi-res.com/d_attachment/jrfm/jrfm-15-00105/article_deploy/jrfm-15-00105.pdf
- VI counts per subperiod: 1,068; 958; 1,113; and 5,796 after static VI was added in 2015 (0.64 -> 3.44 per stock).
- Intraday range one hour before vs after a VI: dynamic VI 0.0756 -> 0.0501 (2014), 0.0936 -> 0.0588 (post-event 2015); static VI 0.0855 -> 0.0725 (n = 2,852). All differences significant at 1%.
- Quote: "dynamic VI is effective in price stabilization and discovery"; for dynamic VI "the proportion of reversals is indeed statistically significantly greater than 0.5".
- Usable finding: **volatility falls by about a third in the hour after a dynamic VI and by about 15% after a static VI.** That is a volatility statement, not a direction signal. The reversal test compares the call-auction price with the potential execution price, which needs auction data the app does not have.
- Post-2015 empirical test of reversal after limit hits in Korea: NOT-FOUND.

### 4.6 Intraday market momentum (feasible with 5-minute bars)

**Gao, Han, Li & Zhou (2015 WP; JFE 2018), "Intraday Momentum" — VERIFIED-PRIMARY (working-paper version)**
- URL opened: https://c.mql5.com/forextsd/forum/173/intraday_momentum_-_the_first_half-hour_return_predicts_the_last_half-hour_return.pdf
- S&P 500 ETF 1993-2013. Quote: "The predictive R2 of the first half-hour return on the last half-hour return is 1.6%"; with the twelfth half-hour added, 2.6%. Out of sample: "the R2 is 1.2%" (1.8% combined). Timing strategy Sharpe 1.08 (6.19% volatility) vs Always Long -0.18. Stronger on high-volatility, high-volume and news days.

**Baltussen, Da, Lammers & Martens (2021), "Hedging demand and market intraday momentum", JFE 142 — VERIFIED-PRIMARY**
- URL opened: https://www3.nd.edu/~zda/intramom.pdf
- Over 60 futures, 1974-2020: return from previous close to the last 30 minutes predicts the last 30 minutes. Equity futures adjusted R² 1.49-2.74%; bonds 0.2-0.66%. Sharpe "between 0.87 and 1.73 at the asset class level".
- Decay/rebuttal inside the paper: in the extended equity sample the Gao et al. first-half-hour predictor has "negative R2 OOS, −1.71%". The effect "reverts over the next days" and is tied to gamma hedging by option market makers and leveraged ETFs.
- Korea: KOSPI 200 has large options and leveraged-ETF markets, so the mechanism is plausible; but the KAIST thesis (4.3, SECONDARY) reports last-hour **reversal** in individual KOSPI stocks. Sign in Korea is an open, testable question.

**Topic 4 verdict.** The repeatable pattern across markets: news-accompanied moves drift, no-news and attention/liquidity-driven moves reverse; reversal is stronger when volatility is high and when retail buying is concentrated. Sizes are tens of bps to a few percent over 1-5 days, concentrated in small, volatile, retail-heavy names — which describes KOSDAQ.

---

## 5. Investor-type flow predictability in Korea

### 5.1 Kang (2026), "When the Rules Change: Adaptive Signal Extraction via Kalman Filtering and Markov-Switching Regimes" — VERIFIED-PRIMARY (preprint, single author)
- URL opened: https://arxiv.org/pdf/2601.05716
- Korean market 2020-2024, daily transactions by investor type (foreign, domestic institutional, individual).
- In sample: foreign flow coefficient 0.00534 (t = 25.04) in bull regimes rising to 0.01873 in crisis (3.51x). Foreigners respond 5.31x more strongly to negative than positive shocks (contrarian); individuals chase positive shocks.
- Out of sample (parameters frozen at 2022-12-31, test 2023-2024): "The strategy achieves a Sharpe ratio of -1.65 during the 2023-2024 test period, with a maximum drawdown of -48% and annualized return of -29.5%." 2023 Sharpe -3.52; 2024 -0.17.
- Quote: "these in-sample regularities do not generalize reliably"
- This is the single most relevant warning for the app: very large in-sample t-statistics on flow, negative out-of-sample result.

### 5.2 Choe, Kho & Stulz (1999), NBER w6661 — VERIFIED-PRIMARY
- URL opened: https://www.nber.org/system/files/working_papers/w6661/w6661.pdf
- Korea, Nov 30 1996-end 1997, trade-level investor-type data. Foreigners are positive-feedback traders: "foreign investors buy stocks that did well the previous day and sell stocks that performed poorly." Flow follows returns; it does not lead them.

### 5.3 Choe, Kho & Stulz (2004/2005), NBER w10502 — VERIFIED-PRIMARY
- URL opened: https://www.nber.org/system/files/working_papers/w10502/w10502.pdf
- Quote: "disadvantage of foreign money managers is of 21 basis points for purchases and 16 basis points for sales." Foreigners are not better informed at short horizons; "prices move more against foreign investors than against domestic investors before trades."

### 5.4 Other Korean evidence — SECONDARY
- Kim & Byun (2011) and JKDAS (2024): see 4.3 and 4.4. Signs: prior-day foreign/institution net buying -> lower next-day close-to-close, higher overnight; individual net buying -> lower subsequent returns for about 3 days.
- U.S. comparison (Boehmer, Jones, Zhang & Zhang 2021, J. Finance; search summary only): stocks with retail net buying outperform by about 10 bps over the following week — **opposite sign** to the Korean individual-investor result, about half attributed to return reversal/liquidity provision.
- Program trading: search summary only — changes in net program trading "do not cause changes in spot return"; causality runs from returns to program trading. Direct next-day test: NOT-FOUND.

**Topic 5 verdict.** Flow mostly reacts to returns. The robust part is the sign for individual net buying (negative, short-lived), consistent with Section 4.4. Foreign-flow "informativeness" is regime-dependent and did not survive a frozen out-of-sample test. Treat flow as a conditioning variable for reversal, not as a stand-alone signal.

---

## 6. Crypto

### 6.1 Liu & Tsyvinski (2018 WP; RFS 2021), "Risks and Returns of Cryptocurrency" — VERIFIED-PRIMARY (working-paper version)
- URL opened: https://www.nber.org/system/files/working_papers/w24877/w24877.pdf
- Time-series momentum: "a one-standard-deviation increase in the current day's Bitcoin return predicts a 0.33 percent increase in the daily return over the next day." Weekly quintiles: top 11.22% per week (Sharpe 0.45) vs bottom 2.60% (Sharpe 0.19).
- Attention: one-SD rise in Google searches for "Bitcoin" -> +2.3% two-week-ahead return; Twitter count -> +2.50% one-week-ahead.
- Tails: probability of a -20% day "almost 0.5 percent", +20% day "almost 1 percent".
- Sample 2011-2018 (pre-institutional era); in-sample; no costs.

### 6.2 Liu, Tsyvinski & Wu (2019 WP; J. Finance 2022), "Common Risk Factors in Cryptocurrency" — VERIFIED-PRIMARY (working-paper version)
- URL opened: https://www.nber.org/system/files/working_papers/w25882/w25882.pdf
- 2014-2018, 109 -> 1,583 coins. Weekly long-short: one-week momentum 2.7%, two-week 3.3%, three-week 4.1%, four-week 2.5%; size about 3.4%.
- Momentum is in large coins only: below-median size "statistically insignificant 0.6 percent", above-median "4.2 percent weekly returns".
- Quote: "this strategy does not take into account trading costs and the feasibility of short selling."

### 6.3 Out-of-sample and cost checks
- **Bysik & Ślepaczuk (2026), arXiv 2606.00060 — VERIFIED-PRIMARY (preprint).** URL opened: https://arxiv.org/pdf/2606.00060. Hourly BTC/USDT, about 70,000 observations 2018-2026, 27-fold walk-forward, XGBoost/LSTM/iTransformer. Quote: "naive sign-based strategies fail once transaction costs of ten basis points are imposed." Flagship cost-filtered long-only strategy: 251 trades, Sharpe 1.09, but only 16 of 27 folds profitable (59.26%), median fold return 7.98% vs mean 331.43%, 20 of 27 folds with fewer than 20 trades. "bootstrap evidence does not support formal statistical dominance." A long-only result on an asset that rose strongly is not skill over buy-and-hold by itself.
- **Caporale & Plastun (2019), Brunel WP 1917 — VERIFIED-PRIMARY (abstract).** URL opened: https://www.brunel.ac.uk/economics-finance-and-accounting/research/pdf/1917-Oct-GMC-Momentum-effect-in-the-Cryptocurrency-Market-after-One-day-Abnormal-Returns.pdf. BTC/ETH/LTC 2015-2019: on abnormal-return days prices keep moving in the same direction to the end of the day, and after such days — "exploitable profit opportunities" claimed via trading simulation. In-sample; numbers not extracted.
- **Zaremba et al. (2021), IRFA 78 — SECONDARY** (search summary): prior-day return predicts next-day return; large liquid coins continue, small illiquid coins reverse. Bianchi-Babiak-Dickerson and Fičura report the same split.
- Later out-of-sample replication of the Liu-Tsyvinski-Wu momentum factor: NOT-FOUND (search summaries of a thesis and one study say momentum profits become insignificant after costs — SECONDARY).

### 6.4 Kimchi premium
- **Choi, Lehar & Stauffer (2019) — VERIFIED-PRIMARY (working paper).** URL opened: https://snb.ch/dam/jcr:474400ba-255b-49a4-b2b8-5e3626719730/sem_2019_05_31_lehar.n.pdf
- Quote: "Between January 2016 and February 2018, Bitcoin were in Korea on average 4.73% more expensive than in the United States". Premium rises with transaction costs, confirmation time and volatility; "negatively related to the trading volume". It is a limits-to-arbitrage result, not a return-prediction result. Whether the premium predicts KRW-pair returns: NOT-FOUND.

### 6.5 New listings on Korean exchanges
- **Four Pillars (2026), practitioner report — SECONDARY.** URL opened: https://research.4pillars.io/en/research/2025-korean-cex-listings-post-mortem
- 2025 new KRW listings: Upbit 59, Bithumb 144. Buying at the day-1 close and holding to March 11, 2026: mean -69.5% (Upbit), -69.1% (Bithumb); "The median ROI was -80.9% for Upbit and -82.1% for Bithumb." Profitable: 2 of 59 and 8 of 144.
- Not benchmarked against the altcoin market over the same period (a broad drawdown would explain part of it). Peer-reviewed Korean listing event study: NOT-FOUND.

**Topic 6 verdict.** Daily continuation in liquid coins and reversal in illiquid ones is the best-supported short-horizon crypto pattern; the original momentum evidence is 2011-2018, in-sample and pre-cost. Hourly ML direction does not survive 10 bps. New-listing underperformance is large but only practitioner-documented and not market-adjusted.

---

## 7. Honest evaluation methodology

| Tool | Source | Grade | What to take |
|---|---|---|---|
| Multiple-testing hurdle | Harvey, Liu & Zhu, NBER w20592 — https://www.nber.org/system/files/working_papers/w20592/w20592.pdf | VERIFIED-PRIMARY | 316 factors catalogued. "a newly discovered factor needs to clear a much higher hurdle, with a t-ratio greater than 3.0." Paper works through Bonferroni, Holm and BHY adjustments. |
| Replication rate | Hou, Xue & Zhang, NBER w23394 — https://www.nber.org/system/files/working_papers/w23394/w23394.pdf | VERIFIED-PRIMARY | With NYSE breakpoints and value weights, "286 anomalies (64%) including 95 out of 102 liquidity variables (93%)" are insignificant at 5%. Microcaps are 3% of market value but 60% of stocks. Short-horizon, liquidity-type signals are the least replicable class. |
| Deflated Sharpe | Bailey & López de Prado (2014) — https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf | VERIFIED-PRIMARY | "Not controlling for the number of trials involved in a particular discovery leads to" inflated performance; DSR corrects for trials and non-normality. Record the number of variants tried. |
| Out-of-sample R² vs historical mean | Goyal & Welch, NBER w10483; Campbell & Thompson, NBER w11468 — https://www.nber.org/system/files/working_papers/w10483/w10483.pdf , https://www.nber.org/system/files/working_papers/w11468/w11468.pdf | VERIFIED-PRIMARY | GW: "not a single one would have helped a real-world investor outpredicting the then-prevailing historical equity premium mean." CT: "The out-of-sample predictive power is small, but we find that it is economically meaningful"; a true predictor "is quite likely to have poor out-of-sample performance for an extended period". Use R²_OOS against the prevailing-mean forecast. |
| Conditional predictive ability | Giacomini & White (2006), Econometrica 74(6) — https://ideas.repec.org/a/ecm/emetrp/v74y2006i6p1545-1578.html | VERIFIED-PRIMARY (abstract) | "conditioning can help fine-tune the forecast selection to current economic conditions". Right test for rolling-window forecasts and for "when does the model beat the base rate". |
| Reality check / SPA | White (2000), Econometrica 68(5); Hansen (2005), JBES 23 — RePEc records opened, no abstract | Bibliographic only | Use for "best of many rules vs benchmark". No quotes available. |
| Frozen-parameter forward test | Kang (2026), Section 5.5 (see 5.1) | VERIFIED-PRIMARY | Template: freeze every parameter at a date, score only after it. |
| Coverage-matched selective evaluation | Gupta & Liu (2026) (see 1.2) | VERIFIED-PRIMARY | Six-part protocol for any abstaining forecaster on autocorrelated labels. |
| Interval evaluation | Aich et al. (2025) (see 2.2) | VERIFIED-PRIMARY | Report coverage, width, Winkler score and tail diagnostics; Diebold-Mariano against volatility-scaled intervals. |
| Purged / embargoed CV, Diebold-Mariano, Brier decomposition, Holm, BH | — | NOT-FOUND (not opened) | Standard; cite from originals before use. |
| Preregistration in finance | Search summaries only | SECONDARY | RFS ran registered-report special issues (fintech 2018, climate 2019); J. Behavioral and Experimental Finance has a registered-report track. No asset-pricing prereg norm found. |

Minimum protocol for this app: (1) write the hypothesis, event definition, target, horizon, scoring rule and baseline before looking at post-freeze data; (2) freeze parameters and score forward; (3) baselines = unconditional majority class, prevailing-mean probability, **and** the simplest conditional base rate; (4) Brier skill score with a reliability diagram, plus R²_OOS for magnitude targets; (5) block bootstrap for confidence intervals (overlapping horizons and cross-sectional correlation); (6) Holm or BH across all preregistered hypotheses, and report the count of non-registered variants tried; (7) report results for the transition/rare cases separately.

---

## 8. Forecast combination

- **Rapach, Strauss & Zhou (2010), RFS 23(2) — NOT-FOUND for numbers** (full text blocked at CORE and the journal). Abstract-level, SECONDARY: combining individual predictive regressions delivers statistically and economically significant out-of-sample gains over the historical average. Horizon is quarterly/monthly equity premium — not the app's horizon.
- **Timmermann (2006), "Forecast Combinations" — opened (https://econweb.ucsd.edu/~atimmerm/combine.pdf) but text extraction was unusable; no quote.** Treat as NOT-FOUND.
- **Indirect evidence that is verified:** Goyal-Welch (individual predictors fail out of sample) and Campbell-Thompson (sign and range restrictions restore small gains) in Section 7; Christensen et al. (regularized combination of many volatility predictors beats HAR by 8.5-11.5%) in 3.2.
- Use for the app: average the probability from several simple conditional base-rate rules with shrinkage toward the unconditional rate, instead of selecting the best single rule. No short-horizon direction paper was verified for this.

---

## 9. Human + AI decision outcomes

### 9.1 D'Acunto, Prabhala & Rossi (2018 draft; RFS 2019), "The Promises and Pitfalls of Robo-advising" — VERIFIED-PRIMARY (preliminary draft)
- URL opened: https://conference.nber.org/conf_papers/f101495/f101495.pdf
- Indian brokerage portfolio optimizer. Helps under-diversified investors (fewer than 5 stocks): more diversification, lower volatility, better performance. For those with more than 10 stocks: "It increases the fees they pay, but not their performance."
- Biases: disposition effect falls "by about 30%" (PGR - PLR gap of about 2 pp shrinks by about 0.6 pp); trend chasing falls about 1.2%. "reduces – but does not fully eliminate" biases. Trading and logins increase. Adoption is self-selected (adopters already had higher risk-adjusted performance).

### 9.2 Frydman & Wang (2017 WP; J. Finance 2020), salience natural experiment — VERIFIED-PRIMARY (working-paper version)
- URL opened: https://marketing.wharton.upenn.edu/wp-content/uploads/2017/02/Paper-Frydman-and-Wang-Salience_917.pdf
- Chinese brokerage made the purchase price / capital gain more prominent without changing information. Quote: "the shock causally increased the disposition effect by 20%." (Published abstract: 17% — SECONDARY.)
- Direct relevance: **what the screen makes salient changes behaviour, in the harmful direction here.** The app already hides purchase price by option (F009 FR-27), which is the evidence-consistent choice.

### 9.3 Arnold, Pelster & Subrahmanyam (2020 WP; JFE 2022), "Attention Triggers and Investors' Risk-Taking" — VERIFIED-PRIMARY (working-paper version)
- URL opened: https://www.jbs.cam.ac.uk/wp-content/uploads/2020/08/2020-06-conference-paper-arnold-pelster-subrahmanyam.pdf
- Broker push messages about stocks: "attention trades carry, on average, a 19-percentage point higher leverage compared to non-attention trades." Push alerts about a stock raise risk-taking.

### 9.4 Barber, Huang, Odean & Schwarz (see 4.4) — VERIFIED-PRIMARY (working paper)
- Herding episodes "are related to the simplified display of information on the Robinhood app"; top-bought stocks lose 3% (6%) over five days. Top-mover lists are harmful as a design element.

### 9.5 Greubel, Guhling & Herweg (2026), "AI Persuasion and Financial-Decision Making" — VERIFIED-PRIMARY (working paper, online experiment)
- URL opened: https://www.icp.uni-bayreuth.de/pool/dokumente/Working-Paper/2026_AI-Persuasion-and.pdf
- Quote: "An AI chatbot increases optimal choices by over 20 percentage points when promoting the optimal fund but reduces them by almost 30 points when promoting the dominated fund." Influence "undiminished when framed as bank-provided despite a disclosed interest"; more persuasive than incentivized human advice.
- Reading: AI advice moves choices a lot in both directions; the harm side is larger.

### 9.6 Carlin, Israelsen & Wazzan (2026), NBER w35153, "AI Managed Household Portfolios" — SECONDARY (search summary of abstract and press)
- AI-built portfolios "do not appear to earn statistically-significant abnormal returns"; picks track media attention (recommended stocks had roughly ten times the news coverage).

### 9.7 Gaps
- Randomized brokerage field experiment (2020-2026) showing that displaying **base rates or probabilistic forecasts** at decision time improves realized returns: NOT-FOUND. A pre-registered field trial of generative AI and the disposition effect exists in the AEA registry (trial 16753, September 2025; search summary — SECONDARY), results not found.
- Lab/online evidence that robo-advice lowers the disposition effect while "social" chatbot features raise it again (J. Behavioral and Experimental Economics 2023): SECONDARY.

**Topic 9 verdict.** Verified evidence supports three design claims: diversification tools help the under-diversified; salience of purchase price and push alerts worsen behaviour; AI advice is highly persuasive in both directions. There is no verified evidence that showing forecasts raises realized returns. That gap is itself a publishable contribution if the app logs decisions — but outcome claims need randomized exposure.

---

## Ranked shortlist — five hypotheses to preregister with existing data

Effect sizes below are from other markets or samples; they are priors, not expectations the app is entitled to.

### H1. Next-day and next-hour realized volatility/range is forecastable, and conformalized intervals hit nominal coverage (stocks and KRW crypto)
- **Test.** HAR on 5-minute realized variance (daily, weekly, monthly lags) for 1-hour, 1-day and 5-day horizons; wrap with rolling/adaptive conformal for 90% and 95% return intervals.
- **Support.** Corsi 2009 (OOS R² 0.55-0.70 at 1 day for FX and S&P; 0.26 T-bond); Hu et al. (Bitcoin HAR R² about 0.24 in sample); Gibbs-Candès; Aich et al. (coverage 0.9523 / 0.9537 at 95% target vs 0.84-0.86 uncorrected); Eom et al. (range falls about a third in the hour after a dynamic VI — an event feature).
- **Expected.** R² 0.2-0.6 depending on asset; coverage within 1 pp of nominal.
- **Honest baseline.** Yesterday's realized variance (random walk), EWMA, and historical-simulation intervals; score with QLIKE/MSE, Winkler score, Diebold-Mariano. Beating HAR with ML by more than about 10% is unlikely (Christensen et al.).
- **Main risk.** It is not direction; conformal alone lost to volatility-scaled intervals on interval score in 42 of 52 comparisons. The 2015 limit change and VI rules are regime breaks.

### H2. The app's conditional base rates, used as selective forecasts, beat the majority class **and** a coverage-matched naive rule
- **Test.** Preregister a small fixed set of conditions (e.g. after a -2 sigma day; after a >10% day with/without disclosure; after concentrated individual buying). Forecast only when a condition fires; report Brier skill vs unconditional rate, accuracy vs majority at the same coverage, and vs the simplest single-condition rule.
- **Support.** Chalkidis-Savani (+1.4 to +2.9 pp at 37-63% coverage); Gupta-Liu protocol and warning (gap over persistence +1.7 to +7.4 pp, one of five significant); Giacomini-White for conditional evaluation.
- **Expected.** +1 to +3 pp accuracy on covered cases at 10-30% coverage; Brier skill of a few percent.
- **Honest baseline.** Majority class on the covered subset, plus coverage-matched naive conditional rule; balanced accuracy; results on sign-change days separately.
- **Main risk.** Gains are base-rate artifacts of the covered subset; many conditions -> Holm/BH; low event counts.

### H3. After a large one-day move, direction over days 1-5 depends on whether a disclosure/news item accompanied it and on event-day volume (Korean stocks)
- **Test.** Event = |daily return| > 10% (or > k sigma). Split by presence of a disclosure title or headline that day, and by abnormal volume. Hypothesis: no-news/high-volume moves reverse over days 1-5; news-accompanied moves drift.
- **Support.** Lee-Park-Son 2023 (KOSPI distribution sector: after >10% rises, day 1 +0.916 then days 1-5 -0.372; after falls, days 1-5 +0.779; 7,317 and 3,375 events); Jiang-Li-Wang (news-driven returns drift "for several days ... without reversals"); Ke-Kelly-Xiu (response concentrated in small, volatile stocks); Nagel (reversal stronger in high volatility).
- **Expected.** 0.3-0.8% over five days in abnormal return; a few pp shift in up-probability.
- **Honest baseline.** The move-only conditional base rate (ignoring news), plus majority class. The claim is the **interaction**, so the news split must add Brier skill over the move-only rule.
- **Main risk.** Day-1 continuation before reversal makes entry timing matter; headline/disclosure presence is a noisy proxy for information; single-sector prior; limit-hit days truncate returns.

### H4. Concentrated individual net buying on attention days predicts negative abnormal returns over the next 1-5 days (Korean stocks)
- **Test.** Per-stock individual net buying (or minus foreign+institution net buying) scaled by volume, top decile, interacted with abnormal volume / news count. Target: 1-, 3-, 5-day market-adjusted return sign and size.
- **Support.** Barber et al. (5-day abnormal return -3%, -6% for extreme herding); Barber-Odean 2008; JKDAS 2024 (individual net buying negatively Granger-causes KOSPI returns, fading by day 3 — abstract level); Kim-Byun 2011 (prior-day foreign/institution buying -> negative next-day close-to-close, positive overnight — abstract level).
- **Expected.** Much smaller than the U.S. Robinhood figure; plausibly tens of bps over 3 days.
- **Honest baseline.** Short-term reversal alone (prior-return rule) and majority class — flow must add skill beyond the price move it is correlated with.
- **Main risk.** Kang 2026: Korean flow signals with t above 25 in sample gave OOS Sharpe -1.65. Flow follows returns (Choe-Kho-Stulz). Preregister with frozen parameters or do not claim it.

### H5. Index-level intraday momentum: the return from the previous close to 30 minutes before the close predicts the last 30 minutes (KOSPI 200 / KOSDAQ 150 proxies, and BTC/KRW by volume clock)
- **Test.** r(prev close -> 14:50) vs r(14:50 -> 15:20, before the closing auction); also first-30-minute predictor. Report R²_OOS against a zero forecast and sign hit rate against majority.
- **Support.** Gao et al. (R² 1.6% in sample, 1.2% out of sample, Sharpe 1.08); Baltussen et al. (60+ futures 1974-2020, equity R² 1.49-2.74%, Sharpe 0.87-1.73; gamma-hedging mechanism); crypto analogue Shen-Urquhart-Wang (search summary only).
- **Expected.** R² 0.5-2.5%; hit rate 52-54%.
- **Honest baseline.** Zero/prevailing-mean forecast and majority sign; the first-half-hour predictor has negative OOS R² (-1.71%) in the extended sample, so register the rest-of-day version as primary.
- **Main risk.** Horizon is 30 minutes, just under the stated 1-hour floor; Korean single-stock evidence (thesis, secondary) points to last-hour **reversal**; needs an index or ETF 5-minute series; the effect reverts over following days.

### Runner-up (crypto)
- Liquid KRW pairs continue and illiquid pairs reverse at the 1-day horizon (Liu-Tsyvinski 0.33% per SD; Liu-Tsyvinski-Wu 4.2% vs 0.6% weekly by size; Zaremba secondary). Baseline: majority class and unconditional drift. Risk: 2011-2018 evidence, pre-cost, hourly ML fails at 10 bps (Bysik-Ślepaczuk).
- New KRW listings underperform after day 1 (Four Pillars: mean -69%, median -81%; practitioner, not market-adjusted). Testable only if listing dates are captured; must be benchmarked against an altcoin index.

---

## What is NOT feasible with 5-minute bars and no order book

1. **Order-flow imbalance, queue, microprice and depth signals.** The magnet-effect evidence (Du-Liu-Rhee) rests on order flow and order type; none of it is reproducible.
2. **VI call-auction analysis.** Eom et al.'s reversal test uses the potential execution price inside the auction. Only the before/after range can be measured.
3. **Sub-5-minute news reaction.** Ke-Kelly-Xiu's response is measured in the first 15 minutes after arrival and is largest in small stocks; with 5-minute bars and headline timestamps the app sees at most the tail of it.
4. **Full-text sentiment models.** KKX-style supervised scoring needs article bodies and a long labelled history; headlines and disclosure titles support only event-presence and coarse category features.
5. **Earnings-surprise PEAD.** Needs SUE from financial statements or analyst forecasts; disclosure titles do not carry the number.
6. **Realistic cost, slippage and capacity estimates.** Without quotes there is no spread; any "after-cost" claim would be an assumption. Report gross forecast skill and state the cost assumption separately.
7. **Trade-signed or intraday investor-type flow.** Daily investor-type totals cannot identify who initiated trades or when.
8. **Cross-exchange arbitrage claims (kimchi premium).** Needs synchronized offshore prices and FX, and the literature frames it as limits to arbitrage, not return prediction.
9. **Any claim that showing forecasts improved users' returns.** Needs randomized exposure and outcome tracking; the app records no orders.
10. **Tick-level realized measures (jumps, noise-robust estimators).** 5-minute realized variance is standard and sufficient; finer jump decomposition is not available.

---

## Sources opened (index)

Primary full texts or abstracts: arxiv.org/pdf/2110.14914 · arxiv.org/pdf/2607.24875 · arxiv.org/pdf/2106.00170 · arxiv.org/pdf/2507.05470 · arxiv.org/pdf/2601.05716 · arxiv.org/pdf/2606.00060 · arxiv.org/pdf/1912.05228 · arxiv.org/pdf/1805.04728 · arxiv.org/pdf/2507.22409 (opened, not used for numbers) · mdpi-res.com jrfm-19-00609, jrfm-15-00105, sustainability-12-09358 · NBER w26186, w24877, w25882, w20592, w23394, w6661, w10502, w10483, w11468, w17653 · statmath.wu.ac.at Corsi 2009 · repec.econ.au.dk rp21_03 · cfr.ivo-welch.info martineau2021rest · columbia.edu Tetlock 2007 · personal.lse.ac.uk TugOfWar · www3.nd.edu/~zda/intramom.pdf · c.mql5.com Gao et al. WP · faculty.haas.berkeley.edu Barber-Odean 2008 · smallake.kr SSRN-id3715077 · conference.nber.org f101495 · marketing.wharton.upenn.edu Frydman-Wang · jbs.cam.ac.uk Arnold-Pelster-Subrahmanyam · icp.uni-bayreuth.de AI Persuasion · snb.ch kimchi premium · brunel.ac.uk WP 1917 · koreascience.kr JAKO202308156805283 · davidhbailey.com deflated-sharpe · api.crossref.org (Gupta-Liu; Jiang-Li-Wang abstracts) · openaccess.city.ac.uk/id/eprint/31278 · ideas.repec.org Giacomini-White.

Secondary pages: anderson-review.ucla.edu PEAD brief · research.4pillars.io 2025 Korean listings · scholar.kyobobook.co.kr JKDAS 2024 abstract · koreascience.kr JAKO201103750648232 abstract · search-result summaries where marked.

Blocked or failed (no numbers taken): SSRN abstract pages (403), mdpi.com HTML (403; mdpi-res.com PDFs worked), core.ac.uk, hermes-ir.lib.hit-u.ac.jp, cdar.berkeley.edu, preprints.org, centaur.reading.ac.uk, cesifo.org, koasas.kaist.ac.kr (page did not load), econweb.ucsd.edu Timmermann (unreadable extraction).
