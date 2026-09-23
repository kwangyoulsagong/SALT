# AI 가격 예측 · 분석 고도화 딥리서치 보고서

- 작성일: 2026-09-23
- 대상: 개인용 투자 코치 앱 (비공개 · 초대제 · 무료, 국내/미국 주식 + 코인). 현재 서버는 Node/TypeScript + Prisma/Postgres, 해설 문장은 Gemini Flash 무료 티어.
- 표기: **[확인]** = 출처 원문/공식 문서에서 확인, **[2차]** = 블로그·요약 사이트 등 2차 출처(수치가 바뀌었을 수 있음), **[추정]** = 조사 결과를 바탕으로 한 필자의 판단.

---

## 0. 한 페이지 요약

1. **LLM은 "숫자 예측기"로 쓰면 안 된다.** LLM이 뉴스로 주가 반응을 맞힌다는 연구(Lopez-Lira & Tang)는 있지만, 그 90% 수치는 *뉴스 직후 초기 반응(거래 불가능한 구간)* 을 포트폴리오-일 단위로 모은 것이다. 학습 기간 안의 백테스트는 **기억(memorization)** 으로 부풀려진다는 연구가 2025~2026년에 연달아 나왔다. LLM 에이전트 트레이딩 벤치마크에서도 대부분이 buy-and-hold를 못 이겼다.
2. **시계열 파운데이션 모델(TimesFM · Chronos · Moirai 등)을 제로샷으로 쓰면 일간 수익률 방향 적중률은 약 50~51%다.** 랜덤워크 대비 개선도 "작고 드물다". 금융 데이터로 처음부터 사전학습해야 의미 있는 개선이 나왔다(약 20억 관측치 규모).
3. **현실적인 방향 적중률은 일간 50~53%, 좋아도 55% 안팎이다** (논문 근거는 §4.3). "적중률 높음"을 약속하면 안 된다. 대신 **분위수 구간 + 구간 커버리지(보정) + 과거 적중률 공개** 를 약속해야 한다.
4. 뉴스 감성, 내부자 거래(기회적 매수), 자사주 소각, 거래소 유입 같은 **데이터는 실제로 약한 신호가 있다**. LLM이 아니라 **피처**로 쓰는 게 맞다.
5. 권장 구조는 셋으로 나뉜다. **예측 모델(숫자) = LightGBM 분위수 회귀 + 통계 베이스라인 + (선택) Chronos-Bolt/TimesFM 제로샷을 앙상블하고, conformal로 보정한다. 온톨로지(사실) = Postgres 테이블 + point-in-time 엣지. 에이전트(설명·탐색) = LLM이 도구로 사실과 숫자를 조회해 문장만 쓴다.** 그리고 LLM이 숫자를 만들지 않게 한다.
6. 레포의 제품 공통 수용 기준(`.claude/rules/pr-convention.md` §6)과도 맞아야 한다. 이 기준은 **"목표주가·수익률 예측 0건, 확신 표현 0건, 근거·과거 적중률·실패사례 3종"** 이다. 그래서 "이 날 팔면 얼마 이득"을 점 예측으로 내면 **레포 규칙 위반**이다. 대신 "과거 비슷한 상황에서 N주 뒤 수익률 분포(10~90%)와 그 구간이 실제로 맞은 비율"로 표현한다.

---

## 1. LLM의 주가·코인 예측 능력 — 실증 연구

### 1.1 긍정적 결과
| 연구 | 내용 | 주의점 |
|---|---|---|
| Lopez-Lira & Tang, *Can ChatGPT Forecast Stock Price Movements?* (2023, 2025-10 개정) [확인] https://arxiv.org/abs/2304.07619 | 지식 컷오프 이후 헤드라인으로 GPT-4가 **초기 시장 반응** 방향을 포트폴리오-일 기준 약 90% 맞힘(야간 뉴스 93.3%, 장중 88.8%). 이후 드리프트도 유의하게 예측(소형주·악재에서 강함). 모델이 클수록 예측력이 커짐. LLM 채택이 늘수록 전략 수익이 감소함 | 90%는 **거래 불가능한 초기 반응**이고, 개별 종목·개별 일의 적중률이 아니라 포트폴리오-일 단위다. 드리프트 수익도 채택 확대로 줄어듦 |
| He, Lv, Manela, Wu, *Chronologically Consistent LLMs* (2025) [확인] https://arxiv.org/abs/2502.21206 | 시점별 데이터로만 학습한 ChronoBERT/ChronoGPT로 다음날 수익률을 예측해도 큰 Llama와 비슷한 Sharpe가 나옴 → 이 과제에서는 룩어헤드 편향이 "modest"함. 모델 공개: https://huggingface.co/manelalab | 뉴스→다음날 수익률, 횡단면 롱숏 기준이다. 개별 종목 주간 수익률 금액 예측과는 다름 |

