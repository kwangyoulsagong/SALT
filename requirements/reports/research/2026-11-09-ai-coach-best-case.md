# 리서치 — AI 코치 베스트 케이스: "관망도 판단이다" · 근거 있는 로컬 LLM 해설 · 정직한 보류

- 날짜: 2026-11-09
- 요청: 사용자 *"AI 코치 기획을 베스트 케이스로 해줘. 딥리서치하고. 어차피 이제 로컬 LLM도 있으니 AI가 강력해졌잖아."*
  (직전 *"ai 코치는 왜 안열리는거임? 코인이든 주식이든 … 평생 안열리나"* · *"그럼 의미가 없자나"*)
- 결과물: `FEATURE-017` · `ADR-010`(제안) · `SRV-REQ-053` · `BFF-REQ-052` · `FE-REQ-064` · `FC-REQ-028` · 전 영역 계획 `F017-ai-coach-best-case-global-plan.md`
- **투자 동결 위의 사용자 요청이다**(MONEY 글로벌 플랜 — 투자는 "기획된 것까지"). 사용자 요청으로 연다

## 0. 요약

1. **코치가 안 열리는 이유는 표본이 아니라 "근거 문장 0개"다.** 규칙 엔진은 아무 규칙도 발동하지 않으면 `wait`(관망) + 근거 0 · 위험 0 을 낸다. 3종 게이트의
   첫 칸(근거)이 비어 판단 · 해설 · 수익 플랜이 같이 닫힌다(`reasons_missing`). 신호 없는 날이 대부분이라 표본이 쌓여도 풀리지 않는다 — 구조 문제
2. **관망은 판단이다.** 엔진은 그날 항목 값(24시간 변화 · RSI · 심리)을 **실제로 보고** 문턱에 닿지 않았다고 판정했다. 그 값과 문턱까지의 거리가 근거다 —
   지어낸 문장이 아니라 원장(`judgment_ledger.components`)에 이미 남는 사실이다
3. **LLM 은 판단하지 않는다 — 판단을 사람 말로 옮긴다.** 금융 LLM 의 가장 큰 실패는 숫자 · 계산 환각이고(§2), 대책은 "원천에서 숫자를 주입 · 주장 단위 검증 ·
   틀리면 버림"이다. 우리 해설 경로(`FEATURE-008` FR-44 · 48 · 49 · 73)가 이미 이 모양이다 — 넓히는 일이지 새로 만드는 일이 아니다
4. **보류도 보여 준다.** 보류(abstention)를 밝히는 의사결정 도구가 사용자가 느끼는 품질을 떨어뜨리지 않았다는 연구가 있다(§3). "안 보여 드려요" 대신
   "규칙이 신호를 내지 않았어요 — 이 값들을 봤어요"가 정직하다
5. **설명은 짧게 먼저, 길게는 펼쳐서.** 자세한 설명이 오히려 과신(over-reliance)을 늘린 연구가 여럿이다(§4) — 한 줄 + 펼치기(progressive disclosure)
6. **채점이 열쇠다.** LLM 투자 에이전트 대부분이 오염 없는 기간에 단순 보유를 못 이겼다(§5). 그래서 코치의 판단은 계속 규칙 엔진(사전등록 · 채점)이 내고,
   LLM 의 몫은 "충실도 · 정직률"로 따로 채점한다

## 1. 지금 코드 — 사실(2026-11-09)

| 항목 | 사실 | 위치 |
|---|---|---|
| 판단 엔진 | 점수 50 + 항목 기여(24시간 변화 · 심리(단타만) · RSI · 결측). 70 이상 후보 · 50~69 관망 · 50 미만 피하기 | `salt-server/src/coach/domain/policy/modeDecision.ts` `scoreModeDecision` |
| 근거 문장 | 문턱을 넘은 항목만 `reasons`(긍정) · `risks`(위험)에 한 문장. **관망 · 아무 것도 안 넘음 = 둘 다 빈 배열** | 같은 파일 |
| 게이트 | 열지 않은 모드 → 이력 → 투자유의 → 재료 멈춤 → **근거 0(`reasons_missing`)** → 표본 < 20 → 실패사례 0 | `domain/policy/symbolJudgment.ts` `judgmentGate` |
| 근거 판정 | 피하기는 `risks` 도 근거로 친다 — 관망만 영영 비는 구조 | `judgmentEvidence` |
| 해설 | 판단이 게이트를 못 넘으면 LLM 을 부르지 않는다 | `application/ExplainCoachDecision.ts` |
| LLM 라우팅 | 로컬 Claude Code · Codex CLI(허용 사용자 · 웹만) → 실패면 Gemini | `domain/policy/explainRouting.ts` · `SRV-REQ-050` |
| 원장 | 항목별 기여 · 값을 판정마다 남긴다(`components` — 응답엔 안 싣는다) | `ScoredModeDecision` · `judgment_ledger` |
| 화면 문구 | `reasons_missing` → "근거가 부족해 이번엔 판단을 보여 드리지 않아요." + "표본 N건 · 정상 동작이에요" | `salt-microFe/packages/domain-invest/src/entities/coach/model/messages.ts` |

