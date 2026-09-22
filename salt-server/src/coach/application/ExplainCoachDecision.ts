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

    const explanation = await this.explainer.explain(input, signal);

    return {
      ...explanation,
      // 면책은 판단 경로와 같은 문장이다 — 모델이 쓴 면책은 쓰지 않는다
      disclaimer: JUDGMENT_DISCLAIMER,
      renderable: true,
      validity: view.judgment.validity,
      trackRecord: view.trackRecord,
      failureCases: view.failureCases,
    };
  }
}
