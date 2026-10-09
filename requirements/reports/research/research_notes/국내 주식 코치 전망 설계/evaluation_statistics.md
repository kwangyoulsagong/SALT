# Statistically honest evaluation of probabilistic (quantile/interval) forecasts across many assets — gate design

Context (from assignment, not a source): current gate per symbol × horizon uses the last 52 weekly scores; coverage90 in [80%, 97%]; pinball skill > 0; width < baseline; iid bootstrap 2.5% lower bound of skill > 0. A block-permutation check showed Korean stocks (11/204 pass) indistinguishable from chance (null mean 8.7, p ≈ 0.26), while coin (139/997 vs null 43.8, p < 0.001) is real.

Research note: about 15 searches/fetches. Most sources were abstracts, package docs and secondary summaries rather than full papers. Where I could only see an abstract, I say so. Formulas I derived myself (not quoted from a source) are labelled **[derived]** and sit under Inferences.

---

## 1. Overlapping h-period returns sampled weekly: effective sample size, HAC, block bootstrap, non-overlapping subsamples. Which suits pinball-loss differences?

### Takeaway
Overlapping h-step forecast errors give a loss differential that is at least MA(h−1) under the null. The iid bootstrap ignores this and understates variance. Use a HAC or block method with lag/block ≥ h−1 (in weeks), and check it against a non-overlapping subsample. With only 52 weekly points and h up to many weeks, the true effective sample is close to 52/h. Overlap adds little real information, and HAC estimates are badly behaved at that size.

