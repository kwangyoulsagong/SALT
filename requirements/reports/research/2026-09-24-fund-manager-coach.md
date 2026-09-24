# "1인 펀드매니저" AI 코치 — 돈을 버는 사람은 무엇을 하고, 그걸 기능으로 어떻게 만드나 (딥리서치)

- 작성일: 2026-09-24 · 코드 기준 `8e1462a`
- 질문: 지금의 AI 코치 · AI 해설 · 변동 범위 · 주요 사건으로는 부족하다. **실제로 돈을 잘 벌게(잃지 않게) 돕는** 펀드매니저 같은 AI가 되려면 무엇이 더 필요한가.
- 방법: 코드 인벤토리 1건 + 웹 리서치 4건(학술 · 규제기관 · 운용사 공개자료 · 제품 조사, 출처 130건+). 표기 **[강]** 대규모 계좌 데이터 · 복수 재현 / **[중]** 단일 시장 · 실험실 · 업계 리서치 / **[약]** 실무자 진술 · 사례.
- 같은 날 Codex Astra 조사 3건과의 관계: `requirements/reports/feature-audits/2026-09-24-ai-investment-deep-research.md`(코드 진단 C01~C12) ·
  `2026-09-24-external-investment-research.md`(외부 조사 — 논문 철회 · 기대 변화 · PIT 라벨 · 제품 8종) ·
  `requirements/specs/in-progress/ai-investment-workbench-design.md`(워크벤치 W01~W06)는 **신뢰성 · 리서치 · 위험 계산**을 다룬다.
  이 문서는 그 위에 **"사용자 행동을 바꾸는 층"과 "코인 신호의 근거 · 우선순위"와 "규제 선"** 을 더한다. 겹치는 항목은 그쪽 ID 를 인용한다.
- 이전 리서치(`2026-09-23-ai-forecast.md` 등 5건)가 이미 정한 것은 반복하지 않는다: LLM 은 숫자 예측기가 아니다 · 현실 방향 적중률 50~55% · 템플릿 해설 · 카탈리스트는 발표 당일에 반영된다.

---

## 0. 한 페이지 요약

1. **"정확하고 완벽한 예측"은 존재하지 않는다 — 학계 · 운용사 · 규제기관이 한목소리다.** 2026 종합 서베이: ML · 시계열 · LLM · 에이전트 어느 것도 "지속적 · 국면 횡단 · 용량 고려 순알파"의 공개 증거가 없다. LLM 뉴스 전략의 샤프는 2년 만에 6.5 → 1.2 로 붕괴했고, LLM 에이전트 백테스트는 입력을 뒤집어도 답의 82% 가 그대로였다(기억 재생). 가격에서 예측되는 것은 **방향이 아니라 변동성 · 구간**이다. 그래서 SALT 의 지금 방향(확률 · 구간 · 채점 · 기준 대비 · 빗나간 사례)은 옳다.
2. **돈을 잃는 원인은 종목 선택이 아니라 행동이다 — 그리고 이 증거는 압도적으로 강하다.** 회전율(많이 거래한 분위 −6.5%p/년), 처분효과(이익은 팔고 손실은 쥔다, 1.5배), 주목 매수(급등 순위 종목 20일 −4.7%), 복권형 선호(−2~3%p/년), 레버리지(F&O 93% · CFD 74~89% 손실). 한국도 같다: 2020년 신규 개인 60% 손실 · 회전율 시장의 5배. 코인은 더 심하다(BTC 보유자 73~81% 손실 추정, 대형 보유자가 팔 때 개인이 샀다).
3. **버는 쪽의 공통점은 예측력이 아니라 손실 크기 통제 · 사이징 · 사전 약속 · 기록이다.** 재량 투자자("맞고 틀리는 게 아니라 맞을 때 얼마 · 틀릴 때 얼마") 와 시스템 운용자(변동성 타깃팅 Sharpe +0.4, 추세 필터가 MDD −80% 를 −30~50% 로) 가 같은 곳을 가리킨다. 행동 코칭 하나가 연 100~200bp 라는 자문업계 25년 계량도 있다.
4. **효과가 인과로 확인된 개입은 "정보"가 아니라 "마찰과 사전 약속"이다.** 레버리지 상한(손실 −40%), 스탑로스 사전 주문(처분효과 유의 감소 — **알림만 주는 조건은 효과 0**), 매입가 표시 제거(처분효과 −25%). 한국 시장경보는 지정 후 68% 하락에도 개인이 순매수한다 — 경고만 있고 마찰이 없기 때문이다.
5. **LLM 에게 종목 · 비중 · 타이밍을 묻는 기능은 만들면 안 된다.** 2025 연구에서 주요 챗봇 셋 모두 추세 추종 · 집중을 **강화**했다. LLM 의 자리는 읽기 · 요약 · 분류 · 문장이다(현재 원칙 그대로).
6. **크립토 신호 중 살아남는 것은 적고, 대부분 "방향"이 아니라 "리스크 · 국면" 용도다.** 변동성(GARCH/HAR) [강], 추세 필터 [강], 변동성 타깃팅 [강], 현물 ETF 순유입 1~5일 [중~강], 김치 프리미엄 0 교차 [중], 펀딩 · OI 극단 [중, 리스크 경고], MVRV Z · NUPL 사이클 라벨 [중, 표본 3~4개]. 온체인 유료 소스는 지금 사지 않는다.
7. **규제 선(한국)은 "개별성"이다.** 2024-08 개정 자본시장법: 1:1 개별 상담 · 단정적 판단 · 유료 양방향 채널이 유사투자자문의 금지선, 무등록 투자자문은 형사처벌. 현재 SALT(무료 · 소유자 전용 · 확률 · 구간 · 명령형 0건) 는 선 안쪽이지만, **"보유 중인 A 를 지금 팔면"** 식 개인화 문장은 서버 템플릿으로만 만들고 LLM 프롬프트에 개인 보유를 넣지 않는 것이 안전하다. 디지털자산기본법 2단계(2026-11 소위) 가 코인 평가 · 자문업을 인가제로 묶을 수 있어 **코인 전망 카드는 플래그로 격리**해 둔다.
8. **결론 — 다음에 만들 것은 "더 잘 맞히는 AI"가 아니라 "계획을 쓰게 하고, 계획 대비 실행을 채점하고, 계획이 깨질 때만 말하는 코치"다.** 그것이 펀드매니저가 실제로 하는 일(리스크 예산 → 사이징 → 규칙 → 복기)이고, 증거가 가장 강하고, 새 데이터가 거의 필요 없고, 규제 선 안쪽이다. §7 에 기능 20개와 슬라이스 순서를 적었다.

---

## 1. 지금 SALT 는 어디까지 왔나 (코드 기준)

### 1-1. 있는 것

| 층 | 구현 | 위치 |
|---|---|---|
| 판단 엔진 | buy · sell · hold · rebalance 후보를 수작업 가중치(RSI · MA20 · 공포탐욕 · 키워드 뉴스 · 대량 체결 · 국면 · 비중 · 행동 페널티)로 점수화. 단타/장기 모드 판정 | `salt-server/src/coach/domain/policy/score.ts` · `modeDecision.ts` |
| 국면 | BTC RSI + 공포탐욕 5단계(panic · bearish · sideways · bullish · euphoric) | `marketRegime.ts` |
| 성적표 | 최근 100건 추천의 진입 대비 **최신** 종가 수익(고정 기간 없음) · 판단 채점(단타 24h · 장기 30d, 표본 20 게이트, 적중 3 · 빗나감 3) | `GetSignalPerformance.ts` · `symbolJudgment.ts` |
| 매도 계획 | 평단 ×0.92 손절 · ×1.12 / ×1.25 익절, 25/25/50 | `profitPlan.ts` |
| 주문 전 계산 | 손익비(최소 1.5) · 최대 손실 · 진입 후 비중. 실행 없음 | `preflight.ts` |
| 행동 코치 | 과매매(24h 12건) · 패닉 매도(−3% 이내 24h) · 추격(고점 98% 이상 48h) | `behavior.ts` |
| 변동 범위 | RW 정규 + 경험 분위수 앙상블 → normalized-CQR 보정. 1~4주. 90% 커버리지 90.0~90.7%. **BTC 는 1 · 2주 범위만 켜짐**, 방향 · 기대손익은 기준을 못 이겨 꺼짐 | `salt-forecast` `models/engine.py` · `domain/scoring.py` |
| 도전자 | LightGBM(가격 · 횡단면 · 펀딩 · 김치 프리미엄 · FRED 거시 · 스테이블 공급 · GK 변동성) v0.6, 챔피언과 동률 → 승격 없음, 26주 뒤 재평가 | `registry.py` |
| 해설 | 3종 게이트 → 템플릿 초안 스트림 → Gemini 다듬기 → 문장 검증(확신어 · 명령형 · 목표가 · 미검증 숫자) → 교체 | `ExplainCoachDecision.ts` · `languageGuard.ts` |
| 주요 사건 | FOMC · CPI · 고용 일정(FRED · Fed) → BTC 반응 분포(+1/+5/+20일) · 평소 대비 배율 1.25~1.48(당일) | `domain/events.py` |
| 데이터 | 업비트 시세 · 체결(≥5천만 원 = "고래") · 공포탐욕 · RSS 5종(키워드 감성, 8종목만) · Binance 펀딩 · OI(30일) · FRED · 김치 프리미엄 · 스테이블 공급 | 각 `ingest/*` |