실측(2026-11-09 09:5x, BFF `/api/app/ai-coach/detail`):

| 종목 | 단타 | 장기 |
|---|---|---|
| BTC | 막힘 `reasons_missing`(구간 표본 228) | 막힘 `reasons_missing`(365) |
| ETH · XRP | **열림** — 관망 + "단기 침체 신호가 일부 있습니다."(RSI ≤ 35), 성적 76건 | `reasons_missing` · `insufficient_sample` |
| SOL | `reasons_missing` | `insufficient_sample` |
| 삼성전자 · SK하이닉스 | `mode_not_open`(국내 단타 미개방 — `FEATURE-011` FR-63, 설계) | `reasons_missing`(244) |

- 화면 "근거가 부족해 … 표본 76건 · 정상 동작"은 표본 문제처럼 읽힌다 — **틀린 안내**다
- 삼성전자 상세에서 `/api/app/ai-coach/detail` 504(시간 초과)가 한 번 났다 — 별도 조사(단계 1)

## 2. 금융 LLM 의 실패 — 숫자 환각, 대책은 주입 · 주장 단위 검증

- 금융 표 · 재무제표에서 LLM 은 **단순 조회는 잘하지만 계산이 끼면 급격히 틀린다**. 기존 환각 탐지기는 계산 오류를 상당수 놓친다 —
  답을 원자 주장으로 쪼개 표와 대조하고 근거 없는 주장을 인용과 함께 다시 쓰게 하는 방식이 제안됐다(FinGround · FAITH · FinVerBench)
- 숫자는 모델 기억이 아니라 **권위 있는 원천 API 에서 가져와 주입**하라(QuantMCP) · 검색한 문서를 실행 가능한 계산 프로그램으로 바꿔 숫자를 계산기가 내게 하라(DCRC)
- 신경-기호 검증(VeriFin · VERAFI): LLM 이 낸 주장을 규칙 · 기호 계산으로 확인
- **우리 결론**: 숫자 · 판정은 서버(규칙 엔진 · 계산), LLM 은 문장만. 검증기는 ① 문장 속 숫자가 사실표에 있는가 ② 인용 id 가 사실표에 있는가
  ③ 금지어(확신 · 인과 단정 · 명령형) ④ 사실표에 없는 고유명사 — 하나라도 어기면 그 문장을 버리고 템플릿으로. `FEATURE-008` 검증기(숫자 대조 · 금지어 · 명령형 · 인용)를 그대로 넓힌다

## 3. 보류를 정직하게 — 선택적 예측(reject option)

- 선택적 분류는 틀릴 가능성이 큰 입력에서 답을 보류한다. 보류 뒤 남은 답의 확신이 잘 맞아야(calibrated) 의미가 있다 —
  사용자가 스스로 검증하기 어려운 영역일수록 더 그렇다(Calibrated Selective Classification)
- 원시 확신값은 잘 맞지 않는 경우가 많다 — 사용자에게 "믿을지"를 가늠할 다른 신호(신뢰 점수)를 보여라(To Trust Or Not To Trust A Classifier)
- **보류하는 의사결정 지원 시스템이 자기 한계를 드러내도 사용자가 느끼는 품질은 떨어지지 않았다**(arXiv 2309.05443, 초록 기준)
- 거래 신호 연구에서도 예측은 "약한 통계적 우위"라 거르기 · 보류 논리가 필요하다는 보고(설명 가능한 BTC 예측 + LLM 서술)와,
  고정 문턱 규칙이 횡보장에서 잡음에 매매해 손실을 낸 사례(하이브리드 거래 에이전트 오류 분석)가 있다
