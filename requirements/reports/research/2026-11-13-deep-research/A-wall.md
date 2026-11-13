# Research A — the "≈52% wall": primary-source verification

Date of verification: 2026-11-13. Method: abstracts and full texts were downloaded (arXiv abs/HTML/PDF, NBER working-paper PDFs, Crossref publisher-deposited abstracts, RePEc publisher abstracts, author/institution PDFs) and quoted from the downloaded text. Search-result summaries were used only to locate URLs.

Grades: **VERIFIED-PRIMARY** (read in the paper / publisher abstract), **SECONDARY** (only a summary), **NOT-FOUND**.

Caveats on access: OUP (RFS) and Wiley (JF) article pages block direct download; for those I used the publisher-deposited abstract (Crossref API / RePEc) plus the NBER working-paper full text. Where a number comes from the working-paper version rather than the journal version, it is marked "WP version".

---

## Corrections to the earlier pass (read first)

| # | Earlier claim | Status |
|---|---|---|
| 2 | McLean–Pontiff "26%/58% vs 32–35%" conflict | **Not a conflict.** Published abstract: 26% lower out-of-sample, 58% lower post-publication, and 32% (= 58% − 26%) attributed to publication-informed trading. "35%" appears nowhere in the published abstract (it is from older working-paper drafts; not verified here). |
| 11 | "49.67% accuracy study at arXiv 2408.12408" | **WRONG.** 2408.12408 does not contain 49.67% anywhere. Its headline is the opposite: 72.82% test accuracy (xLSTM-TS, EWZ daily) after wavelet denoising. It does say raw-data accuracy was "around 50%". |
| 11 | "22-paper systematic review" | **NOT-FOUND.** Two targeted searches found no review with 22 papers and a realistic-evaluation accuracy figure. Do not cite. |
| 10 | Lopez-Lira & Tang headline numbers | Earlier drafts' numbers are stale. Current version (arXiv v6, 2025-10-28) reports ≈90% hit rate for the *non-tradable* initial reaction, drift Sharpe 2.97, and Sharpe decay 6.54 → 1.22. Still a working paper (no journal reference on arXiv). |
| 8 | TSFM "preregistered" | Exists and 0-of-160 is correct, but "pre-registered" means a locally hashed plan, not a third-party registry (paper says so itself). Single author, posted 4 days ago, not peer-reviewed. |
| 4 | GKX R² | 0.33%–0.40% monthly stock-level is correct, but it is R² **without demeaning** (benchmark = zero forecast), which the paper says inflates R² slightly; ensemble reaches 0.43%. |

---

## 1. Goyal, Welch, Zafirov (2024, RFS 37(11): 3490–3557)

- **Finding:** 29 newer variables (from 26 papers) plus the original 17 were re-tested through end-2021; over one-third of the new ones fail even in-sample, half of the rest fail out-of-sample, a small number survive.
- **Exact numbers:** 29 variables / 26 papers / 17 original variables; "more than one-third" fail IS; "half" of the remainder have poor OOS. No exact failure count is in the abstract.
- **Quote (abstract):** "More than one-third of these new variables no longer have empirical significance even in-sample. Of those that do, half have poor out-of-sample performance. A small number of variables still perform reasonably well both in-sample and out-of-sample."
- **What survives (body of the paper, read via the OUP article page):** four of the new variables stand out on both criteria — `tchi` (14 technical indicators, Neely et al. 2014), `shtint` (short interest, Rapach–Ringgenberg–Zhou 2016), `accrul` (aggregate accruals), `gpce` (Q4 consumption growth, Møller–Rangvid 2015); among pre-2008 variables `tby`, `i/k`, `eqis`. The paper cautions that `accrul` rests largely on the dot-com episode. (This list was extracted by a page-reading tool from the article body, not by me quoting the text directly — treat variable names as VERIFIED-PRIMARY but low-resolution.)
- **URLs opened:** https://api.crossref.org/works/10.1093/rfs/hhae044 · https://ideas.repec.org/a/oup/rfinst/v37y2024i11p3490-3557..html · https://academic.oup.com/rfs/article/37/11/3490/7749383
- **Grade:** VERIFIED-PRIMARY (abstract); survivors list VERIFIED-PRIMARY via article page.