### 1-2. 없는 것 (검색으로 확인)

| 항목 | 상태 | 비고 |
|---|---|---|
| 포지션 사이징(켈리 · 변동성 타깃) | **없음** | preflight 는 비중 상한만 본다 |
| 포트폴리오 위험(변동성 · 상관 · CVaR · 낙폭 예산) | **없음** | 유일한 "낙폭"은 종목별 미실현 −15% 알림과 표본 최악 수익률(C04 오명) |
| 거래 일지 · 결정 로그 · 사후 복기 | **없음** | 행동 코치가 가장 가깝지만 사용자가 쓰는 기록이 아니다 |
| 계획 우선(진입 전 손절 · 근거 필수) · 준수율 | **없음** | |
| 사용자 목표 · 리스크 예산 입력 | **부분** | `riskTolerance` · `maxSingleAssetWeight` 저장만, 점수는 비중 상한만 읽음 |
| 알림(가격 · 지표 · 사건 · 논지) | **부분** | 인앱 알림 + 10분 크론 위험 · 고래 인사이트. 가격 알림 · 푸시 · 논지 알림 없음. `SentimentAlert` 모델은 쓰는 곳 없음 |
| 시나리오 · 스트레스("−30% 면 원화로") | **부분** | 예측 q05/q50/q95 에서 보유 손익만. 사용자 지정 충격 없음 |
| 피드백 학습 | **없음** | `/api/ai-coach/feedback` 은 저장 후 성적표에서 제외만 |
| 온체인 · 파생 지표의 화면 노출 | **없음** | 펀딩 · OI 는 도전자 피처로만 |
| 벤치마크 대비("그냥 들고 있었으면") | **없음** | |
| 회전율 · 비용 미터 | **없음** | |

**한 줄 진단**: SALT 는 "시장이 어떻게 될까"에는 정직한 답(변동 범위 + 채점)을 갖췄고, **"내가 어떻게 행동하고 있나"와 "얼마를 걸어야 하나"** 에는 아직 아무 답이 없다. 증거가 말하는 손익의 원인은 후자에 있다.

---

## 2. 잃는 사람 · 버는 사람 — 증거

### 2-1. 개인투자자가 잃는 다섯 가지 메커니즘

| # | 증거 | 강도 | 출처 |
|---|---|---|---|
| L1 | **과잉거래**: 66,465가구, 최다 거래 분위 연 11.4% vs 시장 17.9%. 대만 전체 시장에서 개인 손실 = GDP 2.2%, 대부분 **공격적 주문**(시장가 · 추격) | 강 | Barber & Odean 2000 · 2009 |
| L2 | **처분효과**: 이익 실현 비율이 손실 실현의 1.5배. 비용 · 세금 · 사후 성과로 정당화 안 됨 | 강 | Odean 1998 |
| L3 | **주목 매수**: 뉴스 · 거래량 급증 · 급등 순위 종목을 개인이 순매수. 리테일 집단 매수 상위 종목 20일 −4.7% | 강 | Barber & Odean 2008 · Barber 외 2022 |
| L4 | **복권형 선호**: 저가 · 고변동 · 고왜도 과대보유 → 연 −2~3%p | 강 | Kumar 2009 |
| L5 | **레버리지**: 인도 F&O 개인 93% 손실 · 75% 가 다음 해도 계속. CFD 74~89% 손실 | 강 | SEBI 2024 · ESMA 2018 |
| L6 | **"하다 보면 배운다"는 없다**: 브라질 데이트레이더 300일 지속자 97% 손실. 대만 지속 수익 데이트레이더 1% 미만 | 강 | Chague 외 2020 · Barber 외 2014 |
| L7 | **한국**: 2020.3~10 신규 개인 204,004명 → **60% 손실**, 시장 대비 −2.0%p, 일 회전율 6.8%(시장 1.4%), 3종목 이하 보유 73% | 강 | 자본시장연구원 2021 |
| L8 | **한국 시장경보**: 2022~2026.8 지정 1,548건 중 20일 뒤 하락 68%, 25% 는 −30% 이상. 그래도 개인 순매수 | 중 | 언론 집계 2026 |
| L9 | **코인**: 95개국 앱 데이터 — 가격이 오르면 신규 가입(인과 확인), BTC 보유자 73~81% 손실 추정, 2022 붕괴 때 대형 보유자 매도 · 소액 개인 매수. 같은 사람이 주식은 역추세 · 코인은 추세추종 매매 | 강 · 중 | BIS WP 1049 2022 · Bulletin 69 2023 · Kogan 외 2023 |

다섯 메커니즘은 서로 증폭한다 — 레버리지가 처분효과를 키우고, 주목 매수는 복권형 종목으로 몰린다. **SALT 의 현재 행동 코치 3규칙(과매매 · 패닉 · 추격)은 L1 · L2 · L3 의 일부를 이미 겨눈다.** 단 알림만 준다(§2-3 참조 — 알림만으로는 효과 0).

### 2-2. 무엇이 통하나

| # | 증거 | 강도 | 주의 |
|---|---|---|---|
| W1 | **시계열 모멘텀 · 추세추종**: 137년 · 67시장, 매 10년 양(+), 비용 후 Sharpe ≈0.4, 60/40 최대 낙폭 10회 중 8회 양(+). 크립토 재현(2011~19) Sharpe 1.1~1.35, **인트라데이는 수익 없음** | 강 | 횡보 톱니 손실, 변동성 급등 시 폭락(momentum crash) |
| W2 | **변동성 타깃팅**: 변동성 높을 때 노출 축소 → Sharpe 1.44 → 1.74. 크립토 라우팅: MDD 51.7% → 39.4%, Sharpe ~+0.4 | 강 | 비용 미반영 논쟁 |
| W3 | **저변동 · 리밸런싱**: BAB Sharpe 0.78. 리밸런싱은 수익보다 **위험 통제** 도구(변동성 14.4 → 12.1) | 강 · 중 | |
| W4 | **분수 켈리**: 풀 켈리는 성장 최대지만 단기 파산 위험. 엣지 추정 오차 때문에 실전은 1/4~1/2 | 강(수학) · 중(실전) | |
| W5 | **파산 회피 · 비에르고딕성**: 큰 손실 한 번이 복리를 파괴("변동성 세금") | 중 | |
| W6 | **팩터 붕괴**: 발표 후 58% 감소. 공개된 엣지는 줄어든다 | 강 | LLM 뉴스 전략 샤프 붕괴(§4)와 같은 현상 |
| W7 | **재량 투자자 공통 프로세스**: 위험 예산 먼저 → 엣지 있는 곳만 크게 → 없으면 안 한다 → 결정과 결과 분리 기록 → 실수를 규칙으로. 체크리스트(97문항) · 프리모템(원인 식별 +30%) | 약(진술) · 중(실험) | L1~L5 의 정확한 반대편 |
| W8 | **보정 · 채점**: 전문가 예측은 우연을 간신히 상회, 가장 확신한 전문가가 가장 부정확. 슈퍼포캐스터는 보정 · 갱신 · Brier 채점으로 50%+ 개선. **점 예측은 채점이 불가능하다** | 강 | `ADR-003` 의 근거 |
| W9 | **행동 코칭의 가치**: 자문업계 25년 계량 — 행동 코칭(패닉 매도 · 추격 차단) 연 100~200bp, 리밸런싱 14bp | 중 | |