### Cited Findings
- The DM variance uses a rectangular kernel truncated at lag h−1, because under the null of an optimal h-step forecast the loss differential is MA(h−1) — [GAUSS dmtest docs / HLN summary](https://docs.aptech.com/gauss/timeseries/dmtest.html); [Sant'Anna lecture notes](https://www.lem.sssup.it/phd/documents/Lesson19.pdf)
- Harvey, Leybourne & Whitehouse (2017): in small but realistic samples the long-run variance estimate for multi-step predictions is frequently **negative** with the rectangular kernel — [summary in search results; York DP 15/15](https://www.york.ac.uk/media/economics/documents/discussionpapers/2015/1515.pdf)
- Newey–West fixed rule-of-thumb bandwidth: L = floor(4(T/100)^(2/9)). It grows slowly with T. For T = 52 it gives about 3. The automatic plug-in in software packages can differ from this formula — [panelbox Newey-West docs](https://panelbox.readthedocs.io/en/latest/inference/newey-west/); [EViews forum, developer clarification](https://forums.eviews.com/viewtopic.php?p=25801)
- Hansen–Hodrick and Newey–West SEs show severe size distortions with overlapping long-horizon data in small samples. Britten-Jones, Neuberger & Nolte (2011, JBFA 38(5-6):657-683) transform the regression so the dependent variable is non-overlapping, after which conventional SEs are asymptotically valid and perform better in Monte Carlo — [City Research Online](https://openaccess.city.ac.uk/id/eprint/15212/); [IDEAS](https://ideas.repec.org/a/bla/jbfnac/v38y2011i5-6p657-683.html)
- Boudoukh, Israel & Richardson ("Long Horizon Predictability: A Cautionary Tale"): with 50 years of data and a 5-year horizon, going from non-overlapping to monthly overlapping raises the effective number of observations only from **10 to about 12**. Overlap adjustments have greatly overstated t-statistics — [Quantpedia summary](https://quantpedia.com/problems-with-a-long-horizon-predictability/); [Fed FEDS 2009-27](https://www.federalreserve.gov/pubs/feds/2009/200927/200927pap.pdf)
- Stationary bootstrap (Politis & Romano 1994, JASA): blocks of geometric random length with mean 1/p. The resample is itself stationary. Implemented as `tsboot(sim="geom")` in R `boot` — [UCY repository](https://gnosis.library.ucy.ac.cy/handle/7/57533); [R tsboot docs](https://rdrr.io/cran/boot/man/tsboot.html)
- Block-length choice: Politis & White (2004, Econometric Reviews 23(1):53-70) give an automatic, data-driven optimal block length (flat-top lag-window spectral estimate) for the stationary and circular block bootstraps. It was corrected by Patton, Politis & White (2009, Econometric Reviews 28:372-375). Implemented as `blocklength::pwsd()` in R. The Python `arch` package also has `optimal_block_length` (my background knowledge, not verified in this session) — [IDEAS](https://ideas.repec.org/a/taf/emetrv/v23y2004i1p53-70.html); [CRAN blocklength](https://cran.r-project.org/web/packages/blocklength/readme/README.html)
- Blocks too short destroy the dependence. Blocks too long leave few distinct blocks, so resamples look alike — [R tsboot / MetricGate summary](https://metricgate.com/docs/stationary-bootstrap-politis-romano/)
- Coroneo & Iacone: as autocorrelation in the loss differential rises, DM power falls. Past a threshold, a correct null is spuriously rejected. They propose fixed-smoothing (fixed-b) asymptotics — [York DP 2015/15](https://www.york.ac.uk/media/economics/documents/discussionpapers/2015/1515.pdf)

### Inferences
- **The iid bootstrap is the wrong tool** for the current gate. For h-week horizons sampled weekly, d_t = L_model − L_base has autocorrelation up to lag h−1 by construction, plus volatility clustering. The iid bootstrap shrinks the CI by roughly √(1 + 2Σρ_k), so its 2.5% lower bound passes too often. This is consistent with the Korean result (11 pass vs 8.7 under the null).
- **Recommended for pinball-loss differences (per series):** a stationary or circular block bootstrap with mean block length b = max(h, Politis–White estimate). Or HAC/DM with the HLN correction and Bartlett weights at lag ≥ h−1, reading p-values from t_{N−1}. Cross-check with **non-overlapping subsampling**: evaluate only every h-th week. You can run h such offset subsamples and average the statistic. For each subsample, use the iid formula on N/h points. If the HAC/block result and the non-overlapping result disagree, trust the non-overlapping one.
- **[derived]** Effective N for a per-asset 52-week window at horizon h (weeks) is about 52/h for the mean loss differential, and lower still with volatility clustering. For a 4-week horizon that is about 13. For 13-week (quarterly) horizons, about 4. Per-asset skill inference at these sizes has essentially no power. That supports the pooled design in §3.
- For the pinball loss specifically, nothing in the sources argues against DM/block bootstrap. DM only needs covariance stationarity of d_t, not a particular loss ([Sant'Anna notes](https://www.lem.sssup.it/phd/documents/Lesson19.pdf)).

### Gaps
- I did not find a source giving a block-length rule specific to pinball-loss differentials. The Politis–White automatic rule plus the floor b ≥ h is my synthesis.
- I could not retrieve the Harvey–Leybourne–Whitehouse 2017 recommended alternative kernel in detail.

---

## 2. Comparing forecast accuracy: DM/HLN, Giacomini–White, MCS; quantile/pinball and CRPS; panel versions (pooled DM, Driscoll–Kraay, clustering by date)

### Takeaway
DM with the HLN correction is the standard pairwise test of model vs baseline, and it applies to pinball loss/CRPS. Giacomini–White is the appropriate framing when forecasts come from rolling-window estimated models: it tests the *forecasting method*, not the population model. For many assets, use a panel equal-predictive-ability test, or equivalently a pooled mean loss differential with SEs clustered by date (Driscoll–Kraay), not per-asset tests.

### Cited Findings
- Diebold & Mariano (1995): test the mean of d_t = L(e1_t) − L(e2_t). Loss can be non-quadratic and errors serially correlated and non-Gaussian — [Sant'Anna lecture notes](https://www.lem.sssup.it/phd/documents/Lesson19.pdf)
- HLN (1997) correction: DM* = DM · √[(N + 1 − 2h + h(h−1)/N) / N], compared against Student t with N−1 df — [GAUSS dmtest](https://docs.aptech.com/gauss/timeseries/dmtest.html); [Przybylska, Statistics in Transition](https://STAT.GOV.PL/download/gfx/portalinformacyjny/en/defaultlistaplikow/3452/11/1/4a4_przybylska_s299_308.pdf). Note: R `fDMA::mdmtest` assumes h = 1 — [R docs](https://search.r-project.org/CRAN/refmans/fDMA/html/mdmtest.html)
- HLN does not fully fix small-sample size distortion. DM can spuriously indicate superior predictive ability in small samples — [York DP 2015/15 (Coroneo & Iacone)](https://www.york.ac.uk/media/economics/documents/discussionpapers/2015/1515.pdf)
- Giacomini & White (2006, Econometrica 74(6):1545-1578): conditional predictive ability for possibly misspecified models. Using fixed-length rolling estimation windows keeps estimation error in the null, so the test evaluates the forecasting method. It also nests DM's unconditional test — [Econometric Society](https://econometricsociety.org/publications/econometrica/2006/11/01/tests-conditional-predictive-ability); [macroforecast docs](https://macroforecast.readthedocs.io/en/stable/encyclopedia/l6/equal_predictive_test/gw_giacomini_white.html)
- Critique (Zhu & Timmermann 2020): the GW null cannot hold under rolling windows for many common processes, and it can produce substantial size distortions for unconditional tests — [arXiv 2006.03238](https://arxiv.org/abs/2006.03238v1)
- Model Confidence Set (Hansen, Lunde & Nason 2011, Econometrica 79(2):453-497): a set that contains the best model with a given confidence. It is analogous to a CI, and its size reflects how informative the data are — [Econometric Society](https://www.econometricsociety.org/publications/econometrica/2011/03/01/model-confidence-set)
- Quantile forecasts: Giacomini & Komunjer (2005, JBES 23:416-431), the conditional quantile forecast encompassing test, uses the tick (= pinball) loss and is Wald/GMM-based — [IDEAS](https://ideas.repec.org/a/bes/jnlbes/v23y2005p416-431.html)
- Pinball loss averaged over a dense grid of quantile levels approximates CRPS. `fabletools` defines CRPS as twice the integral of the quantile score — [fabletools docs](https://fabletools.tidyverts.org/reference/distribution_accuracy_measures.html)
- Raw CRPS is not comparable across series of different scale. Divide by a benchmark's CRPS (relative CRPS/skill) — [fabletools / arXiv summary](https://rdrr.io/cran/fabletools/man/distribution_accuracy_measures.html)
- Tail-quantile comparisons have low power against models that underestimate risk at extreme levels (Bauer simulations) — [search summary, arXiv 1410.6898](https://arxiv.org/pdf/1410.6898)
- Panel EPA tests (Akgun, Pirotte, Urga & Yang, arXiv 2003.02803): "S-statistics" test overall EPA (on average over all units and time). "C-statistics" test clustered EPA for a fixed number of clusters. Both are valid under weak and strong cross-sectional dependence and perform well in finite samples with little knowledge of the dependence structure — [arXiv 2003.02803](https://arxiv.org/abs/2003.02803)
- Driscoll–Kraay SEs: Newey–West applied to the time series of cross-sectional averages of moment conditions. Robust to general cross-sectional and serial correlation, but need large T. Newey–West is the special case with no cross-sectional correlation — [sandwich vcovPL docs](https://sandwich.r-forge.r-project.org/reference/vcovPL.html)
- Petersen (2009, RFS): with persistent shocks, clustering on only one dimension understates SEs. Time/two-way clustering or Driscoll–Kraay addresses common time shocks. (I saw this via secondary sources only.) — [sandwich docs](https://rdrr.io/cran/sandwich/man/vcovPL.html); [arXiv 2201.11304](https://ar5iv.labs.arxiv.org/html/2201.11304)

### Inferences
- **Recommended pooled skill test (per asset-class × horizon):** compute, for each week t, the cross-sectional mean of scale-free loss differentials, d̄_t = mean_i (L_model,i,t − L_base,i,t)/L̄_base,i. Run a DM/HLN test on the single time series d̄_t with HAC lag ≥ h−1, or a block bootstrap over dates. This is exactly Driscoll–Kraay for a mean. It handles same-week market shocks, which hit all stocks at once, and overlap together. Clustering by date is the critical choice: stocks in the same week are not independent observations.
- Pooled iid or per-asset tests treat 204 stocks × 52 weeks as about 10,000 observations. With a common market factor, the effective count is closer to the number of independent date blocks, i.e. 52/h. **[derived]**
- Use GW framing language: the gate evaluates "this model with this rolling re-estimation" rather than "the model is true", since the forecaster is re-fit on a rolling basis.
- MCS fits when there are more than two candidates (e.g. baseline, EWMA vol, model). If the baseline cannot be eliminated from the MCS, do not show the card.

### Gaps
- Full formulas of the Akgun et al. S/C statistics were not retrieved (abstract only).
- I found no published application of the panel DM to quantile loss on equity panels specifically.

---

## 3. Multiple testing across thousands of assets; pooled-skill + per-asset-calibration design

### Takeaway
Per-asset skill gates at α = 2.5% across 204 to 1,000+ series will pass about 2.5% or more by chance, and more with dependence and with the extra "pass if lucky" conditions. The Korean result is exactly that. Two remedies: (a) control FDR or FWER across assets with dependence-aware procedures, or (b) better, test skill once per pooled model (asset class × horizon) and use per-asset checks only to *veto*, through coverage, calibration and data sufficiency, never to *grant* skill.

### Cited Findings
- Benjamini–Yekutieli (2001, Ann. Stat. 29(4):1165-1188): BH controls FDR under positive regression dependence (PRDS), which covers e.g. multivariate normal statistics with positive correlation. Under arbitrary dependence, run BH at α / Σ_{j=1}^m 1/j (≈ α/(ln m + 0.577)) — [Project Euclid](https://projecteuclid.org/euclid.aos/1013699998); [arXiv 2506.24126 summary](https://arxiv.org/html/2506.24126v1)
- Harvey, Liu & Zhu (2016, RFS 29(1):5-68): with extensive data mining, a new factor needs t > 3.0 rather than 2.0. Their method allows correlation among tests. They argue most claimed findings in financial economics are likely false — [NBER w20592](https://nber.org/papers/w20592); [SSRN](https://papers.ssrn.com/abstract=2513152)
- Romano & Wolf (2005, Econometrica): stepwise multiple testing controls FWER (the probability of falsely calling any strategy superior to a benchmark). It captures joint dependence via bootstrap, so it is more powerful than single-step methods such as White's (2000) Reality Check — [UPF WP 712](https://econ-papers.upf.edu/papers/712.pdf); [Econometric Society](https://jstor.econometricsociety.org/publications/econometrica/2005/07/01/stepwise-multiple-testing-formalized-data-snooping)
- Bailey, Borwein, López de Prado & Zhu, "The Probability of Backtest Overfitting" (J. Computational Finance): hold-out alone is unreliable. CSCV gives a model-free estimate of the overfitting probability (R package `pbo`) — [SSRN](https://papers.ssrn.com/abstract=2326253); [risk.net](https://www.risk.net/journal-of-computational-finance/2471206/the-probability-of-backtest-overfitting)
- Panel EPA "clustered" C-statistics test EPA jointly for a *fixed number of clusters*. This is a direct statistical analogue of "skill per asset-class × horizon" rather than per stock — [arXiv 2003.02803](https://arxiv.org/abs/2003.02803)

### Inferences
- **Arithmetic of the current gate [derived]:** with 204 Korean series and a nominal one-sided 2.5% lower-bound test, about 5 passes are expected under a perfectly calibrated null. Using the iid bootstrap on autocorrelated d_t inflates the per-test false-pass rate further. Your empirical null mean of 8.7 out of 204 (about 4.3%) is consistent with that. 11 passes is noise.
- **Recommended structure:**
  1. *Skill gate (pooled, one test per asset class × horizon):* date-clustered DM/HLN or block bootstrap on d̄_t (see §2). If you test 4 horizons × 2 asset classes = 8 hypotheses, Holm or Bonferroni (α/8) is cheap. If the pooled test fails, no card for that class × horizon.
  2. *Per-asset checks are vetoes only:* coverage within a tolerance band derived from binomial/HAC variance (§4), minimum history, width not absurdly wider than the baseline, and no recent break. These protect individual users without claiming per-asset skill.
  3. *If per-asset skill is still wanted:* use Romano–Wolf stepdown with a date-block bootstrap (it respects cross-sectional dependence), or BH/BY on block-bootstrap p-values, and report the discovery count against the permutation null.
- This mirrors HLZ: once you search over many series, the per-test bar must rise (t ≈ 3 instead of 2), or skill must be claimed only at an aggregate level.

### Gaps
- I found no published industry document that explicitly prescribes "pooled skill, per-asset calibration only" for forecast display gates. The design rests on the panel-EPA cluster framing, HLZ and BY, not on a cited practice.
- The PRDS condition for one-sided tests of loss differentials across stocks is plausible (common market factor gives positive dependence) but not verified.

---

## 4. Calibration testing for intervals: Kupiec, Christoffersen, overlapping horizons, PIT, conditional coverage by buckets

### Takeaway
Kupiec tests the hit rate. Christoffersen adds independence and a joint conditional-coverage test. Both assume iid Bernoulli hits, which **overlapping h-step intervals violate by construction**. Run the formal tests on non-overlapping (every h-th) observations, or use HAC/block-bootstrap SEs for the hit rate. Use PIT histograms and coverage by volatility/size bucket as diagnostics.

### Cited Findings
- Christoffersen (1998, IER 39:841-862): hit = outcome outside the interval. Correct conditional coverage ⇔ hits iid Bernoulli(p). LR_cc = LR_uc (Kupiec 1995) + LR_ind (first-order Markov). The LR statistics are additive — [IDEAS](https://ideas.repec.org:443/a/ier/iecrev/v39y1998i4p841-62.html); [R tstests docs](https://search.r-project.org/CRAN/refmans/tstests/html/var_cp_test.html)
- The Markov independence test only detects a violation immediately followed by another (one lag), so its power against general clustering is limited — [rugarch VaRTest docs](https://rdrr.io/cran/rugarch/man/VaRTest.html); [Ziggel, Berens, Weiss & Wied 2016 JBF](https://wisostat.uni-koeln.de/sites/statistik/Dominik_Wied/Ziggel_Berens_Weiss_Wied_2016_JBF.pdf)
- Overlapping k-day windows produce dependent Bernoulli trials. Workarounds: sample at spacing wider than the overlap, group samples by distance, or decorrelate. Simulation-based multi-horizon PIT tests need bootstrapped critical values — [quant.stackexchange via search](https://backiee.wasmer.app/http_quant_stackexchange_com/q/15551); [arXiv 2309.06393](https://arxiv.org/pdf/2309.06393)
- An empirical 10-day VaR study: overlapping returns tend to give conservative 10-day VaR; non-overlapping returns gave satisfactory results — [J. Operational Risk](https://www.risk.net/journal-of-operational-risk/7928586/evaluation-of-backtesting-on-risk-models-based-on-data-envelopment-analysis)
- Gneiting, Balabdaoui & Raftery (2007, JRSS-B 69(2):243-268): maximise sharpness subject to calibration. Diagnostics are the PIT histogram (uniform ⇔ probabilistic calibration), marginal calibration plots, sharpness diagrams and proper scores — [PDF](https://sites.stat.washington.edu/people/raftery/Research/PDF/Gneiting2007jrssb.pdf); [Gelman blog](https://statmodeling.stat.columbia.edu/2019/09/05/gneiting-on-calibration-and-sharpness/)
- Ziggel et al.: traditional backtests built on first-order autocorrelation of violations often miss misspecified models in calm-boom vs volatile-bust cycles. This is the argument for checking coverage by regime/volatility bucket — [Ziggel et al. 2016](https://wisostat.uni-koeln.de/sites/statistik/Dominik_Wied/Ziggel_Berens_Weiss_Wied_2016_JBF.pdf)

### Inferences
- **[derived] The coverage band [80%, 97%] with 52 overlapping weekly hits:** with iid hits at p = 0.9, SE = √(0.9·0.1/52) ≈ 4.2 pp. With overlap at h weeks, the effective n is about 52/h, so the SE for h = 4 is about 8.3 pp and for h = 13 about 15 pp. The band therefore rejects little at long horizons. It can neither confirm nor refute calibration per asset. Use it as a gross-error veto, and test calibration formally at the pooled level: pooled hit rate with date-clustered SE, plus up-tail and down-tail hit rates separately (5%/5% for a central 90% interval).
- Report coverage by volatility tercile, market-cap bucket and regime (up/down market weeks). Conditional miscoverage there is the main honest-calibration risk for a card shown to users.
- Pooled PIT histogram per asset class × horizon. A U-shape means intervals are too narrow, a hump means too wide, and a slope means bias.

### Gaps
- I did not retrieve a canonical closed-form coverage test for overlapping multi-step intervals. The options in the sources are subsampling, decorrelation or simulation.

---

## 5. Placebo / permutation tests (sign-flip, swap model vs baseline by date block) to check gate false-positive rate

### Takeaway
A date-block sign-flip (randomly swap model and baseline losses for entire date blocks, the same flip for all assets in that block) is a valid null for "no skill difference" that preserves both serial and cross-sectional dependence. Rerunning the *entire gate* under it measures the gate's real false-pass count. This is what produced 8.7/204 for Korea. It is closely related to the bootstrap reality check / Romano–Wolf logic.

### Cited Findings
- White's Reality Check and Romano–Wolf use resampling of the *joint* statistics against a benchmark to control the probability of falsely declaring any strategy superior. Romano–Wolf's stepwise version implicitly captures joint dependence — [UPF WP 712](https://econ-papers.upf.edu/papers/712.pdf)
- CSCV/PBO provides a complementary, model-free check of selection overfitting in backtests — [SSRN 2326253](https://papers.ssrn.com/abstract=2326253)
- The stationary/block bootstrap preserves dependence only when blocks are long enough. Block length should follow the dependence structure (Politis–White) — [IDEAS](https://ideas.repec.org/a/taf/emetrv/v23y2004i1p53-70.html)

### Inferences
- **Procedure [derived]:**
  1. Partition weeks into blocks of length b ≥ h, the same partition for all assets.
  2. For each of B ≥ 1,000 replications, draw an iid sign s_k ∈ {±1} per block. Apply it to every asset's d_{i,t} in that block, so swapping model and baseline is identical cross-sectionally.
  3. Rerun the full gate (coverage, width, skill bound), recording the number of passes and the pooled statistic.
  4. p = (1 + #{null count ≥ observed}) / (B + 1). Also estimate FDR among the passes ≈ null mean / observed: Korea 8.7/11 ≈ 79%, coin 43.8/139 ≈ 32%.
  - Sign-flip assumes the loss differential is symmetric under the null. A cyclic time-shift (circular rotation of the model series relative to the realised outcomes) is an alternative placebo when symmetry is doubtful.
- Make this placebo run a standing CI check: a gate change is accepted only if the null pass count stays at or below a target, for example the null-implied FDR among shown cards ≤ 10–20%.
- Even coin's 139 passes contain about 44 expected false passes. A per-card disclosure should not imply that every shown card has proven skill.

### Gaps
- I found no published paper specifically on date-block sign-flip tests for forecast-gate FPR. The procedure combines standard permutation/bootstrap principles.

---

## 6. Reporting backtest vs live; how much live sample suffices (power for 2–5% pinball skill)

### Takeaway
Treat the backtest as model selection (subject to overfitting, PBO) and the live record as the confirmatory test. Power analysis with realistic loss-differential variability shows that 2–5% pinball skill is undetectable per asset within a year. At the pooled level it needs on the order of years of weekly dates unless cross-sectional averaging removes most of the noise.

### Cited Findings
- Hold-out alone is unreliable for investment backtests. Report PBO/CSCV — [risk.net](https://www.risk.net/journal-of-computational-finance/2471206/the-probability-of-backtest-overfitting)
- DM power falls as loss-differential autocorrelation rises — [York DP 2015/15](https://www.york.ac.uk/media/economics/documents/discussionpapers/2015/1515.pdf)
- MCS size depends on the data's information content: weak data give a large set, i.e. it cannot discriminate — [Econometrica abstract](https://www.econometricsociety.org/publications/econometrica/2011/03/01/model-confidence-set)

### Inferences
- **Power formula [derived, standard one-sample normal approximation]:** to detect relative skill s = E[d]/E[L_base] with one-sided α and power 1−β, the number of *effective* (non-overlapping, date-level) observations needed is
  n_eff ≈ ((z_{1−α} + z_{1−β}) · CV_d / s)², where CV_d = sd(d_t)/E[L_base].
  For α = 2.5% and power 80%, z-sum ≈ 2.80. Illustrative values (CV_d must be measured from your data, these are not sourced):
  - CV_d = 0.3, s = 5% → n_eff ≈ 282 dates; s = 2% → about 1,760.
  - CV_d = 0.1 (after cross-sectional averaging) with s = 5% → about 31; s = 2% → about 196.
  - Overlap: the needed calendar weeks ≈ n_eff × h for the non-overlapping version.
  - So a per-asset 52-week window can only detect huge skill. Pooled date-level testing is the only way to confirm 2–5% skill within one to a few years.
- **Reporting:** label backtest numbers "backtest (in-sample selection)" with the start date, universe definition and PBO. Label live numbers "live since <date>, N weeks, k non-overlapping horizons". Show live separately and never blend the two. A card's "scored history" should count only post-freeze live forecasts, or point-in-time-reconstructed ones clearly marked as such.
- Sequential monitoring of the live record (checking weekly whether skill is still > 0) inflates false positives unless you use a sequential design (alpha spending or confidence sequences). Fix the evaluation calendar in advance. This is general statistical knowledge; I found no specific source in this session.

### Gaps
- I found no published empirical CV_d for weekly pinball-loss differentials on stocks. It must be estimated from SALT's own scoring table.
- I did not retrieve sources on sequential/anytime-valid tests for forecast skill.

---

## 7. Survivorship / look-ahead universe bias: magnitude and how to measure it

### Takeaway
Survivor-only universes overstate returns by under 1 to about 5 pp/yr depending on market and segment. For *interval* forecasts the main danger is asymmetric: a survivor universe excludes the crash/delisting paths, so down-tail misses are undercounted and down-side coverage looks better than it will be live. Measure it by comparing point-in-time vs survivor universes and by reporting up-tail and down-tail miss rates separately.

### Cited Findings
- Shumway (1997): negative delistings are generally surprises. Correct delisting returns are missing for most negatively delisted CRSP stocks, and the omitted delisting returns are large — [search summary / Shumway via ideas](https://ideas.repec.org/a/oup/rfinst/v9y1996i4p1097-1120.html); [Alpha Architect](https://alphaarchitect.com/2016/08/dealing-with-delistings-a-critical-aspect-for-stock-selection-research/)
- Deep-value example: mean annual return 30.1% ignoring delistings vs 24.6% including them — [Alpha Architect](https://alphaarchitect.com/2016/08/dealing-with-delistings-a-critical-aspect-for-stock-selection-research/)
- India NIFTY Smallcap 250 (2026 preprint): survivor-only backtest 26.17%/yr vs true universe 21.23%, a 4.94 pp overstatement (one emerging market, preprint) — [arXiv 2603.19380](https://arxiv.org/pdf/2603.19380)
- Mutual funds: Carhart (1997) finds 0.43%/yr bias in 5-year samples and about 1% for samples longer than 15 years. Elton, Gruber & Blake (1996) report 0.9%/yr per Wikipedia vs 1.4%/yr per another preprint (**conflict, unverified**) — [Carhart PDF](https://www.evidenceinvestor.com/wp-content/uploads/2016/08/Mutual-Fund-Survivorship-Mark-M.-Carhart-May-1997.pdf); [Wikipedia](https://en.wikipedia.org/wiki/Survivorship_bias); [arXiv 2603.19380](https://arxiv.org/pdf/2603.19380)

### Inferences
- **Measurement procedure [derived]:**
  1. Build a point-in-time universe per scoring week (listed that week, including later-delisted names, with the final delisting return).
  2. Rerun the evaluation on (a) the point-in-time universe and (b) today's survivor list over the same dates.
  3. Report Δ pinball skill, Δ coverage, and especially Δ **down-tail miss rate** (y < q05) vs Δ **up-tail miss rate** (y > q95).
  - If survivor-only shows down-tail misses well below 5% while up-tail misses are near or above 5%, the universe is hiding crashes.
- Also check look-ahead in the universe filter itself: liquidity or market-cap screens must use data available at forecast time. Same for sector labels and index membership.
- For Korean stocks, delisting, administrative-issue designation and trading halts should enter the evaluation as realised outcomes (a large down-tail miss), not be dropped. Dropping them flatters coverage.
- Survivorship affects the *baseline* too, so skill can look fine while both are miscalibrated. Calibration checks must be absolute (coverage), not only relative.

### Gaps
- I found no Korea-specific (KRX/KOSDAQ) survivorship bias estimate.
- I could not access Shumway's headline delisting-return figure directly.