## 2. McLean & Pontiff (2016, JF 71(1): 5–32)

- **Finding:** Anomaly portfolio returns fall after the original sample ends and fall further after publication.
- **Exact numbers:** 97 variables; **26% lower out-of-sample; 58% lower post-publication; 32% (58% − 26%) attributed to publication-informed trading.**
- **Quote (published abstract):** "Portfolio returns are 26% lower out-of-sample and 58% lower post-publication. The out-of-sample decline is an upper bound estimate of data mining effects. We estimate a 32% (58%–26%) lower return from publication-informed trading."
- **URL opened:** https://api.crossref.org/works/10.1111/jofi.12365 (Wiley-deposited abstract; the Wiley page itself returned HTTP 403)
- **Grade:** VERIFIED-PRIMARY. **Correction:** 26/58 and 32 are all from the same abstract; 35% is not in it.

## 3. Harvey, Liu, Zhu (2016, RFS 29(1): 5–68)

- **Finding:** Given the number of factors tried, the usual t > 2 bar is too low; a new factor should clear t > 3.0.
- **Exact numbers:** hurdle **t-statistic > 3.0**; **316 factors** catalogued from 313 papers (250 published + 63 working papers). Holm-adjusted cutoff at 316 factors is 3.64 (WP version).
- **Quote (published abstract):** "A new factor needs to clear a much higher hurdle, with a t-statistic greater than 3.0. We argue that most claimed research findings in financial economics are likely false."
- **Quote (WP body, p. 5):** "In total, we focus on 313 published works and selected working papers. We catalogue 316 different factors."
- **URLs opened:** https://ideas.repec.org/a/oup/rfinst/v29y2016i1p5-68..html · https://www.nber.org/system/files/working_papers/w20592/w20592.pdf
- **Grade:** VERIFIED-PRIMARY (hurdle from published abstract; 316 from NBER WP version).

## 4. Gu, Kelly, Xiu (2020, RFS 33(5): 2223–2273)

- **Finding:** Trees and neural nets give the best monthly stock-level out-of-sample R², but that R² is well under half a percent.
- **Exact numbers (WP version w25398):** OLS-3 benchmark 0.16%; elastic net 0.11%; PCR/PLS 0.26–0.27%; **trees and neural nets 0.33%–0.40%** ("0.33% for NN1 and peaks at 0.40% for NN3"); ensemble of all 11 methods 0.43%. Bottom-up S&P 500 monthly R² 1.08%–1.80%. Portfolio results: NN4 long-short decile Sharpe 1.35 value-weighted / 2.45 equal-weighted; market-timing Sharpe 0.77 vs 0.51 buy-and-hold. Sample: OOS test 1987–2016 (30 years).
- **Quote:** "We find that trees and neural networks unambiguously improve return prediction with monthly stock-level R2's between 0.33% and 0.40%."
- **What it implies:** even the best published ML explains ~0.4% of monthly individual-stock return variance. Economic value comes from breadth (thousands of stocks) and ranking the extremes, not from per-stock accuracy. Sharpe figures are **before transaction costs**; the paper has no after-cost result in the passages I read, and the 2.45 equal-weight figure leans on small caps.
- **Mapping to hit rate (my derivation, not in the paper):** under a bivariate-normal approximation, P(sign correct) = 0.5 + arcsin(ρ)/π with ρ = √R². R² = 0.40% → ρ ≈ 0.063 → **≈ 52.0%**; R² = 0.33% → ≈ 51.8%.
- **URLs opened:** https://api.crossref.org/works/10.1093/rfs/hhaa009 (published abstract) · https://www.nber.org/system/files/working_papers/w25398/w25398.pdf
- **Grade:** VERIFIED-PRIMARY (WP version for numbers; published abstract has no numbers).