### 2-3. 효과가 확인된 개입 — "정보"가 아니라 "마찰과 사전 약속"

| 개입 | 결과 | 강도 |
|---|---|---|
| 레버리지 상한(미국 FX 50:1) | 거래량 −23%, 고레버리지 손실 −40%. 기제: 처분효과 감소 | 강 |
| CFD 규제(ESMA 2018) | 3개월 손실 £77m 감소. **단, 손실 계좌 비율은 불변** — 크기만 줄인다 | 중 |
| **스탑로스 · 익절 사전 주문** | 처분효과 유의 감소. **알림만 주는 조건은 효과 없음** → 리마인더가 아니라 사전 커밋 | 중(실험) |
| **매입가 표시 제거** | 처분효과 −25% | 중(실험) |
| 처분효과 **정보 피드백**(본인 데이터 "익절 N일 · 손절 M일") | 2주 후에도 감소 유지 | 중(실험, n=132) |
| 목표 기반 프레이밍 · 미래 지향 매도 질문("이 자산이 앞으로 최악인가") | 처분효과 역전 | 중(실험) |
| 앱의 급등 순위 표시 | 집단 매수 → 음의 수익. **표시 방식이 행동을 만든다** | 강 |
| 한국 시장경보(알림만) | 68% 하락에도 순매수 | 중 |
| 조언 제공 | 무작위 제공 8,000명 중 **5% 만 열람**, 그들도 거의 안 따름. AI 조언 실험의 개선폭은 조언 품질이 아니라 **수용률** 차이 | 강 |

**시사점**: SALT 는 주문 경로가 없으므로 "차단"은 못 한다. 대신 (a) **진입 전에 청산 규칙을 쓰지 않으면 계획을 저장할 수 없게**(사전 커밋), (b) **약속 위반을 카운트 · 금액화**(마찰), (c) **매입가 없는 뷰 · 벤치마크 대비 · 실수 비용**(프레이밍) 을 만든다. 그리고 1차 지표는 PnL 이 아니라 **"따랐는가"** 다.

---

## 3. 크립토 신호 — 근거 · 지평 · 실패 모드 · 데이터

2026 서베이 결론: "1~6개월 지평에서 여러 국면을 관통해 우월한 예측 변수 범주는 없다." 12개 예측 지수 중 실시간 초과수익 2개, 고변동 구간만. 그럼에도 **용도를 "방향"에서 "리스크 · 국면 · 이벤트"로 바꾸면** 쓸 수 있는 것이 남는다.

| 신호 | 측정 | 강도 | 지평 | 용도 | 실패 모드 | 데이터 · 비용 · 라이선스 |
|---|---|---|---|---|---|---|
| **실현 변동성(GARCH · HAR-RV)** | 변동성 군집 | **강** | 일~주 | 노출 크기 · 구간 폭 | 점프(청산 캐스케이드) 못 잡음 | 가격만 · 무료 |
| **200DMA · 20주 MA 추세 필터** | 추세 상태 | **강** | 주~월 | 국면 라벨 · 낙폭 절단 | 횡보 톱니 | 가격만 · 무료 |
| **변동성 타깃 비중** | 목표 변동성 대비 노출 | **강** | — | 사이징 | 비용 | 가격만. BTC 연 40~55% → 목표 10~15% 면 비중 20~35% |
| **현물 ETF 일일 · 5일 누적 순유입** | 기관 수요 | **중~강** | 1~5일 | 단기 방향 확률 입력 | AP 시차, 성과 추종 방향 강함 | 발행사 공시(무료 · 수작업 크롤러). 집계 사이트는 약관 부재 → 참고만 |
| **김치 프리미엄 0 교차** | 국내 심리 전환 | **중** | 주~월 | 이벤트 | 레벨은 무의미(상관 −0.06), 환율 · 규제 노이즈 | 업비트 + Binance + FRED DEXKOUS · 무료. **이미 수집 중** |
| **펀딩비 · OI/시총 z-score 극단** | 레버리지 편향 | **중** | 시간~수일 | 과열 · 청산 위험 배지 | 추세 중 양의 펀딩 몇 달 지속 → 역추세 손실. **레벨 아닌 극단만** | Binance 공개 · 무료. **이미 수집 중**(OI 30일 이력 — 늦을수록 영구 손실) |
| **MVRV Z · NUPL** | 사이클 고 · 저평가 | **중** | 사이클 | 국면 라벨 + 빗나간 사례 | 표본 3~4 사이클, 2025 정점이 임계 미도달(이미 실패 1건). **둘은 같은 정보원 — 하나만** | Coin Metrics Community(무료 · **비상업 CC**) |
| **2상태 HMM 변동성 국면** | 저 · 고변동 | 중 | 일~주 | 추세 필터와 불일치 시 "불확실" | 라벨 스위칭 · 3상태 이상 과적합 | 가격만 |
| **옵션 IV(DVOL) · 스큐 · VRP** | 변동성 기대 | 중(변동성) · 약(방향) | 주 | 변동성 국면 보조 | **방향 신호로 쓰면 실패** | Deribit 공개 · 무료 |
| CFTC COT 자산운용사 순포지션 | 기관 흐름 | 약~중 | 주 | 참고 | 레버리지 펀드는 차익 포지션 → 제외 | 무료 · 퍼블릭 도메인 |
| M2 YoY · 실질금리 · DXY | 거시 동행 | 중(동행) · 약(선행) | 분기 | 맥락 설명 | 레벨 상관 0.9 는 스퓨리어스. **선행 주장은 문서에 쓰지 않는다** | FRED · 무료. **이미 수집 중** |
| 거래소 순유입 · SSR · 마이너 유출 · 청산 맵 | — | 약 | — | — | ETF 커스터디 · 내부 이동 오독, 사후 지표 | 유료($29~109/월) → **보류** |
| 요일 · 주말 효과 | — | 약(수익) · 중(변동성) | — | 주말 급변 리스크 안내만 | 수익 차이 없음(2014~24) | 가격만 |
| 4년 반감기 사이클 | — | 약(예측) | — | 쓰지 않는다 | 반감기 → 정점 7000% → 2900% → 541% → **100%**. 표본 4 | — |

**우선순위(근거 × 저비용)**: ① 실현 변동성 + 변동성 타깃 비중 → ② 추세 국면 라벨 → ③ 김치 프리미엄 0 교차 이벤트 → ④ ETF 순유입 → ⑤ 펀딩 · OI 극단 배지 → ⑥ MVRV Z 사이클 라벨(하나만) → ⑦ HMM → ⑧ DVOL. ①②③⑤⑦ 은 **이미 있는 데이터**로 된다.

**라이선스**: 상업 서비스가 되는 시점에 완전히 안전한 것은 가격 · 거래소 공개 API · 정부 데이터(①②③⑤⑨⑩)만. Coin Metrics 는 비상업, 온체인 유료는 재배포 금지. 유료를 하나 사야 한다면 거래소 플로우까지 덮는 것 하나만.

**시스템 운용자의 현실 수치**: BTC 단일 추세추종 Sharpe 0.8~1.3 · MDD −30~−50%(B&H −77~−84%). 최적 코인 수 10~15개. Sharpe 2 이상 주장은 대부분 36개월 미만 · 미심사. 60/40 에 BTC 는 ~5% 비중까지 Sharpe 상승 후 정체.

---

## 4. AI · LLM 의 현실 (2024~2026)