### 1.2 룩어헤드 편향 · 기억 문제 (핵심)
- **Glasserman & Lin (2023)** [확인] https://arxiv.org/abs/2309.17322 — GPT 감성 백테스트의 편향은 두 가지다. (a) 결과를 알고 있는 look-ahead, (b) 회사 이름에 대한 일반 지식이 감성 판단을 흐리는 distraction. 헤드라인을 익명화하면 성과가 오히려 좋아졌다 → distraction 효과가 더 컸다.
- **Lopez-Lira, Tang, Zhu, *The Memorization Problem* (2025)** [확인] https://arxiv.org/abs/2504.14765 — LLM은 컷오프 이전 경제·금융 수치를 정확히 기억한다. "과거 시점을 지키라"는 지시도, 마스킹도 막지 못한다(최소 맥락으로 엔티티·날짜를 복원). 컷오프 이후에는 recall이 없다. **블랙박스 모델로는 학습 기간 안의 예측력이 실력인지 기억인지 식별할 수 없다.**
- **Gao, Jiang, Yan, *Detecting Lookahead Bias in LLM Forecasts* (2025-12, 2026-06 개정)** [확인] https://arxiv.org/abs/2512.23847 — "Lookahead Propensity"는 학습 기간 내내 양수였다가 컷오프 직후 0으로 떨어진다. 헤드라인→수익률 예측력이 LAP 높은 표본에서 증폭되고, 컷오프 이후 표본에서는 유의성이 사라진다.
- **FinCAD, *Summoning the Oracle to Slay It* (EMNLP 2026)** [확인] https://arxiv.org/abs/2605.24564 — 7~14B 모델 5종에서 기억을 억제하자 학습 기간 백테스트 수익이 최대 **-67.1%** 줄었다. 2025년 out-of-sample 성과는 비교적 안정적이었다. → 학습 기간 백테스트의 상당 부분이 기억이었다는 뜻이다.
- 관련: Look-Ahead-Bench https://arxiv.org/pdf/2601.13770 , Temporal Leakage in LLM Backtesting https://arxiv.org/html/2608.02985 [2차, 초록만 확인].

### 1.3 LLM 에이전트 트레이딩 벤치마크
- **StockBench (2025)** [확인] https://arxiv.org/abs/2510.02209 — 오염이 없는 기간(2025-03~06, DJIA 20종목, 82거래일)에서 "**대부분의 모델이 단순 buy-and-hold를 넘지 못했다**". 정적 금융 QA 성적은 실제 매매 성과로 이어지지 않았다.
- 코인: LLM이 보고서 품질은 좋지만 방향 판단은 나쁘고, ML 모델에 LLM을 더해도 이득이 없었다는 보고가 있다 [2차, 검색 요약. 원문 미확인]. 체계적 연구: PRICE https://arxiv.org/html/2609.05235 [2차].

### 1.4 결론 [추정]
- LLM은 **텍스트를 구조화된 신호로 바꾸는 데**(감성·이벤트 분류) 쓸모가 있다. 이것도 컷오프 이후 데이터로 검증했을 때 한정이다.
- LLM에게 "다음 주 몇 % 오를까"를 묻는 것은 **검증할 수 없는 기억 + 확신 과잉 문장**을 만드는 일이다. 과거 백테스트로 그 능력을 입증할 방법도 사실상 없다(위 Memorization Problem).

---

## 2. 시계열 파운데이션 모델(TSFM)

### 2.1 모델별 라이선스 · CPU 가능 여부
| 모델 | 라이선스 | 크기 / CPU | 출력 | 출처 |
|---|---|---|---|---|
| Google **TimesFM 2.5** | Apache-2.0 [확인] | 200M. CPU에서 약 1.5GB RAM [2차] | 평균 + 10~90% 분위수, 컨텍스트 최대 1024(기본), horizon 256 [확인] | https://huggingface.co/google/timesfm-2.5-200m-pytorch |
| Amazon **Chronos-2 / Chronos-Bolt** | Apache-2.0 [확인] | Chronos-2 120M. CPU·GPU 모두 지원. Bolt는 원조 Chronos 대비 최대 250배 빠르고 메모리 20배 효율 [확인] | 분위수. Chronos-2는 다변량·공변량 지원 | https://github.com/amazon-science/chronos-forecasting , https://huggingface.co/amazon/chronos-2 |
| Salesforce **Moirai 2.0** | **가중치 CC-BY-NC-4.0**(비상업), 코드 Apache-2.0 [2차] | small 있음 | 분위수 | https://huggingface.co/Salesforce/moirai-2.0-R-small |
| **Lag-Llama** | Apache-2.0 [확인] | 소형 | 확률분포 | https://github.com/time-series-foundation-models/lag-llama |
| IBM **Granite TTM** | Apache-2.0 [2차] | 1M급 초소형, CPU 전용 머신에서도 실행 가능 [2차] | 점 예측 중심 | https://huggingface.co/ibm-granite/granite-timeseries-ttm-r2 |
| **Kronos** (금융 K-line 전용, AAAI 2026) | MIT [2차] | 여러 크기(small 등) | OHLCV 토큰 생성 | https://github.com/shiyu-coder/Kronos |

범용 벤치마크(GIFT-Eval)에서는 Chronos-2 · TimesFM-2.5 · TiRex · Toto 2.0 등이 상위권이다 [2차] https://arxiv.org/pdf/2510.15821 , https://arxiv.org/pdf/2605.20119. 다만 GIFT-Eval은 **전력·교통·매출처럼 신호가 있는 계열이 대부분**이라 금융 수익률 성능을 대변하지 않는다 [추정].