- **우리 결론**: "관망"과 "보류"를 가른다.
  - **관망** = 엔진이 봤고 신호가 없었다 → 판단으로 보인다(근거 = 본 값 · 문턱까지 거리) · 관망 자체를 채점
  - **보류** = 엔진이 볼 수 없었다(재료 멈춤 · 이력 부족 · 표본 부족 · 투자유의) → 이유를 사람 말로("RSI 를 사흘째 못 받았어요")

## 4. 설명이 과신을 늘린다 — 짧게 먼저

- 441명 실험: 숫자 확신도는 오류를 알아채게 도왔지만 사람들은 그 확신만큼 믿지 않았다. **말로 된 설명은 의존을 높이고 과의존 위험도 높였다**
- 개인 재무 앱 설명 깊이 연구(학위 논문 — 동료 심사 아님): 설명이 자세할수록 신뢰 점수는 올랐지만 **나쁜 조언을 거절하는 능력이 약 22%p 떨어졌다** —
  단계적 공개(progressive disclosure)와 불확실성 표시를 권함
- 성과 압박 연구 · 설명 전략 비교: 설명이 과의존을 늘린 결과가 반복된다. 주식 거래 비전문가 연구는 확신이 높을 때만 특정 설명 방식이 도움이 됐다
- **우리 결론**: 첫 화면은 판단 이름 + 한 줄(사실) + 성적 한 줄(표본 · 기준 대비 · 빗나간 사례 수). 문장 해설 · 항목 표 · 실패 사례는 펼쳐서.
  확신이 낮은(표본 적음 · 기준과 구별 안 됨) 판단은 해설을 더 짧게

## 5. LLM 에이전트가 직접 판단하면 — 채점에서 진다

- 지식 컷오프 뒤 기간으로 오염을 막은 벤치마크에서 **대부분의 LLM 거래 에이전트가 단순 보유를 못 이겼다**(StockBench)
- 백테스트 미래 누수(look-ahead) · 생존 편향 · 과적합 · 거래 비용 무시 · 국면 변화 무시가 보고 수익의 부호까지 뒤집을 수 있다(금융 멀티에이전트 평가 분류) ·
  뉴스 게시 시각 ≠ 쓸 수 있게 된 시각(에이전트 거래 서베이) · 시점 고정 LLM 의 미래 누수 벤치마크(Look-Ahead-Bench) · 실시간 평가 경기장(Agent Market Arena)
- 공개 금융 에이전트 플랫폼(4층 구조 · 데이터 → 개념 → 논지 사슬 · 강세/약세 토론 + 판정 에이전트)은 **보고서 생성**엔 쓸 만하지만 채점된 판단 근거는 아니다
- **우리 결론**: 판단(관망 · 후보 · 피하기)은 규칙 엔진이 내고 채점한다(`FEATURE-010` 사전등록 · IC). LLM 은 ① 판단을 사람 말로 ② 사실표 안에서 질문에 답하기
  ③ 같은 날 사실 정리(`FEATURE-016` ③)까지. "LLM 이 강력해졌다"의 몫은 **문장 품질 · 질문 응답 · 로컬 무료 처리량**이지 판정 권한이 아니다

## 6. 로컬 LLM — 지금 있는 것 위에

- 이미 있다: 로컬 Claude Code · Codex CLI 라우팅(stdin · 도구 0 · 빈 폴더 · env 허용 목록 · 45초 · 동시 2 · 허용 사용자 · 웹만, 실패하면 Gemini) — `SRV-REQ-050`
- 구조화 출력: 스키마 강제 디코딩은 **모양만** 보장하고 내용은 보장하지 않는다 — 구조 검사 → 코드 규칙 검사 → (필요하면) 판정 모델 순의 층.
  모양 강제가 추론 품질을 떨어뜨린다는 보고도 있어 "자유 문장 생성 → 두 번째 단계에서 모양 맞추기"가 낫다는 실무 권고(블로그 — 검증 안 함)
- **우리 결론**: CLI 는 자유 문장(문장마다 `[f3]` 같은 인용 표지)을 내고, 서버 검증기가 문장 단위로 대조해 모양을 만든다(이미 그렇게 흐른다 — 문장 단위 스트리밍 FR-73).
  처리량: 판단은 하루 몇 번 바뀌므로 **판단 지문(종목 · 모드 · 규칙 버전 · 항목 값 구간)마다 한 번 생성 · 저장**(F016 ③ 스냅샷과 같은 방식) — 요청마다 LLM 0