| 주장 | 근거 | 강도 |
|---|---|---|
| LLM 뉴스 → 방향 전략은 **붕괴했다**: 샤프 6.54(2021Q4) → 3.68 → 2.33 → 1.22(2024). 저자 스스로 "채택 증가 → 효율화". 강한 쪽은 공매도 다리 — 개인은 재현 불가 | Lopez-Lira & Tang 개정판 | 강 |
| LLM 에이전트(FinMem · TradingAgents 등) 백테스트는 **기억 재생**: 입력을 뒤집어도 예측 82% 불변. 컷오프 이후 수익 증발. 20년 · 100종목으로 넓히면 우위 소멸 — 상승장 과보수 · 하락장 과공격 | Profit Mirage 2025 · FINSABER 2025 | 강 |
| 금융 특화 LLM 도 **가격 방향 45~53%** = 동전. 잘하는 것은 감성 분류(F1 87~95) · 요약 | FinGPT · FinBen | 강 |
| 시계열 파운데이션 모델 제로샷: 랜덤워크 대비 "작고 산발적", DM 검정 유의 25개 중 2개 | 2026 | 강 |
| **변동성은 예측된다**: HAR-RV 가 GARCH · ARFIMA 를 안정적으로 이김, 변동성 방향 73%. 분포의 중심은 못 맞히고 폭은 맞힌다 | 2021 · 2024 | 강 |
| **LLM 조언은 편향을 강화한다**: 주요 챗봇 3종 모두 미국 93% · 기술주 · 최다 거래 종목 28%(벤치마크 9%) 추천. 투자자 프로필이 달라도 비슷한 답("heuristic collapse") | PLOS One 2025 · arXiv 2026 | 강 |
| **운용사가 실제로 쓰는 곳**: 헤지펀드 95% 가 GenAI, 1위 용도 뉴스 · 어닝콜 텍스트. GenAI 채택 펀드 +2~4%/년은 "인재 + 기업 특이 정보 처리"에서 나옴 — 소비자 앱이 복제할 성질이 아니다. 대형 자산운용사의 AI 도구 패턴은 **숫자는 리스크 엔진 · 문장은 LLM · 대상은 전문가**. 어느 대형사도 "AI 가 다음 주 가격을 예측"이라 하지 않는다 — SEC 가 잡는 문구 | 2025 | 중 |

**SALT 에 대한 판정**: `ADR-003` · `ADR-004` · 템플릿 해설 · 검증기는 학계 결론과 일치한다. 남은 구멍은 (a) 검증 방법론 — 워크포워드 단독 · IID 부트스트랩(C10) 대신 **CPCV · 시간 블록 부트스트랩 · Deflated Sharpe · PBO**, (b) 컷오프 이후 구간만 유효 평가로 인정, (c) 반사실 교란 테스트(뉴스 부호 반전 → 출력이 바뀌는가) 를 회귀 테스트에 포함.

---

## 5. 규제 선 — 미국 · EU · 한국

| 지역 | 선 | SALT 판정 |
|---|---|---|
| 미국 | **AI-washing 집행**(2024~25 5건, "최초의 AI 어드바이저" · "AI 자동매매" 허위 문구). Predictive Analytics 규칙은 2025-06 철회 → 기존 반사기 · 마케팅 규칙 적용 | 성능 문구는 항상 "기간 · 표본 · 기준 대비 · 빗나간 사례" 4요소 세트로만 |
| EU | AI 사용이 MiFID II 적합성 의무를 줄이지 않음. 투자 추천은 고위험 목록 아님. **재무 상황 점수화**가 들어가면 고위험 가능 | 위험 성향 점수 · 신용 평가 기능은 만들지 않는다 |
| **한국** | 2024-08-14 개정 자본시장법: 유사투자자문업(신고제) 은 **단방향 · 불특정 다수 · 개별성 없는** 조언만. 금지: 유료 양방향 채널 · **1:1 개별 상담** · 손실보전 · 허위 · 미실현 수익률 · **단정적 판단**. 무등록 투자자문 = 3년 이하 징역 · 1억 이하 벌금. 2025 일제검사 49사 중 35사 적발 | 무료 · 소유자 전용 · 양방향 유료 없음 · 확률 · 구간 · 명령형 0건 → 선 안쪽. **개인 보유 · 평단은 LLM 프롬프트에 넣지 않고 서버 템플릿으로만**(FR-46 확장) |
| 한국 · 코인 | 가상자산이용자보호법(2024-07) 은 자문 · 평가 규정 **공백**. 디지털자산기본법 2단계(2026-11 소위) 가 코인 평가 · 자문업을 자본시장 수준 인가제로 묶는 방향 유력 | 코인 전망 카드를 **기능 플래그로 격리**, 2026-11 결과를 REQ 추적 항목으로 |
| 한국 · 세금 | 2027-01-01 이후 가상자산 양도소득 기타소득 과세: 연 250만 원 공제 · 22%. 12월 정기국회가 최종 | 2026-12-31 까지 **취득가액 기록** 확보가 사용자 이익 — 일지 기능의 부수 효과 |

**위험을 낮추는 포맷 7개**: 개별성 제거(시장 · 종목 단위 일반 정보) · 단정 금지(확률 · 구간) · 매매 지시 0건 · 무료 + 소유자 전용 + 양방향 유료 없음 · 3종 고지 상시(정보 제공 목적 · 개별 상담 불가 · 원금손실 가능) · AI 성능 과장 금지 · 재무 점수화 배제. 이 중 **3종 고지 고정 슬롯**과 **개인 보유 프롬프트 배제**가 지금 없다.

---

## 6. 앱 · 코파일럿 벤치마크 — 무엇이 실제로 돕나

제품 이름은 규칙(참고 서비스 이름 0건)에 따라 쓰지 않는다. 범주와 기능만 적는다.

| 범주 | 측정 가능한 효과가 있는 기능 | 난이도(SALT 스택) |
|---|---|---|
| **행동 가드레일** | 계획 우선(손절 · 목표 · 사이즈 · 근거 없이 저장 불가) · 복수매매 · 물타기 · 사이즈 급증 감지(손실 직후 빠른 재진입 · 가속 빈도 · 손절 밀어내기 · 평단 낮추기) · 연승 · 연패 알림 · 냉각 약속 · 세션 전 체크인 · 세션을 P&L 아닌 과정으로 채점 · 매도 전 미래 지향 질문 | 하~중(업비트 체결 폴링 이미 있음) |
| **트레이딩 저널** | 셋업 · 실수 태그 → 태그별 기대값 · R-multiple(진입 시 손절가 필수) · **실수 비용 회계(원화)** · **규칙 준수율 + 준수/위반 거래 성과 비교** · 시간대 · 요일 기대값 · 감정 점수를 자산 곡선에 겹침 · 주간 리캡 | 하~중 |
| **포트폴리오 분석** | 집중도 경고 · **벤치마크 대비(그냥 들고 있었으면)** · MDD · CVaR(팻테일) · "−30% 면 원화로 얼마" · 목표 도달 확률 · 현금 비중 드리프트 · 매도 전 세금 미리보기 | 하~중(가격 이력 있음) |
| **AI 코파일럿** | 포트폴리오 인지 Q&A(리스크 프로필 충돌 시 **반박**) · 출처 칩 없는 주장은 렌더 안 함 · **논지 감시**(보유 이유 항목 vs 매일 뉴스 지지/반박/무관, 조용한 날도 "변화 없음") · 반대 논거 생성 | 중(W01 · W05 와 겹침) |
| **국내 증권사 AI(2025)** | 뉴스 · 공시 분류 → 번역 → "왜 움직였나" 요약(수치 검증 단계 포함) · 어닝콜 번역 · **잔고 · 매매 패턴 진단** · 차트 이미지 분석. **공통: 요약 · 진단 · 설명, 매매 지시 · 목표가 없음** | — |
| **예측 UX** | 팬 차트(50/80/95 중첩) · 사용자별 보정 곡선 · Brier · "틀린 사례" 사후 해설 · 예측을 미리 써두는 결정 저널(관리자 예측 정확도 +19%) | 중(이미 부분 구현) |
| **1인 펀드매니저** | **개인 IPS**(1~2쪽: 목표 · 위험허용 · 제약 · 리밸런싱 규칙 · 리뷰 주기) 를 대화로 초안 → 편집 → 서명 → 모든 가드레일의 기준 문서 · 리스크 예산(월 낙폭 · 1회 R · 일일 한도) · 결정 로그(예상 · 이유 · 감정 · 리뷰 날짜) · 월간 리뷰 리포트 | 하~중 |