### 2.2 금융 수익률에서의 실증
- **Rahimikia, Ni, Wang, *Re(Visiting) TSFMs in Finance* (2025-11)** [확인] https://arxiv.org/abs/2511.18578 (본문 https://arxiv.org/html/2511.18578v1)
  - 전 세계 94개국 일간 초과수익률, 약 20억 관측치.
  - **제로샷**: Chronos(large) OOS R² −1.37%, 방향 적중 약 51%. TimesFM(500M) R² −2.80%, 방향 약 50%.
  - **벤치마크**: CatBoost R² −0.10%, 방향 51.16%(512일 창). OLS −0.47%.
  - **파인튜닝**: 대부분 오히려 악화되거나 격차를 못 좁혔고 경제적 이득도 없었다.
  - **금융 데이터로 처음부터 사전학습**하면 크게 개선됐다(롱숏 포트폴리오 Sharpe 3~5대). 그래도 적합도 지표는 벤치마크보다 낮다.
- **Noguer i Alonso & Franklin (2026-06)** [확인] https://arxiv.org/abs/2606.27100 — TimeGPT · TimesFM-2.5 · Moirai-2.0 · Chronos · Chronos-2 vs NBEATS/PatchTST 등, 미국 대형주 5개. TSFM이 순위는 우세(10개 과제 중 8승)했지만 **랜덤워크 대비 개선은 작고 드물었다**. Diebold-Mariano 검정에서 유의한 것은 2건뿐이다. 저자 결론은 "알파 생성기가 아니라 실용적 prior".

### 2.3 판정 [추정]
- 무료이고 CPU로 돌릴 수 있다: **Chronos-Bolt(small/base), TimesFM 2.5, TTM** — 모두 Apache-2.0이라 개인 앱에 문제없다. Moirai는 비상업 라이선스라 무료 앱이어도 피하는 게 안전하다.
- 쓰임새: **방향 예측기가 아니라 "변동성·구간 폭의 prior"** 로 쓴다. 수익률 평균은 거의 0 근처로 나오고, 쓸모 있는 건 분위수 폭(=불확실성)이다. 앙상블의 한 멤버 정도로 둔다.
- 파인튜닝은 1인 규모에서 이득 근거가 없다(위 논문). 금융 전용 사전학습은 20억 관측치 규모라 1인 개발자가 할 일이 아니다.

---

## 3. 금융 특화 LLM · 감성 모델

| 모델 | 근거 | 판정 |
|---|---|---|
| **BloombergGPT** (50B, 비공개) | 같은 크기의 오픈 모델보다는 금융 과제에서 나았지만, GPT-4가 대부분의 금융 과제에서 앞섰다(FinQA 제로샷 68.79%) [2차] https://arxiv.org/abs/2305.05862 | 사용 불가(비공개). 이제는 의미 없음 |
| **FinGPT** (오픈, LoRA 파인튜닝) | FPB · FiQA 감성에서 GPT-4와 대등하거나 약간 우위 [2차] https://arxiv.org/pdf/2307.10485 , https://arxiv.org/abs/2412.10823 | 감성 분류기로는 쓸 수 있지만 운영 부담(7B급 GPU)이 크다 |
| **FinBERT** (Huang, Wang, Yang, CAR 2022) | 금융 텍스트 감성 분류의 표준 베이스라인. 110M이라 CPU로 돌아간다 https://arxiv.org/pdf/2306.02136 | **영문 뉴스 감성 피처용으로 가장 현실적** |
| **ChronoBERT** | 시점 일관 학습이라 백테스트 오염이 없다 https://huggingface.co/manelalab | 백테스트 정직성이 필요하면 FinBERT 대신 쓸 수 있다 |
| 범용 LLM(Gemini 등) 감성 | 크립토 뉴스 감성 정확도에서 파인튜닝 GPT-4 86.7% vs FinBERT 84.3% 수준으로 비슷하다 [2차] | 비용과 한도를 생각하면 **FinBERT를 기본으로 두고 LLM은 한국어·애매한 건만** 처리 |

**감성→수익률 예측력**: 헤드라인 감성은 다음날 수익률과 초기 반응에 유의한 정보를 준다(Lopez-Lira & Tang, Chrono LLM). 효과는 **소형주·악재·단기**에 집중되고, 채택이 늘면서 줄어든다 [확인, §1.1]. 한국어 뉴스용 공개 금융 감성 모델은 이번 조사에서 확정하지 못했다(미확인).

---

## 4. 직접 구축 베스트 설계 (Python 기준)

### 4.1 전체 흐름
```
[수집 배치] ─▶ [원천 테이블(raw, as_of 시각)] ─▶ [피처 빌드(point-in-time)]
      ─▶ [모델 학습/예측: LGBM 분위수 + 베이스라인 + TSFM 제로샷]
      ─▶ [conformal 보정] ─▶ [forecast 테이블] ─▶ [평가 배치: 적중률·커버리지 공개 테이블]
                                                  └▶ Node 서버가 읽어 BFF로 → LLM은 문장만
```

