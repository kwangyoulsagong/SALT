# Research D — practitioner pain points, retail needs, and how to explain uncertain financial information

Date of research: 2026-11-13. Scope: one-panel "scenario card" per stock/coin with streamed AI sentences.

## How to read this file

Grades

- **VERIFIED-PRIMARY** — I opened the paper / report / statute / the study owner's own release and read the number or sentence there (full text or the official abstract).
- **SECONDARY** — I read it in a news article, a search-result summary, or a third-party write-up. Do not quote the number as fact without opening the original.
- **NOT-FOUND** — I looked and could not open a source that supports it.

Access notes

- Several publisher pages refused automated access (PNAS 403, PubMed/PMC cookie wall, SSRN 403, Nature login redirect, ZORA bot wall). Where that happened I used the open full text or the official abstract through the Europe PMC API, arXiv PDFs, NBER PDFs, or author-hosted PDFs. The URL listed is the one actually fetched.
- Korean statute text was read on casenote.kr (a mirror of the statute text). Confirm wording at law.go.kr before relying on it.
- Quotes are verbatim from the fetched text. Where a quote comes from PDF text extraction, line breaks were removed.

---

## Part 1 — Practitioners and users

### 1.1 Advisors / PBs: time use

| Claim | Numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| Fidelity "41% / 59%" | 41% of the advisor's day supports clients and prospects (2024 Industry Trends Study, 432 advisors, Feb 2–15 2024). 59% of advisor time goes to administration, compliance and other non-client tasks (2025 Advisor Insights Study, 479 advisors, Feb 18–26 2025). Freeing 5 hours/week is modelled as up to $270,000 revenue per advisor per year (assumes $1M revenue). | Press release title: "New Fidelity Report Helps Wealth Management Firms Tackle Top Organic Growth Barrier: Time Management" (Oct 15 2025) | https://alumni.fidelity.com/news/1429729 | VERIFIED-PRIMARY (study owner's release). **Caveat: the 41% and 59% come from two different surveys in two different years; they are not one split.** The $270K is a projection, not a measurement. |
| Kitces "9 hours / 17%" | Average lead advisor: 8.8 h/week meeting current clients, 5.3 h meeting prep, 6.6 h planning/analysis, 6 h follow-through; direct client activity 26.7 h ≈ 50% of time. Client meetings "less than 20%" of time: 16% RIA, 18% broker-dealer, 17% insurance-based. Admin 4.2 h. | "our recent 1,000+ advisor Kitces Research study" | https://www.kitces.com/blog/how-do-financial-advisors-spend-time-research-study-productivity-capacity-efficiency/ | VERIFIED-PRIMARY (Kitces' own article, published Mar 18 2019). So "9 hours" = 8.8 h and "17%" = the insurance-channel figure; the all-channel statement is "less than 20%". This is the 2018/2019 wave, not 2024. |
| Cerulli time allocation | ~53.4% client-facing, client meetings 20.6%, admin ~21–22% | — | search summaries only (napa-net.org, invesco.com) | SECONDARY — original Cerulli report not opened; figures come from different write-ups and should not be merged. |
| J.D. Power | 28% of advisors say they lack time with clients; survey of 4,183 advisors, Dec 2022–Apr 2023 | — | search summary only | SECONDARY |

### 1.2 Analysts / investment professionals and AI

| Claim | Numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| CFA Institute, "Creating Value from Big Data in the Investment Management Process: A Workflow Analysis" (2025) — who answered | Global member survey, last two weeks of Feb 2024; response rate 0.2%–1.0%, margin of error ±4.0%; 274 Americas (48%), 182 EMEA (32%), 113 APAC (20%) | "for a response rate of 0.2%–1.0% and a margin of error of ±4.0%" | https://rpc.cfainstitute.org/sites/default/files/docs/research-reports/creating-value-from-big-data_online.pdf | VERIFIED-PRIMARY. Low response rate → self-selected. |
| Same report — tool use | GenAI/Python/SQL: 20%–39% of professionals use daily. 47% use "other data visualization tools" daily. Among GenAI users 49% daily, 42% weekly. ChatGPT used by at least 75% of respondents in all job/age groups and regions. | "ChatGPT is the GenAI technology of choice; it is used by at least 75% of respondents in all job/age groups and regions." | same | VERIFIED-PRIMARY |
| Same report — pain points | No percentages in the summary; named challenges are opacity, privacy, skills gap, data quality, fragmented implementation, hallucinations | "Key challenges to AI adoption include the complexity and opacity of AI models (the 'black box' or explainability issue), data privacy concerns, and a skills gap" · "generative AI models ... sometimes produced 'hallucinations' (incorrect or misleading information)" · practitioner: "will be garbage in, garbage out." · "AI can't foster trust, so the ability to connect with people" | same | VERIFIED-PRIMARY (qualitative) |
| CFA Institute, "Explainable AI in Finance: Addressing the Needs of Diverse Stakeholders" (Wilson, Aug 2025) | No survey numbers. Conceptual report: six stakeholder groups, "the majority of which are nontechnical users"; lists "Overreliance on AI explanations" as a risk. | "needs of six stakeholder groups, the majority of which are nontechnical users" | https://rpc.cfainstitute.org/sites/default/files/docs/research-reports/wilson_explainableaiinfinance_online.pdf | VERIFIED-PRIMARY (no effect sizes exist in it) |
| Mercer 2024 global manager survey | 91% of managers using (54%) or planning (37%) AI; 48% of AI-integrated managers call divergent regulation a significant risk | — | search summaries only (mercer.com page not opened in full) | SECONDARY. No hallucination percentage found. |
| Time spent gathering data vs analysing (sell-side/buy-side) | — | — | searched; only vendor blogs and non-finance data-analyst surveys surfaced | NOT-FOUND. FactSet's 325-firm buy-side survey (Nov 2025) describes switching between applications but the split was not quantified in what I could see. |
| MiFID II effects on research volume | — | — | not located | NOT-FOUND |
| Bloomberg / Coalition Greenwich / EY / Deloitte trader surveys on hallucination trust | — | — | not located with openable numbers | NOT-FOUND |