**하지 말 것(근거 있음)**: LLM 에게 종목 · 비중 · 매매 시점을 묻는 기능(§4 편향 강화) · 자동매매 · 시그널(국내 주변 앱 — 포지셔닝 반대) · 공포탐욕 · 펀딩비를 **예측 근거**로 쓰기(맥락 지표만) · 급등 순위 표시(L3 를 만든다).

---

## 7. 갭 → 기능 — "1인 펀드매니저 코치" 제안

> **2026-09-24 후속**: 이 절은 `pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md` 로 내려갔다. 그때 반영한 제약 둘 — ① **계좌 연동 없음 · 전부 수동 입력**(사용자), ② **서약 카드 · 쿨다운 · 통제 · 차단 메커니즘 제외**(2026-09-08 결정). 그래서 아래 A4 "24시간 안내 + 약속" · A6 "실시간 감지" · 냉각 타이머는 기획서에서 **측정 · 미러**로 바뀌었다.

원칙: 숫자는 서버 · 문장은 LLM · 주문 경로 없음 · 명령형 0건 · 소유자 전용 유지. **새 데이터가 거의 필요 없다** — 대부분 이미 있는 업비트 체결 · 가격 이력 · 예측 서비스 위에 얹는다.

### 7-1. 층 A — 손실 크기 통제 (증거 최강 · 인과 확인)

| # | 기능 | 근거 | 재사용 | 새 데이터 | 난이도 |
|---|---|---|---|---|---|
| A1 | **개인 IPS + 리스크 예산** — 목표 · 기간 · 월 최대 낙폭 · 1회 최대 R · 일일 손실 한도 · 최대 비중 · 리뷰 주기. LLM 이 대화로 초안, 사용자가 편집 · 서명. 이후 A2~A6 · B 의 기준 문서 | W7 · W9 · 처분효과 역전(목표 프레이밍) | `riskTolerance` · `maxSingleAssetWeight` 확장 | 없음 | 하 |
| A2 | **포지션 사이즈 계산기** — 진입가 · 손절가 · (선택) 승률 · 손익비 입력 → 서버가 (a) 리스크 예산 기준 수량 상한 = min(손실 예산 ÷ (진입−손절+비용 · 갭), 비중 한도, 현금), (b) 1/4 · 1/2 켈리, (c) 변동성 타깃 비중(BTC 실현 변동성 → 목표 변동성), (d) "이 크기면 N연패 시 −X%". 풀 켈리는 표시만, 기본 1/4. 엣지 추정 오차 경고 | W2 · W4 · W5 · W7 | `preflight.ts` 확장 · W03 한도식 | 없음(실현 변동성은 가격에서) | 중 |
| A3 | **계획 우선 진입** — 손절 · 목표 · 사이즈 · 근거 · 무효화 조건 · 리뷰 날짜 없이 "계획"을 저장할 수 없다. 주문은 사용자가 거래소에서. 계획은 `DecisionSnapshot`(W06) 이 된다 | 사전 커밋 실험(알림만 = 효과 0) | W06 스키마 | 없음 | 하 |
| A4 | **낙폭 예산 게이지** — 월 · 분기 허용 손실 소진율. 소진 시 "새 진입 전 24시간" 안내 + 약속 기록(차단 아님) | W5 · W9 | 업비트 체결 · 잔고 | 없음 | 하 |
| A5 | **약속 이행률** — 계획 대비 실행(손절 지켰나 · 사이즈 넘었나 · 리뷰 날짜 지켰나) 을 %로. **준수 거래 vs 위반 거래 성과 비교** — "규칙 지킨 거래가 더 벌었다"를 본인 데이터로 | 저널 도구 공통 · W7 | 업비트 체결 매칭 | 없음 | 중 |
| A6 | **행동 코치 확장** — 지금 3규칙(과매매 · 패닉 · 추격) 에 **복수매매**(손실 직후 재진입) · **물타기**(평단 낮추기 매수) · **사이즈 급증**(직전 대비 배율) · **손절 밀어내기**(A3 의 손절가 이하에서 미청산) · **연승 · 연패 상태** 추가. 알림은 원화 금액과 함께 | L1 · L2 · L3 · 2-3 | `behavior.ts` | 체결 폴링 주기 단축 | 중 |

### 7-2. 층 B — 학습 루프 (결정과 결과를 분리한다)

| # | 기능 | 근거 | 재사용 | 난이도 |
|---|---|---|---|---|
| B1 | **거래 일지** — A3 계획이 곧 일지 항목. 청산 시 셋업 · 실수 태그(추격 · 물타기 · 복수 · 계획 외 · 시간대) · 감정 점수 · 결정 품질(좋음/나쁨) × 결과(좋음/나쁨) 2축. **결과 좋고 결정 나쁜 사분면 강조** | W7 · W8 | W06 | 하 |
| B2 | **실수 비용 회계** — 태그된 실수 거래의 손익 합계를 원화로. "감정을 금액으로" | 저널 도구 · 2-3 | B1 | 하 |
| B3 | **처분효과 미러** — 익절 평균 보유일 vs 손절 평균 보유일 · 이익 실현 비율 vs 손실 실현 비율(Odean 지표) 을 본인 데이터로. 보유 화면에 **매입가 숨김 토글** | 2-3(−25%, 2주 지속) | 체결 이력 | 하 |
| B4 | **회전율 · 비용 미터** — 연환산 회전율 · 누적 수수료 · **벤치마크 대비("그냥 들고 있었으면" vs 실제)** 를 매달 | L1 · L7 | 체결 · 가격 이력 | 하 |
| B5 | **엣지 없음 배지** — 일지에서 특정 유형(급등 추격 · 새벽 거래 · 단타) 의 기대값이 표본 ≥20 에서 음이면 그 유형에 배지 | L6 · L9 | B1 | 하 |
| B6 | **사용자 보정 점수** — 계획에 적은 "오를 확률" 을 Brier 로 채점, 보정 곡선. 코치 전망과 **같은 자**(`forecast` 스코어카드 스키마) | W8 | `domain/scoring.py` | 중 |
| B7 | **월간 리뷰 리포트** — 벤치마크 대비 · 준수율 · 실수 비용 · 처분효과 · 낙폭 예산 · IPS 이탈 · "다음 달 한 가지". 수치는 서버, 문장만 LLM(템플릿 기본) | W7 · W9 | 해설 파이프라인 | 중 |
| B8 | **진입 전 체크리스트 + 프리모템** — 일지의 실수 태그에서 자라나는 질문 + 필수 1문항 "3개월 뒤 이 거래가 실패했다면 이유는?" | W7(+30%) | A3 | 하 |

### 7-3. 층 C — 시장 · 신호 (방향 아닌 리스크 · 국면 · 이벤트로만)