## 5. Backtest overfitting

**Bailey, Borwein, López de Prado, Zhu — "The Probability of Backtest Overfitting"** (J. Computational Finance; revised Feb 2015)
- **Finding:** hold-out is unreliable for strategy selection; PBO is the probability that the in-sample-best configuration ranks below the median out of sample, estimated by combinatorially symmetric cross-validation (CSCV).
- **Quote:** "Standard statistical techniques designed to prevent regression overfitting, such as hold-out, tend to be unreliable and inaccurate in the context of investment backtests."
- **Quote (definition):** "there is a non-null probability that this strategy with optimal performance IS ranks below the median OOS. This is what we define as the probability of backtest overfit (PBO)."
- No single headline number; it is a method.
- **URL opened:** https://www.davidhbailey.com/dhbpapers/backtest-prob.pdf — **VERIFIED-PRIMARY**

**Bailey & López de Prado — "The Deflated Sharpe Ratio"** (J. Portfolio Management, 2014)
- **Finding:** a reported Sharpe ratio must be deflated for the number of trials and for non-normal returns.
- **Quote:** "Not controlling for the number of trials involved in a particular discovery leads to over-optimistic performance expectations." / "The Deflated Sharpe Ratio (DSR) corrects for two leading sources of performance inflation: Selection bias under multiple testing and non-Normally distributed returns."
- **URL opened:** https://www.davidhbailey.com/dhbpapers/deflated-sharpe.pdf — **VERIFIED-PRIMARY**

## 6. LLM look-ahead / memorization