### 1.3 Korea — practitioners

| Claim | Numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| 자본시장연구원, 김준석, "애널리스트의 낙관성, 정확성, 정보성" (reported 2026-05-04) | ~740,000 analyst reports since 2000. Buy + strong buy share ≈73% before 2014 → 91% after 2015. Target-price implied return averaged ~30% above realised. Target price reached 19% of the time. Market-moving reports ≈10%. Heavier workload → more optimism. | "약 74만건의 국내 애널리스트 분석보고서" | https://www.newsis.com/view/NISX20260504_0003616288 | SECONDARY (news report of the KCMI paper; the paper itself was not opened). An earlier search summary gave "유지 비중 97.16%" for 2015–2024 — also SECONDARY. |
| Analyst headcount | 1,054 (2020), 1,099 (2024), 금융투자협회 | — | search summary | SECONDARY |
| Survey of PB / analyst / fund-manager workload in Korea | — | — | two Korean searches; no survey with numbers surfaced | NOT-FOUND |
| Securities-firm AI stock-analysis services and the solicitation line | Named services: 한국투자증권 "지금 종목은", 한화투자증권 "AI 공시", 미래에셋 "AI이슈체크". Regulators examined late in the prior year whether free AI stock analysis circumvents investment-solicitation rules. Line described: summarising public data = information; using a customer's risk profile / holdings / trading pattern to suggest buy-sell timing or weights = likely solicitation. | (article paraphrase; original Korean wording not captured verbatim) | https://sateconomy.co.kr/news/view/1065598334928745 (2026-06-10) | SECONDARY (press analysis, not a regulator document) |
| Documented hallucination incident in a Korean brokerage AI service | — | — | searched | NOT-FOUND |

### 1.4 Retail users

| Claim | Numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| "Six minutes" (Laarits & Wurgler, NBER WP 33625, Mar 2025) | Median individual investor: ~6 minutes of research per trade on the traded ticker; mean 29 minutes. Most of it in the 24 hours before the trade. Sample: 484 investors, 2,911 US stock trades. Most time on price charts, then analyst opinions; risk statistics "of little apparent interest". | "The median individual investor spends approximately six minutes on research per trade on traded tickers, mostly just before the trade; the mean spends around half an hour." · "Many investors do not pursue research beyond this page." (the snapshot page) | https://www.nber.org/system/files/working_papers/w33625/w33625.pdf | VERIFIED-PRIMARY. **Caveats: browser data are from 2007 ("four months of 2007"), US households, desktop web, not peer-reviewed.** The "1% / six seconds on risk statistics" and "14% on fundamentals" figures appear only in press coverage → SECONDARY. |
| What consumers say makes financial information good (FINRA Foundation, Sept 2025) | Probability-based sample of 1,031. Most important factor: based on relevant research 32%; from a well-regarded source 26%; many others liked it 5%; paid for it 2%. Least important: others "liked" it 54%. Channels: websites 45%, books/papers 30%, TV/radio 26%, social 24% (35% under 30 vs 13% 65+). | "information that is based on relevant research ... was the most frequently selected response (32 percent)" | https://finrafoundation.org/sites/finrafoundation/files/2025-09/What-Matters-to-Consumers-When-Assessing-Information-for-Financial-Decision-Making.pdf | VERIFIED-PRIMARY (stated preference, not behaviour) |
| Retail use of AI (FINRA Foundation, June 2024) | 1,000+ US adults; 5% use AI for financial guidance; stock/bond information trusted from AI 34% vs professional 33%; portfolio allocation professional 37% vs AI 30% | study title "The machines are coming (with personal finance information). Do we trust them?" | https://www.investmentnews.com/technology/news/ai-vs-human-advice-which-one-wins-consumers-trust-254137 | SECONDARY (news article on the study) |
| Investing.com 2026 poll | 938 US investors; 62% use AI to research assets; 39% worry AI gets it wrong | — | search summary | SECONDARY |
| Korea — MTS complaints (한국소비자원 2025) | 2,100 app traders (300 × 7 firms), Apr 16–22. 59% (1,240) reported complaint or harm, up 6.8 points from 52.2% in 2021. Of those: system error / access failure 50.8%, login 48.6%, fees 35.4%, **inaccurate or false investment information 15.1% (187)**. Satisfaction 3.55/5 (3.59 four years earlier). | — | https://www.heraldk.com/article/2025082114061203546 | SECONDARY (news report of the KCA survey) |
| Korea — where retail investors get information | 오픈서베이 2026 (1,200 people, Feb 13–14 2026): 20s–30s lean on YouTube/SNS and intuition | — | search summary; page itself returned no content | SECONDARY |
| Reasons for investing-app abandonment; Korean MTS UX academic studies | — | — | not located | NOT-FOUND |

---

## Part 2 — Explanation, comprehension, trust

### 2.1 Words vs numbers for uncertainty