| # | 기능 | 근거 | 재사용 | 난이도 |
|---|---|---|---|---|
| C1 | **국면 카드** — 현재 `marketRegime`(RSI + 공포탐욕) 를 **실현 변동성 분위 + 200DMA/20주 추세 + 2상태 HMM** 으로 교체 · 병기. 셋이 불일치하면 "불확실". 각 국면의 과거 BTC 수익 분포(구간) 와 빗나간 사례(톱니 구간) 채점 | §3 ①②⑦ [강] | 가격 이력 · 채점 장치 | 중 |
| C2 | **과열 · 청산 위험 배지** — 펀딩비 · OI/시총 z-score 극단(레벨 아님). 방향이 아니라 "노출 축소 검토 시점" 리스크 문구. A2 의 변동성 타깃과 연결 | §3 ⑤ [중] | 이미 수집 중 | 하 |
| C3 | **김치 프리미엄 0 교차 이벤트** — 주요 사건 파이프라인(`events.py`) 에 이벤트 종류 추가. 과거 교차 후 7 · 30일 분포 · 빗나간 사례 | §3 ③ [중] | `events.py` · 이미 수집 중 | 하 |
| C4 | **현물 ETF 순유입** — 발행사 일일 공시 수집 → 1 · 5일 누적 → 도전자 피처 + 사건 카드. 집계 사이트는 약관 부재라 원천만 | §3 ④ [중~강] | `ingest/*` · 도전자 | 중 |
| C5 | **MVRV Z 사이클 라벨** — Coin Metrics Community 로 계산(비상업 CC → 소유자 전용 · 내부 파생만). 하나만. 실패 사례에 "2025 정점 임계 미도달" 명기 | §3 ⑥ [중] | — | 중 |
| C6 | **시나리오 · 스트레스** — "−30% 면 원화로 얼마" · CVaR(팻테일) · 과거 최악 구간 재현. 확률은 보정 검증 있을 때만 | 6 · W02/W03 | `forecast.ts` 보유 시나리오 | 중 |
| C7 | **논지 감시 알림** — A3 의 무효화 조건 · 보유 이유 항목 vs 새 사실(가격 · 사건 · 뉴스) 지지/반박/무관. 조용한 날 "변화 없음". 가격 · 뉴스 개수만으로 알림 금지 | W05 | 알림 워커 · `SentimentAlert`(미사용) | 중 |

### 7-4. 층 D — 예측 · 검증 파이프라인 보강 (기존 F008 안에서)

| # | 항목 | 근거 |
|---|---|---|
| D1 | 변동 범위 기저를 **HAR-RV/GARCH 변동성 → 분위수** 로 (도전자 v0.5~0.6 이 이미 이 방향) | §4 변동성만 예측된다 |
| D2 | **CPCV · 시간 블록 부트스트랩 · Deflated Sharpe · PBO** 를 승격 게이트로. 시도 횟수를 실험 로그에 기록. `time-and-leakage.md` 에 "워크포워드 단독 금지" 명문화 | C10 · López de Prado |
| D3 | **나이틀리 스코어카드**(CRPS · pinball · Brier · Kupiec · Christoffersen · 기준 대비) 를 3종 고지의 유일한 데이터 원천으로 | §4 |
| D4 | LLM 관련 평가는 **컷오프 이후 구간만** 유효. 반사실 교란 테스트(뉴스 부호 반전) 를 회귀 테스트에 | Profit Mirage |
| D5 | 방향 확률 55% 미만이면 "방향 정보 없음" 표기(지금 게이트와 정합) | §4 |

### 7-5. 층 E — 규제 안전 포맷

| # | 항목 |
|---|---|
| E1 | 예측 카드 · 코치 컴포넌트에 **3종 고지 고정 슬롯**(정보 제공 목적 · 개별 상담 불가 · 원금손실 가능). prop 아님 |
| E2 | **개인 보유 · 수량 · 평단은 LLM 프롬프트에 넣지 않는다.** 포트폴리오 문맥 문장은 서버 템플릿(FR-46 확장) |
| E3 | 성능 문구는 "기간 · 표본 수 · 기준 대비 · 빗나간 사례 수" 4요소 세트만. "AI 가 예측" · 합산 · 미실현 수익률 금지 목록을 검증기에 |
| E4 | 코인 전망 카드 기능 플래그 격리 · 디지털자산기본법 2단계(2026-11) 추적 항목 |
| E5 | 위험 성향 점수 · 재무 점수화 기능은 만들지 않는다 |

### 7-6. 제안 슬라이스 순서

증거 강도 × 의존성 × 새 데이터 없음 기준. 기존 워크벤치 단계 A(C01~C06 신뢰성) 는 **먼저** 간다 — 성적표 정의가 틀린 채로 준수율을 붙이면 두 숫자가 다 거짓이 된다.

| 순서 | 묶음 | 내용 | 영역 | 끝나면 되는 것 |
|---|---|---|---|---|
| 0 | 워크벤치 A | C01~C06(사실 스냅샷 · 캐시 키 · 숫자 의미 검증 · MDD 오명 · 기간 통일 · 시드 분리) | 서버 · DB · BFF · FE | 지금 숫자를 믿을 수 있다 |
| 1 | **A1 · A3 · B1** | IPS · 계획 우선 진입 · 일지(= `DecisionSnapshot`/`DecisionOutcome`) + E1 · E2 | 서버 · DB · BFF · FE | 사용자가 계획을 쓰고, 그 계획이 기록된다 |
| 2 | **A2 · A4 · C1 · C2** | 사이즈 계산기(변동성 타깃 포함) · 낙폭 예산 · 국면 카드 · 과열 배지 | Python(변동성 · 국면) · 서버 · FE | "얼마를 걸어야 하나"에 서버가 답한다 |
| 3 | **A5 · A6 · B2 · B3 · B4** | 준수율 · 행동 코치 확장 · 실수 비용 · 처분효과 미러 · 회전율 · 벤치마크 | 서버 · FE | 본인 데이터로 "규칙이 돈이 된다"가 보인다 |
| 4 | **B5 · B6 · B7 · B8** | 엣지 없음 배지 · 보정 점수 · 월간 리뷰 · 체크리스트 | Python(채점) · 서버 · FE | 학습 루프가 닫힌다 |
| 5 | **C3 · C4 · C6 · C7** | 김프 교차 · ETF 유입 · 시나리오 · 논지 감시 | Python · 서버 · FE | 사건 · 논지 기반 알림 |
| 6 | **D1~D5 · C5** | 검증 방법론 · 스코어카드 · MVRV | Python | 26주 라이브 뒤 재평가와 맞물림 |

**REQ 로 내릴 때**: 층 A · B 는 새 PM 기획서(예: `FEATURE-009-behavior-risk-coach`) 하나가 자연스럽다. 층 C · D 는 `FEATURE-008` FR 추가(국면 · 사건 종류 · 검증 게이트). 층 E 는 마스터 인덱스 §6 공통 수용 기준에 항목 추가.

---

## 8. 제품 평가 — "코치가 돈을 벌게 했나"를 어떻게 재나

- **1차 지표는 행동**: 회전율 · 처분효과 비대칭 · 추격 매수 빈도 · 약속 이행률 · MDD · 집중도. 로보어드바이저 문헌이 일관되게 보고하는 효과(과신 · 손실회피 완화) 가 여기 있다.
- **2차 지표는 PnL 대비 벤치마크**(그냥 들고 있었으면). 금융 결과는 분산이 커서 1인 데이터로 유의 검정은 불가 — 방향 확인용.
- **`coach_outcome` 이벤트**: 카드 노출 → 사용자 행동(계획 저장 · 체결 · 미체결 · 방향) → 벤치마크 대비 결과. W06 과 같은 테이블.
- **A/B 는 정보 내용이 아니라 표현 포맷만**(규제 · 형평).
- **모델 쪽은 스코어카드**(D3) 로, **신호 승격은 DSR/PBO**(D2) 로.

---

## 9. 하지 않는 것

| 항목 | 이유 |
|---|---|
| LLM 에게 종목 · 비중 · 타이밍 질문 | 편향 강화(PLOS One 2025) · 개별성(자문 판정) |
| 자동매매 · 시그널 · 급등 순위 | 포지셔닝 반대 · L3 를 만든다 |
| 한 점 목표가 · 확신 표현 · "AI 가 예측" | ADR-003 · SEC AI-washing · 한국 단정적 판단 금지 |
| 공포탐욕 · 펀딩비 · M2 를 **예측 근거**로 | 맥락 · 리스크 지표만. 선행 주장 근거 약 |
| 온체인 유료 소스 지금 구매 | 근거 약~중 · 재배포 금지 · 무료 데이터로 층 A~C 전부 가능 |
| 위험 성향 점수 · 재무 점수화 | EU 고위험 · 한국 자문 판정 |
| 4년 사이클 · 반감기 예측 | 표본 4 · 진폭 감쇠 |

---

## 10. Open Questions