### 4.2 데이터 → 피처
| 그룹 | 피처 예시 | 출처 (§6) |
|---|---|---|
| 가격 | 1/5/20/60일 수익률, 실현 변동성, ATR, 52주 고점 대비, 거래대금 z-score, 시장·섹터 대비 초과수익 | 기존 시세 |
| 수급(국내) | 외국인·기관 5/20일 순매수 / 시총 | KIS Open API 등 |
| 공시 | 자사주 취득/처분/**소각** 결정 이벤트 더미 + 규모/시총, 경과일 | DART DS005 |
| 내부자 | 임원·주요주주 매수/매도, **기회적(opportunistic) vs 루틴** 분리 | SEC Form 4, DART 임원 소유보고 |
| 온체인 | 거래소 순유입(7일), 대형 이체 건수 | Arkham / 무료 온체인 |
| 뉴스 감성 | FinBERT 점수 일평균, 뉴스 건수(주목도), 부정 뉴스 비율 | Finnhub/GDELT 등 |

신호 근거:
- 내부자: 기회적 내부자 매매 전략은 월 **82bp**의 가치가중 초과수익을 냈고, 루틴 매매는 0이었다 [확인] https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1692517
- 자사주: 국내 연구에서 공시 후 CAR 증가, **매입보다 소각 공시 후 상승이 더 컸다**. 반면 정보신호 효과가 없다는 연구도 있다 [2차] https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART001603786
- 온체인: 대형 BTC 거래소 입금이 6~24시간 내 수익률에 영향(Magner & Sanhueza 2025, FRL)을 주고, ETH 순유입이 ETH 수익률을 음(-)으로 예측한다 [2차] https://arxiv.org/pdf/2411.06327
- 전부 **약한 신호**다. 단독으로 방향을 맞히는 수준이 아니라 분포를 조금 이동시키는 수준이다 [추정].

### 4.3 예측 대상과 모델
- **예측 대상(타깃)**: "N주 뒤 가격"이 아니라 **h ∈ {1주, 4주} 로그 초과수익률의 분포(분위수 q10/q25/q50/q75/q90)**.
- **모델**
  1. 베이스라인(반드시 함께 저장): 랜덤워크(0 수익), 과거 평균, `statsforecast`의 Naive/ETS/GARCH 계열 변동성.
  2. **LightGBM 분위수 회귀**(`objective="quantile"`, α별 모델). 종목을 풀링한 **횡단면 패널 모델** 하나로 만든다(종목별 모델 금지 — 데이터가 부족하다).
  3. (선택) **Chronos-Bolt small / TimesFM 2.5 제로샷** 분위수 → 앙상블 멤버 또는 LGBM 피처(예측 구간 폭)로 쓴다.
  4. 앙상블: 분위수별 가중평균(가중치는 워크포워드 pinball loss로 결정) → 분위수 교차는 정렬로 보정.
- **현실적인 방향 적중률(근거)**
  - 일간: 제로샷 TSFM 약 50~51%, CatBoost 51.16% [확인, Rahimikia et al.].
  - 월간 횡단면: Gu, Kelly, Xiu(2020, RFS)의 신경망 월간 개별종목 OOS R²가 약 0.4% 수준 [기억에 근거, 이번 조사에서 원문 수치 재확인 못함] https://academic.oup.com/rfs/article/33/5/2223/5758276
  - → **목표로 삼을 만한 수치는 방향 52~55%(주간), 그 이상이 나오면 누수를 먼저 의심한다** [추정].
- **"적중률 높음"을 약속하면 안 되는 이유**
  1. 수익률은 신호 대 잡음비가 매우 낮고, 두꺼운 꼬리와 구조 변화가 있다 [확인, 2606.27100 서론].
  2. 상승장에서는 "항상 오른다"만으로 50% 이상이 나온다(베이스레이트). 이 기준선과 비교하지 않은 적중률은 의미가 없다 [추정].
  3. LLM·모델 백테스트는 기억·누수로 부풀려진다(§1.2). 실제 성능은 **공개 이후의 라이브 기록**으로만 증명된다.
  4. 효과는 알려지면 줄어든다(Lopez-Lira & Tang의 채택-수익 감소).
  5. 레포 수용 기준(§0-6)이 확신 표현과 수익률 예측을 금지한다.
  → 약속할 수 있는 것은 **"80% 구간이 실제로 약 80% 맞는다(보정됨)"** 이다. 이건 달성할 수 있고, 검증할 수 있다.

### 4.4 워크포워드 백테스트 · 룩어헤드 방지
- **확장창 워크포워드**: 학습 [t0, t) → 예측 [t, t+월), 매월 전진. `sklearn.model_selection.TimeSeriesSplit` + **purge/embargo**(타깃 horizon만큼 학습 끝을 잘라냄. 겹치는 라벨 누수 방지).
- **point-in-time 원칙**: 모든 원천 행에 `event_time`(사건 시각)과 `available_at`(우리가 알 수 있었던 시각, 공시 접수시각/뉴스 발행시각)을 둔다. 피처 조인은 `available_at <= 예측시각`만. 정정공시·재무 재작성은 버전으로 저장.
- 생존편향: 상장폐지 종목을 포함한다(국내 수집 시 주의).
- LLM 감성 피처는 **모델 컷오프 이후 구간에서만 성능을 평가**하거나, 회사명·날짜를 익명화한다(Glasserman & Lin).
- 도구: 단순 백테스트는 직접 작성하는 게 가장 투명하다. `vectorbt`(빠른 벡터화 시뮬레이션), `backtesting.py`(단일 종목 전략)는 "이 신호대로 샀다면"을 보여 주는 데만 쓴다. 매매 실행 코드는 두지 않는다(레포 §6-2).

### 4.5 보정(calibration)과 공개
- **Conformal**: `MAPIE`의 시계열 회귀(EnbPI, ACI) → 비교환성에 강한 적응형 구간 [확인] https://mapie.readthedocs.io/en/stable/generated/mapie.regression.TimeSeriesRegressor.html. 금융은 분포 이동이 있어 고전적 보장이 깨질 수 있다. 그래서 **ACI(적응형) + 최근 창 재보정**을 쓴다 [2차] https://arxiv.org/pdf/2010.09107
- 확률 표현: q50 부호만으로 "상승 확률"을 말하지 말고, 분포에서 P(r>0)을 계산한 뒤 **등온(isotonic) 보정**하고 reliability diagram으로 검증한다.
- **공개 지표(앱에 그대로 노출)**
  | 지표 | 의미 |
  |---|---|
  | 방향 적중률 vs 베이스레이트 | "같은 기간 '항상 상승' 전략은 x%" 와 나란히 |
  | 80% 구간 커버리지 | 목표 80% ± 허용오차 |
  | pinball loss / CRPS 대비 랜덤워크 skill | `properscoring` 또는 `scoringrules` |
  | 실패 사례 | 구간 밖으로 나간 최근 사례 목록 |

### 4.6 LLM의 역할 = 설명만
- 입력: forecast 테이블의 분위수·적중률·기여 피처(LightGBM SHAP 상위 3개)·온톨로지 사실.
- 출력: 문장. **숫자는 입력 JSON에 있는 것만 인용하게** 하고, 후처리로 출력 속 숫자가 입력에 있는지 검사한다(없으면 폐기).
- 금지어 필터: "확실", "반드시", "목표가", "오를 것" 등.

### 4.7 Python 스택 · 서비스 형태
| 항목 | 권장 | 이유 |
|---|---|---|
| 데이터 처리 | `polars`(주) + `pandas`(라이브러리 호환) | 1인 규모에서 빠르고 메모리 효율 |
| 모델 | `lightgbm`, `statsforecast`, `chronos-forecasting`(Bolt small), `timesfm`(선택) | 모두 Apache/MIT 계열 |
| 보정 | `mapie` | EnbPI/ACI 구현 |
| 평가 | `properscoring`/`scoringrules`, 자체 워크포워드 | CRPS·pinball |
| 감성 | `transformers` + FinBERT(CPU) | 110M |
| 서비스 형태 | **배치 워커 → Postgres 결과 테이블** (FastAPI 상시 서버는 불필요) | 예측이 일 1회라 온라인 추론이 필요 없다. Node는 테이블만 읽는다. 계약이 DB 스키마 하나로 끝난다 |
| 스케줄 | cron(또는 Prefect 1개 flow) | §7.4 |
| 재학습 | LGBM **주 1회**(주말), 예측은 **매일 장 마감 후**, conformal 보정은 매일 갱신 | 피처 드리프트 대비. 비용 미미 |
| CPU 비용 | Chronos-Bolt small: 종목 수백 개 × 일 1회면 CPU로 수 분 이내 [추정]. TimesFM 2.5는 RAM 약 1.5GB [2차] | 무료 VM/로컬로 충분 |

**최소 데이터 요구량 [추정]**: 종목당 일봉 3~5년(750~1,250행) × 풀링 종목 최소 200~500개. 이보다 적으면 LightGBM이 과적합되므로 베이스라인 + TSFM 제로샷 + conformal만 쓴다. 평가 신뢰도: 주간 예측 기준으로 **최소 52주 이상 라이브 기록**이 쌓여야 적중률 ±수%p 수준으로 말할 수 있다(표본 52개면 적중률 표준오차가 약 7%p).

---

## 5. 무료 · 저가 LLM API (2026-09 기준)

| 선택지 | 무료 한도 | 비고 |
|---|---|---|
| **Gemini API 무료 티어** | 공식 가격 페이지 기준 3.5~3.8 Flash, 3.5/3.1 Flash-Lite, **2.5 Pro**가 무료. **3.1 Pro Preview · 3 Flash Preview는 무료 아님** [확인] https://ai.google.dev/gemini-api/docs/pricing. 모델별 RPM/RPD는 AI Studio에서만 공개 [확인] https://ai.google.dev/gemini-api/docs/rate-limits (블로그의 "Flash 1,500 RPD, 2.5 Pro 50 RPD"는 [2차]) | 무료분은 **입력·출력이 제품 개선에 쓰이고 사람이 검토할 수 있다**. "민감·개인정보를 넣지 말라"고 명시 [확인] https://ai.google.dev/gemini-api/terms → **보유 종목·금액을 프롬프트에 넣는 건 약관상 부적절** |
| **Groq** | gpt-oss-120b / gpt-oss-20b / qwen3.8-27b: 30 RPM, **1,000 RPD**, 8K TPM, 200K TPD [확인] https://console.groq.com/docs/rate-limits | 매우 빠름. 조직 단위 한도 |
| **OpenRouter :free** | $10 미만 충전 시 50회/일, $10 이상 1,000회/일, 20 RPM [2차] https://openrouter.ai/docs/faq | 무료 모델 목록이 자주 바뀐다 |
| **Cerebras** | 약 100만 토큰/일, 무료 컨텍스트 8K [2차] | 긴 컨텍스트 분석엔 부족 |
| **Mistral Experiment** | 무료, 데이터 학습 동의 필요 [2차] | 평가용 |
| **DeepSeek V4-Flash** | 유료지만 매우 저렴: 비피크 $0.22/$0.66 per 1M, 피크 2배 [2차] https://costgoat.com/pricing/deepseek-api | 하루 수십 건이면 월 1달러 미만 수준 [추정] |

**"분석 문장"에 Gemini Flash보다 나은 무료 선택지?** [추정]
- 품질 차이를 결정하는 건 모델보다 **입력의 질**(구조화된 숫자·사실·근거를 넘기느냐)이다. §4.6 구조라면 Flash급으로 충분하다.
- 무료로 추론이 더 깊은 후보는 **Gemini 2.5 Pro(무료, 한도 낮음)**, **Groq gpt-oss-120b(1,000 RPD)** 다. 한국어 문장 품질은 공개 비교 근거를 찾지 못했다 → **같은 입력으로 블라인드 A/B 20건을 직접 평가하길 권장**한다.
- 개인 데이터(보유·손익)가 들어가는 프롬프트는 **데이터 학습에 쓰이지 않는 유료 경로(DeepSeek 유료, Gemini 유료)나 공개 정보만 담은 프롬프트**로 분리하는 게 안전하다.

---

## 6. 데이터 소스 (무료 위주)

| 영역 | 소스 | 무료 / 제한 | 출처 |
|---|---|---|---|
| 미국 내부자 | SEC EDGAR `data.sec.gov` (Form 4, 13F, 8-K, 10-Q, XBRL) | 무료, 키 없음. **User-Agent(이름+이메일) 필수, 초당 10요청**, 초과 시 IP 10분 차단 [확인] | https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data |
| 미국 내부자 벌크 | SEC Insider Transactions Data Sets (분기 벌크) | 무료 [확인] | https://www.sec.gov/data-research/sec-markets-data/insider-transactions-data-sets |
| 미국 자사주 | 10-Q/10-K 자사주 매입 표(Item 2/Item 5), 8-K 발표 | 무료. 파싱 필요 | EDGAR 동일 |
| 국내 자사주 | OpenDART **자기주식 취득 결정 / 처분 결정**(DS005 주요사항보고서), 사업보고서 자기주식 현황 | 무료, 키 발급. 대략 **2만 건/일** 초과 시 에러 [확인] | https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS005&apiId=2020039 |
| 국내 내부자 | OpenDART 지분공시(임원·주요주주 소유보고, 대량보유) DS004 | 무료 [확인] | https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS004&apiId=2019022 |
| 국내 수급 | KRX Open API: **투자자별 거래실적 미제공**, 1만 콜/일, **비상업 한정** [2차] https://openapi.krx.co.kr/ . KRX Data Marketplace는 2025-12-27부터 **로그인 필수**, pykrx 스크래핑은 차단 조치 중 [2차] https://github.com/sharebook-kr/pykrx/issues/244 | → 증권사 API(한국투자 KIS Developers의 투자자 동향) 사용 권장 [2차] https://apiportal.koreainvestment.com/intro |
| 해외 뉴스 | Finnhub(무료 60회/분, 회사 뉴스), Marketaux(100회/일), Alpha Vantage NEWS_SENTIMENT(무료 25회/일), GDELT(무료, 대량) [2차] | https://finnhub.io/docs/api/market-news |
| 고래(코인) | **Whale Alert: 무료 API 없음**(Alerts $29.95/월, Enterprise $699/월) [2차] https://developer.whale-alert.io/pricing.html . **Arkham**: 가입 시 무료 API 접근 제공 발표 [2차] https://x.com/arkham/status/1907482314759717352 (문서 페이지는 403으로 약관 미확인) | 대안: 공개 노드/익스플로러 + 거래소 주소 라벨로 직접 집계 [추정] |

---

## 7. 데이터 파이프라인 → 온톨로지 → 에이전트

### 7.1 온톨로지 설계
- 참고 표준: **FIBO**(EDM Council, MIT, RDF/OWL) [확인] https://github.com/edmcouncil/fibo — 법인·증권·소유 관계 어휘를 차용하는 용도. OWL/트리플스토어로 그대로 운영하는 건 1인 규모에 과하다 [추정].
- **엔티티**: `Asset`(종목/코인), `Company`, `Person`(임원·내부자), `Institution`(기관·펀드, 13F 제출자), `Wallet`(고래 지갑, 라벨: 거래소/재단/미상), `Filing`(공시), `NewsEvent`, `BuybackEvent`, `InsiderTrade`, `OnchainTransfer`, `Forecast`, `ForecastOutcome`.
- **관계(엣지)**: `Company-ISSUES->Asset`, `Person-OFFICER_OF->Company`, `Person-TRADED(InsiderTrade)->Asset`, `Institution-HOLDS{qty, as_of}->Asset`, `Wallet-TRANSFERRED{amt}->Wallet`, `Wallet-OWNED_BY->Institution`, `Filing-ANNOUNCES->BuybackEvent`, `NewsEvent-MENTIONS{sentiment}->Company`, `Forecast-FOR->Asset`, `ForecastOutcome-RESOLVES->Forecast`.
- **필수 속성**: 모든 엣지에 `valid_from/valid_to`, `available_at`, `source_url`. 이 속성이 에이전트 인용 근거도 되고 백테스트 point-in-time 조인도 된다.

### 7.2 저장소 선택
| 선택 | 라이선스 / 비용 | 판단 |
|---|---|---|
| **Postgres 테이블 + 엣지 테이블 + pgvector** | 무료, 이미 운영 중 | **권장**. 관계는 대부분 1~2홉이라 재귀 CTE로 충분 [추정] |
| Apache AGE (Postgres 확장, Cypher) | Apache-2.0 [2차] https://age.apache.org/ | 3홉 이상 탐색(지갑 추적)이 필요해지면 추가. 관리형 Postgres에서 확장 설치가 막혀 있을 수 있음 |
| Neo4j Community | GPL-3.0 [2차] | 별도 DB 운영 부담. 1인 규모에 과함 |
| Memgraph Community | BSL(비 OSI) [2차] | 비권장 |

### 7.3 에이전트 패턴과 근거
- **TradingAgents**(Apache-2.0) [확인] https://arxiv.org/abs/2412.20138 — 분석가·강세/약세 토론·리스크 역할로 구성. 평가는 **2024-01~03 약 3개월, 대형 기술주 5종**뿐이라 일반화 근거가 약하다.
- **FinMem, FinRobot**(Apache-2.0) — 백테스트가 다중검정·거래비용·비정상성에 취약하다는 비판이 있다 [2차] https://arxiv.org/pdf/2311.13743 , https://arxiv.org/abs/2405.14767
- **StockBench**: 대부분의 LLM 에이전트가 buy-and-hold 미달 [확인, §1.3].
- **GraphRAG**: 금융 QA에서 KG 결합은 환각을 줄이는 방향으로 연구되고 있지만(FinReflectKG-HalluBench) [2차] https://arxiv.org/html/2603.20252v1 , 개인 앱 규모에서 커뮤니티 요약형 GraphRAG의 이득 근거는 약하다 [추정].
- → **권장 패턴: 타입이 정해진 tool-calling**(`get_forecast(asset)`, `get_insider_trades(asset, since)`, `get_buybacks`, `get_news_events`, `get_whale_flows`). 에이전트는 멀티 에이전트 토론이 아니라 **단일 에이전트 + 도구 5~8개**로 시작한다. 도구 결과에 `source_url`을 붙여 인용하게 한다.

### 7.4 오케스트레이션
- Prefect(Apache-2.0, 데코레이터만 붙이면 됨) [확인] https://github.com/PrefectHQ/prefect/blob/main/LICENSE , Dagster(Apache-2.0, 자산 중심, UI 좋음) [2차], Airflow(1인에게 과함) [2차] https://dzone.com/articles/airflow-vs-dagster-vs-prefect-which-scheduler-fits
- **권장: 처음엔 cron + 멱등 스크립트 + `job_runs` 테이블(성공/실패/행수 기록)**. 잡이 10개를 넘거나 재시도·의존 관계가 복잡해지면 Prefect로 옮긴다 [추정].

### 7.5 "가져다 쓰기 vs 직접" 비교
**파이프라인 층**
| 후보 | 라이선스 | 우리 스택 부착 비용 | 판정 |
|---|---|---|---|
| OpenBB ODP | AGPL(상용 라이선스 별도, 퍼미시브 전환 예고) [2차] https://docs.openbb.co/platform/faqs/license | Python 라이브러리로 쓰면 낮음. 네트워크 서비스로 수정·배포하면 AGPL 의무 | **부분 차용**(미국 데이터 커넥터만. 수정 없이 사용) |
| edgartools / OpenDartReader | 오픈소스 | 낮음 | **가져다 쓰기** |
| Prefect / Dagster OSS | Apache-2.0 | 중간 | 나중에 |
| cron + 자체 스크립트 | — | 가장 낮음 | **직접(시작점)** |
> 최종 권장: **수집은 공식 API + 얇은 오픈소스 클라이언트, 스케줄은 cron부터.**

**온톨로지 층**
| 후보 | 라이선스 | 부착 비용 | 판정 |
|---|---|---|---|
| FIBO | MIT | 어휘 참고만 하면 0 | **부분 차용**(명명·관계 정의만) |
| OpenFoundry류(Palantir 대체 OSS) | 저장소마다 다름, 성숙도 불명 [2차] https://github.com/smilebank7/OpenFoundry | 높음(Trino 등 추가 인프라) | 비권장 |
| Neo4j Community | GPL-3.0 | 중간~높음 | 비권장 |
| Postgres 엣지 테이블(+AGE 선택) | 무료 | 낮음. Prisma 스키마에 추가 | **직접** |
> 최종 권장: **Prisma 스키마에 엔티티/엣지 테이블을 point-in-time으로 직접 만든다. FIBO는 이름만 빌린다.**

**에이전트 층**
| 후보 | 라이선스 | 부착 비용 | 판정 |
|---|---|---|---|
| TradingAgents | Apache-2.0 | 높음(자체 데이터 소스·매매 결정 구조라 레포 §6과 충돌) | **부분 차용**(역할 프롬프트·토론 아이디어만) |
| FinRobot | Apache-2.0 | 높음 | 비권장 |
| LangGraph | 프레임워크 MIT, 서버(langgraph-api)는 Elastic 2.0 [2차] | 중간(Python) | 필요해지면 |
| LLM 벤더 SDK tool-calling 직접 | — | 가장 낮음(기존 Node/BFF 안에서 가능) | **직접** |
> 최종 권장: **기존 Node/BFF에서 벤더 SDK tool-calling으로 단일 에이전트를 만든다. 매매 결정형 프레임워크는 가져오지 않는다.**

---

## 8. 한국 법규 (본인 1인 사용 기준, 짧게)

- **투자자문업**(자본시장법 §6⑦): 투자판단에 관한 자문에 응하는 것을 **"영업으로"** 하는 것 [2차] https://casenote.kr/법령/자본시장과_금융투자업에_관한_법률/제6조
- **유사투자자문업**(§101): **대가를 받고** 불특정 다수에게 개별성 없는 조언을 하는 것을 업으로 하는 경우 신고 [2차] https://casenote.kr/법령/자본시장과_금융투자업에_관한_법률/제101조
- **2024-08-14 시행 개정**: 유사투자자문업자의 유료 양방향 채널(오픈채팅·리딩방) 금지, 미실현 수익률 광고 금지 [2차] https://www.etoday.co.kr/news/view/2390211
- **본인만 쓰는 경우**: 타인에게 제공하지 않으므로 영업성·대가 요건이 없어 규제 대상일 가능성은 낮다 [추정, 법률 자문 아님].
- **초대 사용자에게 무료로 제공하는 경우**: 대가가 없으면 유사투자자문업 정의에서 벗어날 여지가 있다. 하지만 개인 보유 현황을 반영한 "이 날 팔아라"는 **개별성 있는 투자판단**에 가깝고, 반복 제공이 영업성으로 해석될 위험이 있다. 확정 해석을 찾지 못했다 → **불확실. 유료화하거나 범위를 넓히기 전에 전문가 확인 필요.**

---

## 9. 결론 — 우리 앱에 권장하는 구조

```
┌──────────── Python 배치 워커 (신규, 일 1회 + 주 1회 재학습) ────────────┐
│ 수집: DART(자사주·내부자) · EDGAR(Form4/8-K) · KIS(수급) · 뉴스 · 온체인  │
│   → Postgres raw_* (available_at 포함)                                   │
│ 피처 → LightGBM 분위수(패널) + 랜덤워크/ETS + Chronos-Bolt 제로샷         │
│   → 앙상블 → MAPIE ACI 보정 → forecast_quantiles / forecast_outcomes       │
│ FinBERT 감성 → news_events.sentiment                                      │
└───────────────────────────────────────────────────────────────────────────┘
              │ (DB 스키마가 계약)
┌──── 온톨로지 = Postgres 엔티티·엣지 테이블(point-in-time, source_url) ────┐
└───────────────────────────────────────────────────────────────────────────┘
              │
┌──── Node 서버 / BFF ─────────────────────────────────────────────────────┐
│ 금액 계산(보유수량 × 분위수 → 손익 범위)은 서버가 한다                        │
│ 에이전트: LLM tool-calling(get_forecast/get_insider/get_buyback/…)         │
│   → 문장만 생성. 출력 숫자 ⊆ 입력 숫자 검사, 금지어 필터                      │
└───────────────────────────────────────────────────────────────────────────┘
```

**역할 분담**
| 층 | 하는 일 | 하지 않는 일 |
|---|---|---|
| 예측 모델(숫자) | 수익률 **분포**와 보정된 구간, 과거 적중률 | 점 목표가 |
| 온톨로지(사실) | 누가 언제 무엇을 샀나/공시했나(출처 포함) | 해석 |
| 에이전트(설명·탐색) | 사실·숫자를 골라 근거 있는 문장으로 설명 | 숫자 생성, 매매 지시 |

**모델 배치**
- 숫자: LightGBM 분위수 회귀(주) + statsforecast 베이스라인 + Chronos-Bolt small(보조). 전부 CPU.
- 텍스트 신호: FinBERT(영문) / 한국어는 LLM 분류(공개 헤드라인만).
- 문장: Gemini Flash 무료 유지(공개 정보만 입력). 보유·손익이 들어가는 문장은 학습에 쓰이지 않는 저가 유료(DeepSeek 등)로 분리하거나, 문장에는 금액을 빼고 금액은 UI가 서버 값을 표시한다.

**표현 원칙 ("예측"이라 부르지 않는다)**
- ❌ "다음 주 +4.2% 예상", "10/7에 팔면 12만 원 이익", "상승 확률 높음"
- ✅ "**과거 비슷한 조건**(최근 20일 수익률·수급·공시가 비슷했던 구간)에서 **4주 뒤 수익률은 10명 중 8명이 −6% ~ +7% 사이**였습니다. 이 범위는 지난 52주 동안 **실제로 78%** 맞았습니다(목표 80%). 틀린 사례: 3/14 실적 발표 주 −11%."
- 보유 금액 환산은 **서버가 계산한 범위**로만 표시한다: "현재 보유 기준 −42만 ~ +49만 원 범위(과거 분포 기준)".
- 모든 화면에 **근거(기여 요인 3개) · 과거 적중률(베이스레이트 병기) · 실패 사례** 3종을 붙인다. 하나라도 없으면 렌더하지 않는다(레포 §6-1).
- 명칭: "예측" 대신 **"과거 분포 기반 범위"**, "시나리오 범위".

**단계**
1. (2주) point-in-time 원천 테이블 + 베이스라인(랜덤워크·ETS 변동성 구간) + conformal → 이것만으로 "범위 + 적중률" UI가 가능하다.
2. (2~4주) LightGBM 분위수 + 공시·내부자·수급 피처 → 베이스라인 대비 pinball/CRPS skill이 양수일 때만 교체.
3. (이후) 뉴스 감성 · 온체인 · Chronos 앙상블 → 각 추가마다 워크포워드 skill로 채택 여부 결정.
4. 라이브 기록 52주가 쌓이기 전까지는 **백테스트 적중률을 "참고용"으로만 표시**한다.
