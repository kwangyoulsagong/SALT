import {
  templateExplanation,
  verifyExplanation,
  type ExplanationSource,
} from "../domain";
import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
  JudgmentBlockedReason,
  MarketProbe,
  PortfolioProbe,
  SymbolJudgmentStore,
} from "../domain";
import { collectJudgmentMaterials, judgeSymbol } from "./lib/judgeSymbols";
import {
  attachJudgmentTrack,
  JUDGMENT_DISCLAIMER,
  type ModeCoachView,
} from "./lib/judgmentTrack";

/**
 * 해설 결과 (`SRV-REQ-025` FR-50 · FR-51).
 *
 * 렌더되는 해설에는 3종(근거 · 성적표 · 실패사례)이 **같이 실린다** — 해설 카드가 판단 카드와
 * 따로 떠도 공통 수용 기준 1 을 혼자 지킨다. 막히면 **LLM 을 부르지 않았다**는 뜻이다.
 */
export type ExplainResult =
  | (CoachExplanation & {
      renderable: true;
      /**
       * 문장 출처(추가 필드, 2026-09-24). `llm` — 검증 통과 · `llm_checked` — 일부 문장을 걸러 템플릿으로 채움 ·
       * `template` — LLM 실패, 전부 템플릿. 화면은 `template` 에 "규칙 기반 설명" 배지를 단다(FEATURE-004 UX Degraded)
       */
      source: ExplanationSource;
      /** 걸러낸 문장 수(말투 · 지어낸 숫자). 관측용 */
      droppedSentences: number;
      validity: ModeCoachView["judgment"]["validity"];
      trackRecord: ModeCoachView["trackRecord"];
      failureCases: ModeCoachView["failureCases"];
    })
  | { renderable: false; blockedReason: JudgmentBlockedReason };

/**
 * 판단 해설 생성 (LLM).
 *
 * 숫자는 요청이 들고 오고 모델은 **문장만** 만든다. 해설이 판단을 바꾸지 않는다 —
 * 점수 · 행동 · 근거는 이미 정해져 있다.
 *
 * ## 먼저 게이트를 본다 (FR-50)
 *
 * 요청 종목 · 모드의 판단이 3종 게이트를 못 넘으면 **LLM 을 부르지 않고** `renderable: false` 를
 * 200 으로 준다. 화면도 같은 게이트로 버튼을 숨기지만, 뷰모델이 낡았거나 다른 소비처가 부르면
 * 게이트를 못 넘은 판단에 대한 문장이 비용을 들여 만들어진다. 판정은 종목 경로
 * (`GetSymbolCoach`)와 **같은 함수**(`judgeSymbol` · `attachJudgmentTrack`)로 한다.
 *
 * 트랜잭션을 열지 않는다 — LLM 호출이 수 초~수십 초다(`ddd-application.md` §3).
 */
export class ExplainCoachDecision {
  constructor(
    private readonly explainer: CoachExplainer,
    private readonly market: MarketProbe,
    private readonly portfolio: PortfolioProbe,
    private readonly judgments: SymbolJudgmentStore
  ) {}

  async execute(
    userId: string,
    input: CoachExplanationInput,
    signal?: AbortSignal
  ): Promise<ExplainResult> {
    const symbol = input.symbol.toUpperCase();

    const [materialsBySymbol, holding] = await Promise.all([
      collectJudgmentMaterials(this.market, [symbol]),
      this.portfolio.getHolding(userId, symbol),
    ]);
    const judged = judgeSymbol(
      symbol,
      materialsBySymbol.get(symbol)!,
      Boolean(holding)
    );
    const decision = input.mode === "scalp" ? judged.scalp : judged.longTerm;
    const view = await attachJudgmentTrack(this.judgments, decision);

    if (!view.renderable) {
      return { renderable: false, blockedReason: view.blockedReason! };
    }

    // LLM 문장은 그대로 믿지 않는다 — 문장마다 말투 · 숫자를 검사하고 걸린 칸은 템플릿으로 채운다.
    // LLM 이 실패하면 전부 템플릿이다(중단은 제외 — 화면이 떠났으면 만들 이유가 없다).
    let verified: { explanation: CoachExplanation; source: ExplanationSource; dropped: unknown[] };
    try {
      const llm = await this.explainer.explain(input, signal);
      verified = verifyExplanation(llm, input, new Date());
    } catch (error) {
      if (signal?.aborted) throw error;
      verified = { explanation: templateExplanation(input, new Date()), source: "template", dropped: [] };
    }
    const explanation = verified.explanation;

    return {
      ...explanation,
      source: verified.source,
      droppedSentences: verified.dropped.length,
      // 면책은 판단 경로와 같은 문장이다 — 모델이 쓴 면책은 쓰지 않는다
      disclaimer: JUDGMENT_DISCLAIMER,
      renderable: true,
      validity: view.judgment.validity,
      trackRecord: view.trackRecord,
      failureCases: view.failureCases,
    };
  }
}