- **체결 매칭 정밀도**: 업비트 체결 이력을 A3 계획과 자동 매칭하는 기준(시간 창 · 수량 오차). 수동 매칭 폴백 필요.
- **IPS 항목의 최소 집합**: 사용자가 답하지 않으면 A2 가 "입력 필요" 상태를 반환한다(W03 원칙). 기본값을 서버가 제안할지.
- **변동성 타깃의 목표값**: 연 10 · 15 · 20% 중 기본. 사용자 IPS 에서 파생.
- **Coin Metrics 비상업 라이선스**: 소유자 1인 · 무료 앱은 비상업이지만 "서비스" 해석 여지. 상업화 시점에 제거 가능한 구조로.
- **ETF 발행사 공시 크롤러**: 발행사별 페이지 형식 · 시각(미 동부 장 마감 후). 원천이 바뀌면 깨진다.
- **디지털자산기본법 2단계**: 2026-11 소위 결과에 따라 코인 전망 카드 재검토. 추적 항목 등록 위치(마스터 인덱스 vs `FEATURE-008` Open Questions).
- **월간 리뷰 문장의 LLM 사용**: 템플릿 기본(FR-45) 을 그대로 적용하되 개인 데이터가 들어가므로 E2 와의 경계 — 금액은 서버 렌더러 삽입, LLM 은 사실 ID 참조.
- **한국 코인 개인투자자 성과 연구**: 거래소 계좌 단위 학술 연구를 찾지 못했다. 금융위 · FIU 실태조사가 대체 출처.

---

## 11. 미검증 · 한계

- 웹 리서치 일부 출처(ScienceDirect · SSRN · MDPI) 는 403 으로 원문을 못 열어 초록 · 검색 스니펫에 의존했다. 특히 Grobys 외(2026) 임계값 · Sharpe, Profit Mirage 세부 감쇠 %.
- 한국 시장경보 통계(L8) 는 언론 집계다. KRX 원자료 재계산 권장.
- BIS 73~81% 는 WP 1049 본문 기준. Bulletin 69 웹 요약에는 국가별 % 없음.
- ESMA "손실 계좌 비율 불변"은 2018-08 한 달 비교.
- 자문업계 25년 계량(100~200bp) 은 자문사 자체 리서치다 — 이해관계 있음.
- 코드 인벤토리는 `8e1462a` 기준 정적 읽기. 운영 DB · 실화면은 확인하지 않았다.

---

## Sources (English)

### Retail losses · behavior
- Barber & Odean (2000) Trading Is Hazardous to Your Wealth, *J. Finance* — https://faculty.haas.berkeley.edu/odean/papers%20current%20versions/individual_investor_performance_final.pdf
- Barber & Odean (2001) Boys Will Be Boys, *QJE* — https://faculty.haas.berkeley.edu/odean/papers/gender/boyswillbeboys.pdf
- Odean (1998) Are Investors Reluctant to Realize Their Losses? — https://faculty.haas.berkeley.edu/odean/papers%20current%20versions/areinvestorsreluctant.pdf
- Barber & Odean (2008) All That Glitters, *RFS* — https://faculty.haas.berkeley.edu/odean/papers%20current%20versions/allthatglitters_rfs_2008.pdf
- Barber, Huang, Odean, Schwarz (2022) Attention-Induced Trading and Returns — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3715077
- Kumar (2009) Who Gambles in the Stock Market? — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1263479
- Barber, Lee, Liu, Odean (2009) Just How Much Do Individual Investors Lose by Trading? — https://faculty.haas.berkeley.edu/odean/papers%20current%20versions/justhowmuchdoindividualinvestorslose_rfs_2009.pdf
- Barber, Lee, Liu, Odean (2014) The Cross-Section of Speculator Skill — https://www.sciencedirect.com/science/article/abs/pii/S1386418113000190
- Chague, De-Losso, Giovannetti (2020) Day Trading for a Living? — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101
- SEBI (2024) 93% of Individual Traders Incurred Losses in Equity F&O — https://www.sebi.gov.in/media-and-notifications/press-releases/sep-2024/updated-sebi-study-reveals-93-of-individual-traders-incurred-losses-in-equity-fando-between-fy22-and-fy24-aggregate-losses-exceed-1-8-lakh-crores-over-three-years_86906.html
- ESMA (2018) Product Intervention Analysis CFDs — https://www.esma.europa.eu/sites/default/files/library/esma50-162-215_product_intervention_analysis_cfds.pdf
- BIS WP 1049 (2022) Crypto trading and Bitcoin prices — https://www.bis.org/publ/work1049.pdf ; BIS Bulletin 69 (2023) — https://www.bis.org/publ/bisbull69.pdf
- Kogan, Makarov, Niessner, Schoar (2023) Are Cryptos Different? NBER w31317 — https://www.nber.org/papers/w31317
- 김민기 · 김준석, 자본시장연구원 (2021) 코로나19 국면의 개인투자자 — https://www.kcmi.re.kr/report/report_view?report_no=1243
- 이데일리 (2026-09-20) 경보종목 4개 중 1개는 30% 급락 — https://edaily.co.kr/News/Read?mediaCodeNo=257&newsId=01334966645582088
- Gervais & Odean (2001) Learning to Be Overconfident — https://faculty.haas.berkeley.edu/odean/papers%20current%20versions/learningrfs.pdf

### What works
- Moskowitz, Ooi, Pedersen (2012) Time Series Momentum — https://w4.stern.nyu.edu/facdir/lpederse/papers/TimeSeriesMomentum.pdf
- Hurst, Ooi, Pedersen (2017) A Century of Evidence on Trend-Following — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2993026
- Asness, Moskowitz, Pedersen (2013) Value and Momentum Everywhere — https://onlinelibrary.wiley.com/doi/10.1111/jofi.12021
- Daniel & Moskowitz (2016) Momentum Crashes — https://www.nber.org/papers/w20439
- Frazzini & Pedersen (2014) Betting Against Beta — https://pages.stern.nyu.edu/~lpederse/papers/BettingAgainstBeta.pdf
- Moreira & Muir (2017) Volatility-Managed Portfolios — https://www.nber.org/papers/w22208
- McLean & Pontiff (2016) Does Academic Research Destroy Stock Return Predictability? — https://onlinelibrary.wiley.com/doi/abs/10.1111/jofi.12365
- Thorp (2006) The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market — https://gwern.net/doc/statistics/decision/2006-thorp.pdf
- MacLean, Thorp, Ziemba (2010) Good and Bad Properties of the Kelly Criterion — https://www.worldscientific.com/doi/abs/10.1142/9789814293501_0039
- Taleb (2018) The Logic of Risk Taking — https://medium.com/incerto/the-logic-of-risk-taking-107bf41029d3
- Marks (2015) Risk Revisited Again — https://www.oaktreecapital.com/insights/memo-video/the-memo-risk-revisited-again ; (2020) You Bet! — https://www.oaktreecapital.com/insights/memo-video/the-memo-you-bet
- Klein (2007) Performing a Project Premortem, *HBR*; Mitchell, Russo, Pennington (1989) — https://onlinelibrary.wiley.com/doi/abs/10.1002/bdm.3960020103
- Tetlock (2005) Expert Political Judgment; Mellers et al. (2015) Identifying and Cultivating Superforecasters — https://faculty.wharton.upenn.edu/wp-content/uploads/2015/07/2015---superforecasters.pdf
- Vanguard Advisor's Alpha 25-year review (behavioral coaching 100–200bp) — https://www.investmentnews.com/practice-management/advisors-continue-to-shine-as-emotional-circuit-breakers-vanguard-says/259609

### Interventions that work
- Heimer & Imas (2022) Biased by Choice: How Financial Constraints Can Reduce Financial Mistakes, *RFS* — https://academic.oup.com/rfs/article-abstract/35/4/1643/6308957
- Fischbacher, Hoffmann, Schudy (2017) The Causal Effect of Stop-Loss and Take-Gain Orders on the Disposition Effect, *RFS* — https://academic.oup.com/rfs/article-abstract/30/6/2110/2999690
- Frydman & Rangel (2014) Debiasing the disposition effect by reducing the saliency of purchase price — https://www.rnl.caltech.edu/publications/pdf/frydman2014a.pdf
- Frontiers in Behavioral Economics (2024) informational intervention on disposition effect — https://www.frontiersin.org/journals/behavioral-economics/articles/10.3389/frbhe.2024.1345875/full
- ScienceDirect (2024) portfolio framing and disposition effect — https://www.sciencedirect.com/science/article/pii/S2214635024001126
- Bhattacharya et al. (2012) Is Unbiased Financial Advice to Retail Investors Sufficient? *RFS* — https://academic.oup.com/rfs/article-abstract/25/4/975/1579400
- European Journal of Finance (2024) effects of trading apps on investment behavior — https://www.tandfonline.com/doi/full/10.1080/1351847X.2024.2401604
- Cogent Economics & Finance (2025) robo-advisors mitigating overconfidence/loss aversion — https://www.tandfonline.com/doi/full/10.1080/23322039.2025.2571403
- FCA PS19/18 (2019) — https://www.fca.org.uk/publication/policy/ps19-18.pdf