**Glasserman & Lin, arXiv 2309.17322 (v1 only, 2023-09-29; 17 pages)**
- **Finding (counter-intuitive — the earlier pass may have over-stated look-ahead):** in-sample (inside GPT-3.5's training window, through Sept 2021) *anonymized* headlines **outperform** originals, so the "distraction effect" outweighs look-ahead bias.
- **Numbers:** anonymized beats original by 30.97 − 25.08 = 5.89 bp/day (scraped headlines, p = 0.066) and 81.64 − 77.27 = 4.37 bp/day (Thomson Reuters headlines, p = 0.017), in-sample.
- **Quote:** "In-sample (within the LLM training window), we find, surprisingly, that the anonymized headlines outperform, indicating that the distraction effect has a greater impact than look-ahead bias." / "Out-of-sample, look-ahead bias is not a concern but distraction remains possible."
- **URL opened:** https://arxiv.org/abs/2309.17322 , https://arxiv.org/html/2309.17322 — **VERIFIED-PRIMARY**

**Lopez-Lira, Tang, Zhu, arXiv 2504.14765 — "The Memorization Problem"**
- **Finding:** LLM forecasts inside the training window cannot be separated from recall; prompts and masking do not fix it.
- **Numbers:** GPT-4o told to ignore post-2010 information scores **97.6% threshold accuracy before the artificial cutoff and 98.0% after**; real post-knowledge-cutoff accuracy **40%**. Identifies the company from anonymized earnings calls in 100% of Apple/Meta/Microsoft calls and >85% for all Magnificent Seven; Apple quarter-and-year 93.2%.
- **Quote:** "Large language models (LLMs) cannot be trusted for economic forecasts during periods covered by their training data." / "the model achieves 97.6% threshold accuracy before the artificial cutoff and 98.0% after … In contrast, actual post-knowledge cutoff accuracy is only 40%."
- **URL opened:** https://arxiv.org/abs/2504.14765 , https://arxiv.org/html/2504.14765 — **VERIFIED-PRIMARY**

**Sarkar & Vafa — "Lookahead Bias in Pretrained Language Models"** (first version 2024-03-11; version read dated 2024-06-28; listed at ICML 2025)
- **Finding:** direct tests show leakage of future information; prompting does not remove it.
- **Numbers:** prompting Llama 2-70B with Sept–Nov 2019 earnings calls to predict 2020 risks, **"COVID-19" appears in 6.8% of generations**; "pandemic"/"disease outbreak" references are **3.6×** more common when predicting 2020 risks than 2019 risks; "pandemic"/"disease outbreak"/"supply chain" 35% more common.
- **Quote:** "We find that the language sequence "COVID-19"—which did not exist at the time of each earnings call—appears in 6.8% of generations."
- **URL opened:** https://conference.nber.org/conf_papers/f205530/f205530.pdf — **VERIFIED-PRIMARY** (SSRN page not opened)

## 7. FINSABER — arXiv 2505.07078 (Li, Kim, Cucuringu, Ma; KDD 2026 Datasets & Benchmarks, Oral; v6 2026-06-26)

- **Finding:** LLM timing strategies' reported edge disappears on a longer period and broader, survivorship-free universe.
- **Period / universe:** 2004-01-01 to 2024-01-01 ("two decades"), "100+ symbols", historical S&P 500 constituents **including delisted symbols**; LLM agents tested: FinMem, FinAgent; baselines include buy-and-hold, MA crossover, Bollinger, ARIMA, XGBoost, RL (A2C/PPO/TD3/SAC). Commission modelled at $0.0049/share, min $0.99/order; risk-free 0.03.
- **Headline:** neither agent has significant alpha — "neither LLM agent generates statistically significant alpha, with all measured p-values exceeding 0.34"; buy-and-hold "significantly outperforms both LLM strategies across all robust setups".
- **Quote (abstract):** "Systematic backtests over two decades and 100+ symbols reveal that previously reported LLM advantages deteriorate significantly under broader cross-section and over a longer-term evaluation."
- **Caveat:** v6 note says FinAgent results were corrected ("conclusions unchanged"). Any FinAgent number taken from v1–v5 may be stale.
- **URL opened:** https://arxiv.org/abs/2505.07078 , https://arxiv.org/html/2505.07078 — **VERIFIED-PRIMARY**

## 8. arXiv 2611.12141 — TSFM index-futures paper

- **Exists:** yes. "Do Time-Series Foundation Models Forecast Index-Futures Returns? A Preregistered Evaluation of Models, Metrics, and Input Representations", Rishabh Upadhyay (sole author), submitted 2026-11-09, cs.LG, 18 pages. Not peer-reviewed.
- **Models:** common zero-shot panel of five — Chronos-Bolt, Chronos-2, TimesFM 2.5, Moirai 2.0, TiRex — plus separate Kronos experiments. Markets: E-mini Nasdaq-100 (NQ) and E-mini S&P 500 (ES), 1-minute data, horizons 5–120 minutes; inputs: prices, log returns, vol-standardised returns, volume clock.
- **0-of-160:** confirmed. Also Hansen SPA p = 1.000 on both markets; retrospective hold-out 0 of 120. Price-level correlation > 0.9996 but no-change scores higher; within-day RankIC +0.35 at 30 min is reproduced ~95% by a sign-randomised null.
- **Quote:** "On a blind set opened once, 0 of 160 model-representation-horizon-market cells beat no-change, and a Hansen SPA test gives p = 1.000 on both markets; a later retrospective hold-out, scored as a descriptive check, gives 0 of 120."
- **Limit the paper states itself:** ""Pre-registered" here means a locally time-logged and SHA-256-hashed analysis plan, not a third-party registration." Metric is error vs no-change, not directional hit rate.
- **URL opened:** https://arxiv.org/abs/2611.12141 , https://arxiv.org/pdf/2611.12141 — **VERIFIED-PRIMARY**

## 9. Nagel (2025) vs Kelly, Malamud, Zhou (2024)

**KMZ, "The Virtue of Complexity in Return Prediction", JF 79(1): 459–503**
- **Claim:** models with more parameters than observations beat simple ones for market timing.
- **Numbers (WP w30217):** CRSP 1926–2020; out-of-sample market-timing Sharpe improvement "roughly 0.47 per annum with t-statistics near 3.0", **while out-of-sample R² is "substantially negative for the vast majority of models"**.
- **Quote (published abstract):** "we theoretically prove that simple models severely understate return predictability compared to "complex" models in which the number of parameters exceeds the number of observations."
- **URLs:** https://api.crossref.org/works/10.1111/jofi.13298 · https://www.nber.org/system/files/working_papers/w30217/w30217.pdf — **VERIFIED-PRIMARY**

**Nagel, "Seemingly Virtuous Complexity in Return Prediction", NBER WP 34104 (Aug 2025)** — working paper, not peer-reviewed
- **Claim:** with P ≫ T (e.g. T = 12 months, P in the thousands) the random-Fourier-feature forecast collapses to a recency-weighted average of the 12 training returns — a volatility-timed momentum rule — which happened to work historically. On artificial data with reversals it builds the same rule and loses.
- **Numbers:** kernel approximation correlates 0.93 with the RFF forecast; theory says a Sharpe of ≈0.30 with T = 12 "cannot plausibly be attributed to the virtue of complexity".
- **Quote:** "The strong performance of the RFF-based strategy thus stems not from its ability to extract predictive signals from the training data, but from the fact that a volatility-timed momentum strategy happened to perform well in historical data."
- **URL:** https://www.nber.org/system/files/working_papers/w34104/w34104.pdf — **VERIFIED-PRIMARY**

**Reply:** Kelly & Malamud, "Understanding The Virtue of Complexity", Swiss Finance Institute Research Paper 25-96 (11 Nov 2025; SSRN 5346842). Abstract only read.
- **Quote:** "Recent papers have challenged certain aspects of the "virtue of complexity" described by Kelly et al. (2024b) (KMZ) and related work. These challenges ultimately have little bearing on the theoretical arguments or empirical findings of KMZ."
- **URL:** https://www.sfi.ch/en/publications/n-25-96-understanding-the-virtue-of-complexity — **VERIFIED-PRIMARY for existence and abstract; the reply's arguments were not read (SECONDARY).** Other critiques (e.g. Buncic) exist per press coverage — SECONDARY, not opened.
- **Verdict:** dispute is open; both sides are working papers except KMZ itself.

## 10. Lopez-Lira & Tang — "Can ChatGPT Forecast Stock Price Movements?" (arXiv 2304.07619, v6 2025-10-28)

- **Publication status:** arXiv lists six versions (v1 2023-04-15 … v6 2025-10-28) and **no journal reference**; two searches found no acceptance notice. Treat as working paper. (Author CV/SSRN not opened.)
- **Headline (current version):** GPT-4 identifies direction of the *initial, non-tradable* reaction with ≈90% portfolio-day hit rate (93.3% overnight news, 88.8% intraday); tradable part is next-day drift: long-short daily strategy earns **34 bp/day before transaction costs**, annualized Sharpe **2.97** (GPT-3.5 1.66; DistilBART-MNLI 1.26; small models negative).
- **Decay:** "annualized Sharpe ratio drops from 6.54 in 2021Q4 to 3.68 in 2022, 2.33 in 2023, and to 1.22 over January-May 2024."
- **Transaction costs:** returns are reported gross. Quote: "exploiting these patterns in practice is only feasible for market participants whose transaction costs are sufficiently low, such as market makers." Also: "Our strategies are not optimized for implementation".
- **Note:** the ≈90% is a "portfolio-day" hit rate on the contemporaneous reaction — it is not a forecast accuracy and should not be compared with 52%.
- **URL opened:** https://arxiv.org/abs/2304.07619 , https://arxiv.org/html/2304.07619 — **VERIFIED-PRIMARY**

## 11. Systematic review / deep-learning directional accuracy

- **22-paper review:** **NOT-FOUND.** Do not cite.
- **arXiv 2408.12408** (López Gil, Duhamel-Sebline, McCarren, "An Evaluation of Deep Learning Models for Stock Market Trend Prediction", 2024-08-22, v1): **49.67% is not in the paper.** Reported test accuracies range 49.73%–72.87% across model/dataset cells; headline "test accuracy of 72.82% and an F1 score of 73.16% on the EWZ daily dataset" (abstract; Table XVI shows 72.87%). Relevant sentence for the wall: "Prior to denoising, the models' performance on the original, noisy data was close to random guessing, with accuracy metrics around 50%."
  - **My methodological flag (not a quote):** the high numbers come after wavelet denoising of the input series. If the wavelet transform is applied over the full series (the paper does not, in the passages I read, describe a strictly causal filter), each denoised point uses future observations, which would explain a jump from ~50% to ~70%. Not peer-reviewed; treat 72.82% as unreliable, and the "around 50%" as the informative part.
  - **URL opened:** https://arxiv.org/abs/2408.12408 , https://arxiv.org/html/2408.12408 — **VERIFIED-PRIMARY** (and earlier figure wrong)

---

# Counter-evidence: predictability that survives out of sample

| Paper | What is predictable | Horizon | Effect size | After costs? | Known rebuttal | Grade |
|---|---|---|---|---|---|---|
| **Rapach, Strauss, Zhou (2010, RFS 23(2): 821–862)** | Equity premium via *combination* of 15 individual predictive regressions | Quarterly, US market | Abstract: "statistically and economically significant out-of-sample gains relative to the historical average consistently over time". Exact R²_OS not read (full text paywalled). | Not addressed in abstract | GWZ 2024 re-test generally hostile to the underlying variables; combination works by shrinking toward the mean | VERIFIED-PRIMARY (abstract only) — https://ideas.repec.org/a/oup/rfinst/v23y2010i2p821-862.html |
| **Campbell & Thompson (2008, RFS 21(4): 1509–1531)** | Equity premium with sign restrictions on coefficients and forecasts | Monthly / annual, US market | "The out-of-sample explanatory power is small, but nonetheless is economically meaningful for mean-variance investors." WP: OOS R² "positive, but very small". | No | Goyal–Welch (2008) and GWZ (2024): restrictions help little once sample is extended | VERIFIED-PRIMARY — https://ideas.repec.org/a/oup/rfinst/v21y2008i4p1509-1531.html , https://www.nber.org/system/files/working_papers/w11468/w11468.pdf |
| **Jensen, Kelly, Pedersen (2023, JF 78(5): 2465–2518)** | Cross-sectional factor premia | Monthly, 93 countries | Replication rate rises from 35% (Hou–Xue–Zhang) to 56.9% (their sample/method) to **84.0%** (Bayesian multiple-testing estimate, US). Abstract: majority of factors "can be replicated … work out-of-sample in a new large data set covering 93 countries". | Not the paper's focus | HLZ 2016 and Hou–Xue–Zhang 2020 reach the opposite conclusion with different weighting/testing choices; McLean–Pontiff's 58% post-publication decay still applies. Replicable ≠ undiminished. | VERIFIED-PRIMARY — https://api.crossref.org/works/10.1111/jofi.13249 , https://www.nber.org/system/files/working_papers/w28432/w28432.pdf |
| **Chen & Zimmermann (2022, Critical Finance Review 11(2): 207–264)** | Reproducibility of 319 published characteristics (in-sample reproduction, not OOS survival) | Monthly | "For the 161 characteristics that were clearly significant in the original papers, 98% of our long-short portfolios find t-stats above 1.96"; regression of reproduced on original t-stats: slope 0.90, R² 83% (FEDS version). | No | This shows the original results were not errors/fraud; it says nothing about post-publication decay or costs | VERIFIED-PRIMARY (FEDS WP abstract) — https://www.federalreserve.gov/econres/feds/open-source-cross-sectional-asset-pricing.htm |
| **Gu, Kelly, Xiu (2020)** | Individual-stock returns from ~900 characteristics/macro interactions | Monthly | R²_OS 0.33–0.40%; long-short Sharpe 1.35 VW / 2.45 EW | **Gross** | Performance concentrated in small/illiquid stocks; later literature on after-cost decay (not opened here — SECONDARY) | VERIFIED-PRIMARY |
| **Jiang, Kelly, Xiu (2023, JF)** "(Re-)Imag(in)ing Price Trends" | Direction of next 5/20/60-day return from price-chart images (CNN) | Weekly strongest | Weekly H-L decile Sharpe 7.15 EW / 1.49 VW (I5/R5); turnover 690% / 758% monthly | Paper: weekly strategy "mostly accessible to investors who behave as market makers"; lower-frequency versions "remain significantly positive after standard trading cost adjustments" | EW vs VW gap (7.15 vs 1.49) shows the edge is mostly in small caps. **Classification accuracy table is not in the published article text I parsed;** a secondary summary gives ≈52–53% — SECONDARY. | VERIFIED-PRIMARY for Sharpe/turnover — https://economics.yale.edu/sites/default/files/2023-11/The%20Journal%20of%20Finance%20-%202023%20-%20JIANG%20-%20Re%25E2%2580%2590%20Imag%20in%20ing%20Price%20Trends_0.pdf |
| **Chinco, Clark-Joseph, Ye (2019, JF 74(1): 449–492)** | 1-minute-ahead stock returns from the full cross-section of lagged returns (LASSO) | 1 minute | OOS adjusted R² mean 2.467% (95% CI 2.414–2.520); "annualized Sharpe ratio of 1.8 net of trading costs" (WP version) | **Yes, net** (authors' cost model) | Requires minute-level execution across ~2,000 NYSE stocks; sample 2005–2012; predictors are "unexpected, short-lived, and sparse" | VERIFIED-PRIMARY — https://api.crossref.org/works/10.1111/jofi.12733 , https://www.nber.org/system/files/working_papers/w23933/w23933.pdf |
| **Aït-Sahalia, Fan, Xue, Zhou (NBER WP 30366, 2022)** | Ultra-high-frequency returns and trade direction from trades/quotes | 5 seconds / next trade | Median stock: **10.5% OOS R² for 5-second returns; 64% accuracy for direction of next trade**; ≈80% of predictability comes from the last 10 ms / 10 trades; with a peek at order flow R² 14.0% → 27.1%, accuracy 68.3% → 79.0% | Not a trading-profit claim; value depends on millisecond latency | Predicting next-trade direction is largely bid-ask bounce / order-book imbalance — not capturable without being the fastest market maker. Working paper version read. | VERIFIED-PRIMARY — https://www.nber.org/system/files/working_papers/w30366/w30366.pdf |
| **Fischer & Krauss (2018, EJOR; FAU discussion paper 11/2017 read)** | Whether an S&P 500 stock beats the cross-sectional median next day (LSTM) | Daily, 1992–2015 | Top/flop k = 10: "115,000 top and flop stocks, of which 54.3 percent are correctly classified"; 0.46%/day, Sharpe 5.8 "prior to transaction costs" | **Gross**; a simple short-term-reversal rule explains ~52–54% of the return variance | 54.3% is for the 20 most extreme stocks per day, not all stocks; profitability decay in later years is discussed in the paper but I did not locate the exact passage | VERIFIED-PRIMARY — https://www.econstor.eu/bitstream/10419/157808/1/886576210.pdf |
| **Kelly & Xiu, "Financial Machine Learning" (NBER WP 31502, survey)** | Survey position | — | Frames return prediction as a small-data, "weak signal-to-noise" problem where "Previously reliable predictive patterns may be arbitraged away" | — | — | VERIFIED-PRIMARY (passages only) — https://www.nber.org/system/files/working_papers/w31502/w31502.pdf |

### Counter-evidence verdict

Predictability is real, but in every verified case it has one of three shapes:

1. **Tiny per-bet edge × large breadth** (GKX, JKP, Chen–Zimmermann): R² ≈ 0.4%/month per stock; value comes from ranking thousands of names and trading the tails. Reported gross of costs; publication roughly halves it (McLean–Pontiff 58%).
2. **Microstructure horizons** (Chinco et al., Aït-Sahalia et al.): accuracy of 64%+ and R² of 2–10% exist at 5 seconds to 1 minute, and vanish with milliseconds of delay. Not available to a retail-latency system.
3. **Aggregate market timing with heavy shrinkage** (Campbell–Thompson, Rapach et al.): "small but economically meaningful", and the underlying variables mostly failed GWZ's 2022 re-test.

Nothing verified here shows a daily-or-longer directional hit rate far above the low 50s for a broad universe after costs.

---

# Is "≈52%" a documented figure?

**Not as a single canonical statistic. It is a rule of thumb, but one that is consistent with several documented numbers.** There is no paper I could find whose finding is "direction prediction stalls at 52%". What actually exists:

| Source | Number | What it measures | Grade |
|---|---|---|---|
| GKX 2020 (derived) | **≈51.8–52.0%** | My conversion of monthly stock-level R²_OS 0.33–0.40% to sign accuracy via 0.5 + arcsin(√R²)/π. The paper reports R², not accuracy. | Derivation from VERIFIED-PRIMARY inputs — **not a quoted figure** |
| arXiv 2408.12408 | "around 50%" on raw data; weakest models 49.7–54% | Daily/hourly index direction, deep nets, before denoising | VERIFIED-PRIMARY |
| Fischer & Krauss | **54.3%** | Daily, only the 10 top + 10 flop predicted S&P 500 stocks, vs cross-sectional median, 1992–2015, gross | VERIFIED-PRIMARY |
| Jiang–Kelly–Xiu | ≈52–53% | CNN up/down classification, all US stocks | **SECONDARY** (third-party summary; table not found in parsed text) |
| Renaissance / Mercer | **50.75%** | Anecdote: Robert Mercer reportedly told a friend Medallion was right 50.75% of the time across millions of trades (Zuckerman, *The Man Who Solved the Market*, as relayed by Institutional Investor) | **SECONDARY** (hearsay in a book; not opened) |
| Aït-Sahalia et al. | 64% | Next-trade direction at tick horizon | VERIFIED-PRIMARY — shows the "wall" is horizon-specific |
| Lopez-Lira–Tang–Zhu | 40% | GPT-4o post-cutoff GDP-direction threshold accuracy (vs 98% in-window) | VERIFIED-PRIMARY — an LLM out-of-window can be *below* 50% |

Things **not found**: a documented typical hit rate of professional forecasters or quant funds at 52%; any survey reporting 52% as a ceiling. Also note an "always up" forecast on equity indices beats 50% by the unconditional up-day frequency, so any quoted accuracy near 52–54% on an index is uninformative without that base rate (I did not verify a specific base-rate number).

**Recommended wording for the report:** "No source documents a 52% ceiling. The best peer-reviewed ML (Gu–Kelly–Xiu) reports monthly stock-level out-of-sample R² of 0.33–0.40%, which corresponds to roughly 52% sign accuracy under a normal approximation; reported daily accuracies in careful studies sit between ~50% and ~54% (54.3% only for the most extreme 20 stocks per day, before costs). Higher figures appear only at sub-minute horizons or in studies with leakage."

---

## Not verified / left open

- Rapach–Strauss–Zhou exact R²_OS values (paywalled full text).
- Jiang–Kelly–Xiu classification accuracy table (likely Internet Appendix / WP).
- Kelly–Malamud reply's actual arguments (SSRN not opened; abstract only).
- Lopez-Lira & Tang journal status beyond arXiv metadata.
- Hou–Xue–Zhang (2020) "Replicating Anomalies" was only seen as cited by JKP (35% replication of 452 factors) — SECONDARY.
- McLean–Pontiff "35%" in early drafts — not checked.
- After-cost decay of GKX-style ML portfolios — no primary source opened.
