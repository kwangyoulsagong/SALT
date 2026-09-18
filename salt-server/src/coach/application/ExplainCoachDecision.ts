import type {
  CoachExplainer,
  CoachExplanation,
  CoachExplanationInput,
} from "../domain";

/**
 * 판단 해설 생성 (LLM).
 *
 * 숫자는 요청이 들고 오고 모델은 **문장만** 만든다. 이 유스케이스가 얇은 이유는
 * 해설이 판단을 바꾸지 않기 때문이다 — 점수·행동·근거는 이미 정해져 있고,
 * 해설이 실패해도 추천은 그대로 답해진다.
 *
 * 트랜잭션을 열지 않는다 — LLM 호출이 수 초~수십 초다(`ddd-application.md` §3).
 */
export class ExplainCoachDecision {
  constructor(private readonly explainer: CoachExplainer) {}

  execute(input: CoachExplanationInput): Promise<CoachExplanation> {
    return this.explainer.explain(input);
  }
}