### Crypto signals
- Grobys, Näsman, Sandretto (2026) Using on-chain data to predict Bitcoin cycles, *RIBF* — https://www.sciencedirect.com/science/article/pii/S0275531926002138
- Bitcoin Price Prediction: Peer-Reviewed Evidence and Social Media Discourse, arXiv 2606.00071 (2026) — https://arxiv.org/html/2606.00071v1
- Liu, Tsyvinski, Wu (2022) Common Risk Factors in Cryptocurrency, *J. Finance* — https://onlinelibrary.wiley.com/doi/abs/10.1111/jofi.13119
- Rozario et al. (2020) A Decade of Evidence of Trend Following in Cryptocurrencies, arXiv 2009.12155 — https://ar5iv.labs.arxiv.org/html/2009.12155
- Man Group (2024-12) In Crypto We Trend — https://www.man.com/insights/in-crypto-we-trend
- Beyond Forecasting: Recasting Volatility Control as a Routing Problem, arXiv 2608.10375 (2026) — https://arxiv.org/pdf/2608.10375
- Forecasting Bitcoin Volatility: A Comparative Analysis, arXiv 2401.02049 (2024) — https://arxiv.org/abs/2401.02049
- Downside Risk Reduction Using Regime-Switching Signals, arXiv 2402.05272 (2024) — https://arxiv.org/pdf/2402.05272
- Lim (2025) The Price Impact of Spot Bitcoin ETF Flows, SSRN — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6592830
- Inan (2025) Predictability of Funding Rates, SSRN — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5576424
- Implied volatility slopes and jumps in bitcoin options market (2024) — https://www.sciencedirect.com/science/article/abs/pii/S0167637724000713
- Seo et al. (2024) Nonlinear dynamics of Kimchi premium, *Economic Modelling* — https://www.sciencedirect.com/science/article/pii/S0264999324000828
- Asymmetric and Time-Varying Lag Structures in Bitcoin's Kimchi Premium, *Mathematics* (2026) — https://www.mdpi.com/2227-7390/14/9/1501
- Bitcoin's Weekend Effect 2014–2024 (2025) — https://www.researchgate.net/publication/396418897
- Spark (2026) Is Bitcoin's Four-Year Cycle Dead? — https://www.spark.money/research/bitcoin-four-year-cycle-dead
- Grayscale Research, Crypto in Diversified Portfolios — https://research.grayscale.com/reports/crypto-in-diversified-portfolios
- 국세청, 거주자의 가상자산소득 과세 개요 — https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=40370&cntntsId=238935

### Data sources · terms
- Upbit rate limits — https://docs.upbit.com/kr/reference/rate-limits
- Binance funding history — https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Get-Funding-Rate-History ; OI stats — https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Open-Interest-Statistics
- Coin Metrics Community Data — https://gitbook-docs.coinmetrics.io/packages/coin-metrics-community-data
- Deribit rate limits — https://docs.deribit.com/articles/rate-limits
- CFTC COT CME — https://www.cftc.gov/dea/futures/deacmesf.htm
- FRED API Terms — https://fred.stlouisfed.org/docs/api/terms_of_use.html
- mempool.space REST — https://mempool.space/docs/api/rest ; blockchain.com API terms — https://www.blockchain.com/legal/api-terms

### AI / LLM reality
- Lopez-Lira & Tang, Can ChatGPT Forecast Stock Price Movements? arXiv 2304.07619 — https://arxiv.org/abs/2304.07619 ; Sharpe decay summary — https://alphaarchitect.com/chatgpt-forecast-stock-price/
- Profit Mirage: Revisiting Information Leakage in LLM-based Financial Agents, arXiv 2510.07920 (2025) — https://arxiv.org/abs/2510.07920
- FINSABER, arXiv 2505.07078 (2025) — https://arxiv.org/abs/2505.07078
- TradingAgents, arXiv 2412.20138 (2024) — https://arxiv.org/abs/2412.20138
- FinGPT arXiv 2306.06031 ; FinBen arXiv 2402.12659
- AI in Equity and Crypto Markets: Progress, Profitability Evidence, and the Limits of Automated Investing, arXiv 2609.04917 (2026) — https://arxiv.org/pdf/2609.04917
- Pretrained Time-Series Foundation Models for Financial Return Forecasting, arXiv 2606.27100 (2026) — https://arxiv.org/abs/2606.27100
- A Practical Guide to harnessing the HAR volatility model, *JBF* (2021) — https://www.sciencedirect.com/science/article/abs/pii/S0378426621002417
- Biased echoes: LLMs reinforce investment biases, *PLOS One* (2025) — https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0325459
- One Size Fits None: Heuristic Collapse in LLM Investment Advice, arXiv 2604.23837 (2026) — https://arxiv.org/pdf/2604.23837
- Bailey & López de Prado, The Deflated Sharpe Ratio — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551 ; Probability of Backtest Overfitting — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253
- Backtest overfitting in the ML era, *Knowledge-Based Systems* (2024) — https://www.sciencedirect.com/science/article/abs/pii/S0950705124011110
- A Gentle Introduction to Conformal Time Series Forecasting, arXiv 2511.13608 (2025) — https://arxiv.org/pdf/2511.13608
- Marex (2025-12) Generative AI in hedge funds — https://www.marex.com/news/2025/12/generative-ai-in-hedge-funds-from-experimentation-to-everyday-use
- Sheng, Sun, Yang, Zhang (2025) Generative AI and Asset Management, SSRN — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4786575

### Regulation
- SEC Press Release 2024-36 — https://www.sec.gov/newsroom/press-releases/2024-36 ; 2024-167 — https://www.sec.gov/newsroom/press-releases/2024-167
- FINRA Regulatory Notice 24-09 — https://www.finra.org/rules-guidance/notices/24-09
- ESMA Public Statement on AI and investment services (2024-05) — https://www.esma.europa.eu/sites/default/files/2024-05/ESMA35-335435667-5924__Public_Statement_on_AI_and_investment_services.pdf
- 금융위원회, 유사투자자문업자 규율 자본시장법 개정 시행 (2024-08-14) — https://www.fsc.go.kr/no010101/82887
- 금융위원회, '25년 유사투자자문업자 점검 · 검사 결과 (2026-04) — https://www.fsc.go.kr/no010101/86747
- 금융투자협회, 불법 금융투자업 안내 — https://www.kofia.or.kr/wpge/m_167/sub04070101.do
- 법제처, 가상자산 이용자 보호 등에 관한 법률 — https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=261099
- 뉴시스 (2026-09-17) 디지털자산기본법 2단계 — https://www.newsis.com/view/NISX20260917_0003793358
- 김 · 장 (2025-12) 금융분야 AI 가이드라인 개정안 — https://www.kimchang.com/ko/insights/detail.kc?sch_section=4&idx=33825

### Product benchmark (기능 조사용 · 문서 본문에는 이름 미기재)
- Metaculus FAQ (calibration curves, Brier) — https://www.metaculus.com/faq/
- NIESR, communicating uncertainty (fan charts) — https://niesr.ac.uk/publications/communicating-uncertainty-macroeconomic-forecasts
- Korean brokerages' generative AI services (2025) — https://consumernews.co.kr/news/articleView.html?idxno=735020 ; https://www.mt.co.kr/stock/2025/11/12/2025111216254521519
- Behavioral design in trading apps, UX patterns (2026) — https://openwebsolutions.in/blog/behavioral-design-trading-apps-ux-patterns/