## 7. 설계로 옮긴 것

| 리서치 | 설계 |
|---|---|
| 관망 = 본 값이 문턱 밖 | 관망 근거 = 항목별 값 · 문턱 · 거리(원장 `components` 를 응답에) — `ADR-010` · `SRV-REQ-053` FR-1 |
| 관망 ≠ 보류 | 게이트 사유를 둘로: 판단(관망 포함 렌더) · 보류(이유 문장) — `FE-REQ-064` FR-1 · 2 |
| 숫자 환각 | 사실표 주입 · 문장 단위 검증 · 버리면 템플릿(기존 검증기 확장) — `SRV-REQ-053` FR-4 |
| 설명 과신 | 한 줄 + 펼치기 · 확신 낮으면 더 짧게 — `FE-REQ-064` FR-3 |
| LLM 판단은 채점에서 진다 | 판정은 엔진 · LLM 은 문장 · 해설 충실도 · 정직률 따로 채점 — `FC-REQ-028` |
| 로컬 처리량 | 판단 지문 스냅샷 · 로컬 우선 · 사람마다 같은 문장(보유 0) — `SRV-REQ-053` FR-5 |
| 보고서형 질문 | "물어보기" — 사실표 안에서만 답하고, 없으면 "그 사실은 아직 없어요" — `SRV-REQ-053` FR-7(단계 3) |

## 출처

- [FinGround: Detecting and Grounding Financial Hallucinations via Atomic Claim Verification](https://www.researchgate.net/publication/404248104_FinGround_Detecting_and_Grounding_Financial_Hallucinations_via_Atomic_Claim_Verification)
- [FAITH: Intrinsic Tabular Hallucinations in Finance](https://arxiv.org/pdf/2508.05201)
- [FinVerBench](https://arxiv.org/pdf/2605.29586)
- [VeriFin](https://arxiv.org/pdf/2608.10213) · [VERAFI](https://arxiv.org/pdf/2512.14744)
- [QuantMCP: Grounding LLMs in Verifiable Financial Reality](https://arxiv.org/html/2506.06622v1)
- [Data-centric Reasoning Compiler (DCRC)](https://awesomepapers.io/ai-agents/papers/2605.31064)
- [Calibrated Selective Classification](https://arxiv.org/pdf/2208.12084) · [To Trust Or Not To Trust A Classifier](https://alphaxiv.org/abs/1805.11783)
- [Decision support systems that abstain — user study](https://arxiv.org/pdf/2309.05443)
- [Explainable Multimodal Framework for Real-Time Bitcoin Forecasting](https://dl.acm.org/doi/10.1145/3777490.3777508) · [Fin-Analyst hybrid trading agent](https://arxiv.org/pdf/2607.12233) · [HybridSwingNet](https://www.nature.com/articles/s41598-026-63497-w_reference.pdf)
- [StockBench](https://arxiv.org/pdf/2510.02209) · [Look-Ahead-Bench](https://arxiv.org/html/2601.13770v1) · [Agent Market Arena](https://www.alphaxiv.org/abs/2510.11695v1) · [Reliable evaluation of LLM financial multi-agent systems](https://arxiv.org/html/2603.27539v1) · [Agentic Trading survey](https://arxiv.org/html/2605.19337v1)
- [Numerical vs verbal explanations and reliance](https://arxiv.org/abs/2302.02187v3) · [Explanation depth in personal finance apps (thesis)](https://repository.tudelft.nl/file/File_7bd8e903-30a9-4c2b-ae72-0620d680a081) · [Performance pressure and AI-assisted decisions](https://arxiv.org/html/2410.16560v1) · [High-uncertainty decisions and logic style](https://cris.maastrichtuniversity.nl/en/publications/supporting-high-uncertainty-decisions-through-ai-and-logic-style-/)
- [Open-source financial AI agent platform](https://arxiv.org/html/2405.14767v1)
- [Structured outputs in production](https://tianpan.co/blog/2025-10-29-structured-outputs-llm-production) · [Semantic validation layer](https://tianpan.co/blog/2026-04-15-semantic-validation-llm-outputs)

근거 등급: 대부분 초록 · 요약 수준에서 읽었다(전문 미확인 — 표시한 수치는 그 출처가 보고한 값). 학위 논문 · 블로그는 [약].