| Study | Finding and numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| van der Bles, van der Linden, Freeman, Spiegelhalter, PNAS 2020 | 5 experiments, total n = 5,780 (incl. BBC News field experiment). Exp 1 (n = 1,122): a **verbal** uncertainty phrase cut trust in the number vs control (M 3.51 vs 4.52, d = 0.75) and vs numeric range (d = 0.60); a **numeric range** did not significantly cut trust vs control. Trust in source: verbal d = 0.28 lower; numeric vs control d = 0.02. Perceived uncertainty rose with numeric range (d = 0.45) and more with words (d = 1.17). Exp 2: the size of the range barely registered (magnitude main effect on perceived uncertainty n.s., P = 0.055). | "we observed only a small decrease in trust in numbers and trustworthines[s]" · "only the verbal communication reduced people's trust in the numbers and the source" | https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7149229/fullTextXML (article: https://pmc.ncbi.nlm.nih.gov/articles/PMC7149229/; pnas.org returned 403) | VERIFIED-PRIMARY. Caveat: epistemic uncertainty about official statistics (unemployment, migration), not forecasts of prices. |
| van der Bles et al., R. Soc. Open Sci. 2019 (review; Spiegelhalter co-author) | Review; proposes nine expressions of direct uncertainty. | "there is some evidence that communicating epistemic uncertainty does not necessarily affect audiences negatively, impact can vary between individuals and communication formats" | Europe PMC abstract, PMID 31218028 | VERIFIED-PRIMARY (abstract) |
| Spiegelhalter, Pearson, Short, Science 2011 | Review; no effect sizes. | "there is limited experimental evidence on how different types of visualizations are processed and understood, although the effectiveness of some graphics clearly depends on the relative numeracy of an audience" | Europe PMC abstract, PMID 21903802 | VERIFIED-PRIMARY (abstract) |
| Budescu, Broomell, Por, Psych. Science 2009 (IPCC phrases) | Readers' numeric interpretations of IPCC probability words deviate from the guidelines even with the guidelines in hand. Abstract has no numbers. | "The respondents' judgments deviated significantly from the IPCC guidelines, even when the respondents had access to these guidelines." | Europe PMC abstract, PMID 19207697 | VERIFIED-PRIMARY (abstract; exact percentages NOT-FOUND) |
| Budescu et al., Nature Climate Change 2014 (25 countries) | — | — | nature.com redirected to login; no abstract via APIs | NOT-FOUND |
| Dhami & Mandel, Trends Cogn. Sci. 2022 | Review. Senders prefer words; recipients making consequential decisions prefer precise numbers; attaching numeric ranges to words does not fix misreading. | "the potential for miscommunication is not effectively mitigated by assigning (imprecise) numeric probabilities to words. When making consequential decisions, recipients prefer (precise) numeric probabilities." | Europe PMC abstract, PMID 35397985 | VERIFIED-PRIMARY (abstract) |

### 2.2 Frequencies, percentages, icon arrays, dot plots

| Study | Finding and numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| Gigerenzer & Hoffrage, Psych. Review 1995 | Bayesian reasoning: frequency formats elicited 46% (standard menu) and 50% (short menu) Bayesian solutions; probability formats 16% and 28%. 15 problems. | "46% in the standard menu and 50% in the short menu. Probability formats, in contrast, elicited 16% and 28%" | https://pages.ucsd.edu/~scoulson/203/GG_How_1995.pdf | VERIFIED-PRIMARY. Caveat: the task is Bayesian updating (base rate + test accuracy), not reading a single probability. |
| Woloshin & Schwartz, Ann. Intern. Med. 2011 (RCT) | **Percent beat natural frequencies.** Passed comprehension test: 73% percent group vs 68% frequency groups. Absolute-difference questions correct: 72% percent vs 43% natural frequency. One third failed even with percent. | "Natural frequencies are not the best format for communicating the absolute benefits and harms of treatment. The more succinct percent format resulted in better comprehension" | Europe PMC abstract, PMID 21768582 | VERIFIED-PRIMARY (abstract) |
| Cuite et al., Med. Decis. Making 2008 | n = 16,133. Accuracy on simple operations: percentage 57%, frequency (12 in 100) 55%, 1-in-n 45%. | "the 1-in-n format, which should usually be avoided" | Europe PMC abstract, PMID 18480036 | VERIFIED-PRIMARY (abstract) |
| Sirota, Juanchich, Bonnefon, JEP: Applied 2018 | 975 participants, 5 experiments. "1 in X" produces higher perceived probability and larger objective overestimation than "N in X·N". | "The '1-in-X' ratios led to a larger objective overestimation of numerical probabilities" | Europe PMC abstract, PMID 30247046 | VERIFIED-PRIMARY (abstract) |
| Pighin et al., Med. Decis. Making 2011 | 7 experiments; 1-in-X seen as bigger and more alarming; effect disappears with an icon array. | "it disappears with an icon array visual aid" | Europe PMC abstract, PMID 21512187 | VERIFIED-PRIMARY (abstract) |
| Galesic, Garcia-Retamero, Gigerenzer, Health Psych. 2009 | Older adults n = 59, students n = 112. Icon arrays raised accuracy for low- and high-numeracy people; risks shown as icons were perceived as **less serious**; 1,000-icon arrays made risks look more serious than 100-icon arrays. Abstract gives no effect sizes. | "Icon arrays increased accuracy of both low- and high-numeracy people, even when transparent numerical representations were used." | Europe PMC abstract, PMID 19290713 | VERIFIED-PRIMARY (abstract; effect sizes NOT-FOUND) |
| Kay, Kola, Hullman, Munson, CHI 2016 ("When (ish) is My Bus?") | Quantile dotplots (20 dots) gave ~1.15× lower variance in probability estimates than density plots — 1–3 percentage points more precise. | "1.15 times lower variance than a density plot, making probability estimates 1-3 percentage points more precise" | https://www.mjskay.com/papers/chi_2016_uncertain_bus.pdf | VERIFIED-PRIMARY. Small effect; transit domain. |
| Fernandes, Walls, Munson, Hullman, Kay, CHI 2018 | Incentivised decisions. 50-dot quantile dotplot: expected payoff 97% of optimal (95% CI 95–98), 5 points above the no-uncertainty control (CI 2–8); within-subject SD 3 points, 4 less than control. CDF nearly as good. Text uncertainty worse and "sensitive to the probability interval communicated". Decisions improved ~5 points over the study with the best displays. | "Decisions with quantile dotplots with 50 outcomes were (1) better on average, having expected payoffs 97% of optimal" | https://www.mjskay.com/papers/chi2018-uncertain-bus-decisions.pdf | VERIFIED-PRIMARY. Caveat: repeated bus-catching decisions with feedback; learning is part of the effect. |
| Hullman, Resnick, Adar, PLOS ONE 2015 (hypothetical outcome plots) | Animated draws supported more accurate judgments on two- and three-variable comparisons than error bars or violin plots; comparable on single-variable tasks. Numbers not extracted. | "HOPs support more accurate inferences about bivariate and trivariate distributions" | https://www.ebi.ac.uk/europepmc/webservices/rest/PMC4646698/fullTextXML | VERIFIED-PRIMARY (direction only; effect sizes not extracted) |
| Fan charts critique | EC KID testing (below): "funnel of doubt" and probability histogram did worse than a simple table or line graph. No dedicated fan-chart experiment opened. | see 2.3 | see 2.3 | VERIFIED-PRIMARY for the KID statement; dedicated fan-chart study NOT-FOUND |

### 2.3 Financial risk communication experiments

| Study | Finding and numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| EC consumer testing for the PRIIPs KID (London Economics / Ipsos, 2015), executive summary | Simpler presentations → better comprehension. Complex performance graphics dropped after Phase I. People assume likelihoods when none are given, and also err when given them. | "increased detail often meant poorer performance on the objective questions" · "more complex graphical designs (showing a 'funnel of doubt' or a 'probability histogram') did not perform as well as simpler graphics which incorporated either a table or a line graph" · "There appeared to be a clear motivation to find information on how probable the scenarios are, but some problems using the information where they were given it." | https://service.betterregulation.com/sites/default/files/upload/2017-04/consumer-testing-study-executive-summary-2015_en_1.pdf | VERIFIED-PRIMARY (executive summary; no effect sizes in it) |
| EC consumer testing of KID performance scenarios (2020), summary | n = 7,684 online. Probabilistic version framed "XX in 10". 72–75% picked the optimal fund; 68–71% for structured products. With the probabilistic version, correct identification of guaranteed conditions was 7–8 percentage points higher for funds. Across versions fewer than half could answer some comprehension items. | "Probabilistic information is framed as 'XX in 10" · "7 or 8 percentage points higher for funds when the probabilistic approach version was used" | https://service.betterregulation.com/sites/default/files/upload/2020-02/200227-consumer-testing-services-summary_en.pdf | VERIFIED-PRIMARY (summary) |
| Kaufmann, Weber, Haisley, Management Science 2013 | Four formats: numeric description, experience sampling, graph, combined "risk tool". Risky allocation higher with risk tool and experience sampling; risk-tool users were more accurate recalling expected return and loss probability, with no more dissatisfaction afterwards. Abstract has no effect sizes. | "participants in the risk tool condition are more accurate on recall questions regarding the expected return and the probability of a loss" | https://econpapers.repec.org/RePEc:inm:ormnsc:v:59:y:2013:i:2:p:323-340 | VERIFIED-PRIMARY (abstract; effect sizes NOT-FOUND — PDF not retrievable) |
| Bradbury, Hens, Zeisberger, Review of Finance 2015 | Simulated experience improved understanding of the risk-return profile; participants chose riskier products without regret. | — | search summary only (CORE / ZORA / OUP PDFs blocked) | SECONDARY |
| Mercer, Palmiter, Taha, J. Empirical Legal Studies 2010 | The SEC "past performance" disclaimer changed neither propensity to invest nor return expectations. A disclaimer stating that high returns generally do not persist worked much better. Abstract has no numbers. | "this SEC-mandated disclaimer is completely ineffective. The disclaimer neither reduces investors' propensity to invest in advertised funds nor diminishes their expectations regarding the funds' future returns." | https://ideas.repec.org/a/wly/empleg/v7y2010i3p429-459.html | VERIFIED-PRIMARY (abstract) |
| Beshears, Choi, Laibson, Madrian, NBER WP 14859 (summary prospectus) | Shorter, simplified disclosure did **not** change portfolio choices. | "We find no evidence that the Summary Prospectus affects portfolio choices." | https://www.nber.org/system/files/working_papers/w14859/w14859.pdf | VERIFIED-PRIMARY |
| Frydman & Rangel, JEBO 2014 (purchase price salience) | 58 Caltech subjects (33 high-salience, 25 low). Not displaying the purchase price made the disposition effect 25% smaller. | "reduces the size of the disposition effect by 25%" | https://www.rnl.caltech.edu/publications/pdf/frydman2014a.pdf | VERIFIED-PRIMARY. Small lab sample; effect shrinks, does not vanish. |

### 2.4 AI explanations and reliance

| Study | Finding and numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| Bansal et al., CHI 2021 ("Does the Whole Exceed its Parts?") | 1,500+ participants, three datasets. Explanations did not add to team accuracy beyond showing AI confidence; they raised acceptance of the AI's answer whether right or wrong. | "explanations increased the chance that humans will accept the AI's recommendation, regardless of its correctness" · "explanations increased blind trust rather than appropriate reliance on AI" | https://arxiv.org/pdf/2006.14779 | VERIFIED-PRIMARY (direction; per-condition percentages not extracted) |
| Zhang, Liao, Bellamy, FAT* 2020 | Experiment 1: 72 MTurk participants. Showing a confidence score calibrated trust; local explanations did not; calibrated trust alone did not improve joint accuracy. | "confidence score can help calibrate people's trust in an AI model" · "Trust calibration alone is not sufficient to improve AI-assisted decision making." | https://arxiv.org/pdf/2001.02114 | VERIFIED-PRIMARY (direction) |
| Buçinca, Malaya, Gajos, CSCW 2021 | N = 199. Cognitive forcing designs cut over-reliance vs simple explanations, but were rated worst; benefit skewed to high Need-for-Cognition people. | "people assigned the least favorable subjective ratings to the designs that reduced the overreliance the most" | https://arxiv.org/abs/2102.09692 | VERIFIED-PRIMARY (abstract; numbers not extracted) |
| Vasconcelos et al., CSCW 2023 | N = 731 across 5 studies (maze task). People engage with an explanation only when it lowers the cost of checking the AI. | "people strategically choose whether or not to engage with an AI explanation" | https://arxiv.org/abs/2212.06823 | VERIFIED-PRIMARY (abstract) |
| Kim, Liao, Vorvoreanu, Ballard, Wortman Vaughan, FAccT 2024 ("I'm Not Sure, But…") | N = 404, pre-registered, medical questions. Agreement with the AI: control 80.9%, first-person uncertainty 74.8% (significant), general-perspective uncertainty 77.6% (n.s.), no-AI 58.4%. Accuracy: control 63.9% → first-person 72.8% (p < .01); general 67.9%; no-AI 74.2%. Confidence in AI answer 3.95 → 3.66 (first-person). Trust intention 3.25 → 2.91. | "(80.9% Control vs. 58.4% No-AI)" · "reduced (but not fully eliminated) overreliance on incorrect answers" | https://arxiv.org/pdf/2405.00623 | VERIFIED-PRIMARY. **Note: with an AI that was sometimes wrong, no-AI users were as accurate (74.2%) as the best AI condition.** |
| Steyvers et al., Nature Machine Intelligence 2025 | 301 participants. Users overestimate LLM accuracy with default explanations; longer explanations raise confidence without raising accuracy; wording that mirrors model confidence narrows the gap. Figure text shows calibration error for GPT-3.5 multiple choice of 0.104 (model) vs 0.291 (human perception) — panel mapping read from extracted figure text, treat as approximate. | "users tend to overestimate the accuracy of LLM responses when provided with default explanations" · "longer explanations increased user confidence, even when the extra length did not improve answer accuracy" | https://arxiv.org/pdf/2401.13835 | VERIFIED-PRIMARY (text); ECE pair approximate |
| Si et al. 2023 ("Large Language Models Help Humans Verify Truthfulness—Except When They Are Convincingly Wrong") | 80 crowdworkers. LLM explanations as accurate as search and faster, but users over-rely when the explanation is wrong; showing both the for and against case reduces over-reliance. | "they over-rely on the LLMs when the explanation is wrong" | https://arxiv.org/pdf/2310.12558 | VERIFIED-PRIMARY (abstract-level) |
| Ding et al., AAAI 2025 ("Citations and Trust in LLM Generated Responses") | 303 participants (0 citations n = 108, 1 n = 96, 5 n = 101; random citation n = 87, valid n = 110). Citations raised trust; random citations lowered it relative to valid; 1 citation = 5 citations (p > .05); F(2, 3037) = 10.23, p < .001 across counts; people who checked citations reported lower trust. | "five citations in an answer are not perceived as more trustworthy than an answer with one citation" · "a significant decrease in trust when participants checked the citations" | https://arxiv.org/pdf/2501.01303 | VERIFIED-PRIMARY. Single study; trust is self-report. |

### 2.5 Algorithm aversion / appreciation and track record

| Study | Finding and numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| Dietvorst, Simmons, Massey, JEP: General 2015 | 5 studies. People who watched the model perform were less likely to choose it — even though 610 of 741 (83%) of those who saw both saw the model outperform the human. Humans made 15–29% more error (MBA task) and 90–97% more (other task) than the model. | "seeing an algorithm perform makes people less likely to choose it" · "people more quickly lose confidence in algorithmic than human forecasters after seeing them make the same mistake" | https://faculty.wharton.upenn.edu/wp-content/uploads/2016/11/20-Dietvorst-Simmons-Massey-2015.pdf | VERIFIED-PRIMARY (choice shares per condition are in figures, not extracted) |
| Dietvorst, Simmons, Massey, Management Science 2018 | Chose to use the model: 32% when it could not be changed vs 73% / 76% when it could be adjusted slightly (N = 145); 47% vs 77% / 75% (N = 542); 47% vs 70% with adjust-by-2/5/10 (68–71%). | "Whereas only 32% of participants in the can't-change condition chose to use the model's forecasts, 73% of participants in the change-10 condition" | https://marketing.wharton.upenn.edu/wp-content/uploads/2020/07/Dietvorst-Overcoming-Algorithm-Aversion.pdf (working-paper version) | VERIFIED-PRIMARY |
| Logg, Minson, Moore, OBHDP 2019 | Lay people weighted identical advice more when labelled as from an algorithm: weight of advice .45 vs .30, d = .42 (Exp 1A); other experiments d = .44. Effect weakens when choosing between the algorithm and one's own estimate; experienced forecasters relied less and were less accurate. | "relying more on the same advice when they thought it came from an algorithm (M = .45, SD = .37), than when they thought it came from other people (M = .30, SD = .35) ... d = .42" | https://www.hbs.edu/ris/Publication%20Files/17-086_610956b6-7d91-4337-90cc-5bb5245316a8.pdf (working-paper version) | VERIFIED-PRIMARY |
| Yin, Wortman Vaughan, Wallach, CHI 2019 | Trust follows both the stated accuracy and the accuracy people observe; what they observe can override the stated figure. | "people's trust in a model is affected by both its stated accuracy and its observed accuracy, and that the effect of stated accuracy can change depending on the observed accuracy" | https://par.nsf.gov/servlets/purl/10142468 | VERIFIED-PRIMARY (abstract; effect sizes not extracted) |
| "Selective accuracy disclosure" | — | — | not located as a named study | NOT-FOUND |

### 2.6 Information load, consolidated summaries

| Study | Finding and numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| Tsai, Klayman, Hastie, OBHDP 2008 | Three studies (football prediction): more information raised confidence more than accuracy. Abstract has no numbers. | "when judges receive more information, their confidence increases more than their accuracy, producing substantial confidence-accuracy discrepancies" | https://econpapers.repec.org/RePEc:eee:jobhdp:v:107:y:2008:i:2:p:97-105 | VERIFIED-PRIMARY (abstract; the specific numbers from the paper NOT-FOUND — full text paywalled) |
| Peters et al., Med. Care Res. Rev. 2007 ("Less is more") | Three studies; less, better-highlighted information gave higher comprehension and better choices, most for low numeracy. | "'less is more' when presenting consumers with comparative performance information" | Europe PMC abstract, PMID 17406019 | VERIFIED-PRIMARY (abstract) |
| Schwartz, Woloshin, Welch, Ann. Intern. Med. 2009 (drug facts box, 2 RCTs) | n = 231 and n = 219. One structured table replacing the "brief summary": correctly judged the better drug 70% vs 8%; recognised similar side effects 80% vs 38%; chose the superior drug 68% vs 31%; correctly quantified statin benefit 72% vs 9% (all P < 0.001). | "70% of the drug box group and 8% of the control group correctly identified the PPI as being 'a lot more effective'" | Europe PMC abstract, PMID 19221371 | VERIFIED-PRIMARY (abstract). Control was a dense ad page, so the gain mixes "structured numbers" with "numbers present at all". |
| Stacey et al., Cochrane 2024 (patient decision aids) | 209 RCTs, 107,698 participants. Knowledge +11.90/100 (CI 10.60–13.19; 107 studies); accurate risk perception RR 1.94 (1.61–2.34; 25 studies); informed, values-congruent choice RR 1.75 (1.44–2.13). | "high-certainty evidence that patient decision aids result in improved participants' knowledge (MD 11.90/100 ...)" | Europe PMC abstract, PMID 38284415 | VERIFIED-PRIMARY (abstract) |
| Akl et al., Cochrane 2011 (framing) | 35 studies, 16,342 participants. Positive attribute framing may raise perceived effectiveness (SMD 0.36, CI −0.13 to 0.85); little or no effect on persuasiveness (SMD 0.07) or behaviour (SMD 0.09; goal framing SMD −0.06). | "little or no difference in persuasiveness ... and behavior" | Europe PMC abstract, PMID 22161408 | VERIFIED-PRIMARY (abstract; health messages) |
| Peters et al., Psych. Science 2006 (numeracy) | Less numerate people are more susceptible to framing and irrelevant affect. | "less susceptible to framing effects, compared with less numerate individuals" | Europe PMC abstract, PMID 16683928 | VERIFIED-PRIMARY (abstract) |
| A direct experiment: one consolidated panel vs several detailed panels (finance) | — | — | not located | NOT-FOUND |
| Progressive disclosure — controlled evidence on comprehension | — | — | not located | NOT-FOUND |
| Split-attention / spatial contiguity meta-analysis | — | — | lookup returned nothing | NOT-FOUND |

### 2.7 Streaming / progressive text

| Study | Finding and numbers | Quote | URL opened | Grade |
|---|---|---|---|---|
| Tan, Messerschmidt, Yin, Nov, CHI 2026 | 240 participants, 3 (time to first token 2 / 9 / 20 s) × 2 (creation / advice). Thoughtfulness: F(2,234) = 5.12, p = .007, ηp² = .037; 2 s M = 5.76 vs 9 s 6.09 vs 20 s 6.11. Usefulness: F(2,234) = 3.61, p = .028, ηp² = .032. **Trustworthiness: no significant effect.** Streaming rate after first token was held constant. | "participants who experienced short waits (2 s) rated the LLM's responses as less thoughtful and less useful than those generated after longer waits (9-20 s)" · "Trustworthiness: No significant main or interaction effects" | https://arxiv.org/pdf/2604.06183 | VERIFIED-PRIMARY. Small effects; no time pressure; measures perception, not comprehension. |
| Xiao & Yang, "Streaming, Fast and Slow" (arXiv 2504.17999) | Proposes slowing the stream for dense content and speeding it for easy content, keeping it above reading speed; based on a crowdsourced study. Comprehension scores not reported in what I read. | "simpler content is streamed more quickly to better align with the user's natural reading speed" | https://arxiv.org/pdf/2504.17999 | VERIFIED-PRIMARY (design claim only) |
| Sentence-level reveal vs token-level vs all-at-once — effect on reading comprehension | — | — | searched HCI 2023–2026 | NOT-FOUND. The "streaming feels 40–60% faster" figure seen in blogs has no traceable study. |

### 2.8 Plain-language rules

| Rule | Evidence | Grade |
|---|---|---|
| Same denominator, never "1 in X" | Cuite 2008 (45% vs 55–57%), Sirota 2018, Pighin 2011 | VERIFIED-PRIMARY |
| "38 out of 100" vs "38%" | Mixed: frequencies help Bayesian tasks (Gigerenzer & Hoffrage), percent was better for absolute differences (Woloshin & Schwartz 72% vs 43%), roughly equal for simple operations (Cuite 55% vs 57%) | VERIFIED-PRIMARY — no clear winner for a single probability |
| Gain / loss framing | Small or no behavioural effect in health (Akl 2011); stronger on the less numerate (Peters 2006) | VERIFIED-PRIMARY (not finance) |
| Purchase price as anchor | Frydman & Rangel 2014, 25% smaller disposition effect when hidden | VERIFIED-PRIMARY |
| Sentence length, jargon glossing — controlled evidence with effect sizes | not located | NOT-FOUND |

---

## Conclusions

### (a) Ten evidence-backed rules for the one-panel scenario card, ranked

1. **State the probability as a number, never as a word alone.** Verbal hedges cut trust in the figure (d = 0.75) while a numeric range did not (van der Bles 2020); readers misread probability words even with a legend (Budescu 2009; Dhami & Mandel 2022). *Caveat:* tested on official statistics, not price forecasts.
2. **Use one fixed denominator and show both forms: "100번 중 38번 (38%)". Never "1 in X".** 1-in-n accuracy 45% vs 55–57% (Cuite 2008); 1-in-X inflates perceived risk (Sirota 2018). *Caveat:* frequency alone is not better than percent — percent won on absolute differences 72% vs 43% (Woloshin & Schwartz 2011) — hence both.
3. **Keep the card to a few numbers; put detail behind a tap.** "Increased detail often meant poorer performance" (EC KID 2015); less-is-more for low numeracy (Peters 2007); more information raises confidence more than accuracy (Tsai 2008); the median retail investor spends ~6 minutes per trade and many stop at the snapshot (Laarits & Wurgler 2025). *Caveat:* simplification may save time without changing choices (Beshears et al.: no effect of the Summary Prospectus).
4. **Put the track record next to the claim, with both the stated hit rate and visible recent hits and misses.** Trust follows observed accuracy as well as stated accuracy (Yin 2019). *Caveat:* seeing an algorithm err lowers use even when it beat the human 83% of the time (Dietvorst 2015) — show the comparison baseline in the same line, and expect lower uptake; that is the intended calibration.
5. **Keep AI prose short and make its uncertainty first-person and tied to measured confidence.** First-person uncertainty cut agreement 80.9% → 74.8% and raised accuracy 63.9% → 72.8% (Kim 2024); longer explanations raise confidence without accuracy (Steyvers 2025). *Caveat:* medical Q&A; trust intention also fell (3.25 → 2.91); generic hedges had no significant effect.
6. **Do not rely on explanation to prevent over-trust; show the case against as well.** Explanations raised acceptance regardless of correctness (Bansal 2021); contrastive for/against text reduced over-reliance (Si 2023); explanations help only when they make checking cheaper (Vasconcelos 2023). *Caveat:* designs that force thinking reduce over-reliance most and are liked least (Buçinca 2021).
7. **One valid, openable source per factual sentence — not a list.** Citations raise trust; one equals five; irrelevant citations lower it; checking lowers trust (Ding 2025, N = 303). *Caveat:* citations raise trust even when users do not open them, so a wrong citation is worse than none.
8. **If a graphic is used, make it countable (20–50 dots or a 100-icon array), not a fan or density curve.** Dotplot decisions reached 97% of optimal, +5 points over no uncertainty (Fernandes 2018); 1.15× lower variance than density (Kay 2016); funnel-of-doubt and histogram lost to a table or line (EC KID 2015). *Caveat:* transit decisions with feedback; icon arrays make risk feel less serious (Galesic 2009); a plain table may be enough.
9. **Replace "past performance does not guarantee" boilerplate with the specific base-rate fact.** The standard disclaimer changed nothing; a statement that high returns generally do not persist worked (Mercer, Palmiter, Taha 2010). *Caveat:* one experiment on fund advertisements; no effect size in the abstract.
10. **Keep the purchase price off the judgment panel.** Hiding it shrank the disposition effect by 25% (Frydman & Rangel 2014). *Caveat:* 58 lab subjects; the bias remains.

Supplementary, weaker evidence: give the bad case as a numeric range with a reference point, because the size of a bare range barely registered (van der Bles Exp 2). For streaming, do not shorten latency at the cost of content — a 2 s first token was rated slightly less thoughtful than 9–20 s and trust did not move (Tan 2026); there is no evidence either way on sentence-level reveal.

### (b) Merging explanation + numbers + track record in one panel vs splitting

- **No direct finance experiment comparing one consolidated panel with several detailed panels was found (NOT-FOUND).** The conclusion below is by analogy.
- For merging: a single structured table of outcomes produced large comprehension gains (70% vs 8%, drug facts box); decision aids that put options, probabilities and trade-offs in one artefact improve knowledge (+11.9/100) and risk perception (RR 1.94); simpler KID variants beat detailed ones; retail attention is ~6 minutes, mostly on one snapshot page.
- Against merging everything at equal weight: fluent explanation placed beside numbers raises confidence without accuracy (Steyvers) and raises acceptance of wrong answers (Bansal). More content raises confidence faster than accuracy (Tsai).
- Reading: one panel, numbers first and fixed, track record on the same panel as the claim it qualifies, prose short and subordinate, everything else on demand. The evidence supports merging the three *kinds* of content, not merging their full detail.

### (c) Korea — legal and regulatory constraints on wording

Statute text (자본시장법, 시행 2024-08-14, via casenote.kr mirror) — VERIFIED-PRIMARY (mirror)

- 제6조 ⑦ 투자자문업: "금융투자상품등의 가치 또는 금융투자상품등에 대한 투자판단(종류, 종목, 취득·처분, 취득·처분의 방법·수량·가격 및 시기 등에 대한 판단을 말한다)에 관한 자문에 응하는 것을 영업으로 하는 것" — https://casenote.kr/법령/자본시장과_금융투자업에_관한_법률/제6조
- 제7조 ③: "개별성 없는 조언(개별 투자자를 상정하지 아니하고 다수인을 대상으로 일방적으로 이루어지는 투자에 관한 조언을 말한다)을 하는 경우에는 투자자문업으로 보지 아니한다. 다만, 본문의 조언과 관련하여 온라인상에서 일정한 대가를 지급한 고객과 의견을 교환할 수 있는 경우에는 그러하지 아니하다." — …/제7조
- 제101조 ① 유사투자자문업: "투자자문업자 외의 자로서 고객으로부터 일정한 대가를 받고 간행물·출판물·통신물 또는 방송 등을 통하여 행하는 ... 개별성 없는 조언을 하는 것을 업" → 신고 대상 — …/제101조
- 제101조의2 ② 금지 표시·광고: "손실보전 또는 이익보장이 되는 것으로 오인하게 하는 표시 또는 광고", "수익률을 사실과 다르게 표시하거나 실현되지 아니한 수익률을 제시하는 표시 또는 광고", 비교 대상·기준 없이 유리하다고 주장 — …/제101조의2
- 제101조의3 표시 의무: "개별적인 투자 상담과 자금운용이 불가능하다는 사항", "원금에 손실이 발생할 수 있으며 그 손실은 투자자에게 귀속된다는 사항", "정식 금융투자업자가 아닌 유사투자자문업자라는 사항" — …/제101조의3

금융위원회 보도자료 (2024-08-13, 자산운용과) — VERIFIED-PRIMARY — https://www.fsc.go.kr/no010101/82887

- Similar-advisory businesses may only use one-way channels for non-individualised advice to the general public; paid two-way channels (SNS, open chat) require registration as an investment adviser. Unregistered advisory: up to 3 years' imprisonment or a fine up to 100 million won.
- Prohibited in advertising: looking like a financial company, false or unrealised returns, showing only the good period, and asserting uncertain matters as certain (단정적 판단).

Other

- 인공지능기본법 제31조 (시행 2026-01-22): ① prior notice that the service runs on generative AI; ② "그 결과물이 생성형 인공지능에 의하여 생성되었다는 사실을 표시하여야 한다." — https://casenote.kr/법령/인공지능_발전과_신뢰_기반_조성_등에_관한_기본법/제31조 — VERIFIED-PRIMARY (mirror). Applies to "인공지능사업자".
- 가상자산 이용자 보호 등에 관한 법률 제10조: bans use of undisclosed material information, wash trades, and false or misleading statements on material matters to gain profit — …/가상자산_이용자_보호_등에_관한_법률/제10조 — VERIFIED-PRIMARY (mirror). The similar-advisory regime in 제101조 is written for 금융투자상품; whether a given coin falls under it was not researched.
- 금융분야 AI 가이드라인 (7대 원칙, self-regulatory, applies to financial companies using AI): only search summaries seen — SECONDARY. The guideline text and any 2025 revision were not opened.
- Court rulings distinguishing 유사투자자문 from unregistered 투자자문 (대법원 2018도4413, 2023다311665 mentioned in summaries) — SECONDARY; judgments not opened.

What this means for card wording (my reading, not legal advice)

- The statutory triggers are "대가를 받고" and "업/영업으로". A free, non-commercial tool for the owner and friends does not obviously meet them, but that is an inference, not something a source states.
- Whatever the status, the wording that the statute and the regulator single out is the wording to avoid: guaranteed profit or loss cover; returns that were not realised; a track record that shows only the good stretch; stating an uncertain outcome as certain; advice framed for one named person's situation ("you should sell now").
- Wording that stays on the information side: past-frequency statements with the period and sample size, a range instead of a point target, the miss shown with the hit rate, a loss-is-yours line, and an AI-generated label on streamed sentences.
- Press analysis (SECONDARY) puts the risk line at using a person's holdings, risk profile or trading pattern to suggest timing or weights. A card that reads the user's own position to phrase a buy/sell prompt sits closer to that line than one that describes the asset.

### (d) Top practitioner pain points with numbers

1. **Time not spent with clients.** 59% of advisor time on admin, compliance and other non-client work (Fidelity 2025, n = 479); 41% of the day on clients and prospects (Fidelity 2024, n = 432); client meetings 8.8 h/week, under 20% of time (Kitces, 1,000+ advisors). VERIFIED-PRIMARY, with the caveat that the Fidelity pair is two surveys.
2. **AI opacity and hallucination.** Named as key adoption challenges by CFA Institute members and roundtables; no percentage in the report. ChatGPT used by ≥75% of respondents; GenAI users 49% daily. VERIFIED-PRIMARY (qualitative).
3. **Skills gap and data quality / fragmented tooling.** CFA Institute 2025, qualitative. VERIFIED-PRIMARY.
4. **Korean sell-side: optimism bias under workload and relationship pressure.** Buy ratings ≈91% after 2015; target price hit 19% of the time; ~740,000 reports (KCMI via Newsis). SECONDARY.
5. **Korean retail: unreliable apps and information.** 59% of 2,100 app traders reported a complaint; 15.1% of those cited inaccurate or false investment information (한국소비자원 via Herald). SECONDARY.
6. **Regulatory uncertainty for AI.** 48% of AI-using managers call divergent regulation a significant risk (Mercer). SECONDARY.

Not found with openable numbers: analyst time split between data gathering and analysis, MiFID II research-volume effects, trader surveys on hallucination, any Korean survey of PB / analyst / fund-manager workload.
