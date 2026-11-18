import { AGENT_LIMITS, type AgentPlanner, type AgentPlanRequest, type ExplainProvider, type LlmUsageStore } from "../domain";
import type { LocalCliGate } from "./localCliGate";
import type { runCli } from "./localCliProcess";
import { OneShotLlm } from "./oneShotLlm";

type LocalProvider = Exclude<ExplainProvider, "gemini">;

/**
 * 에이전트 고르기 프롬프트(O3 · `SRV-REQ-059`) — 판은 `AGENT_PLAN_PROMPT_VERSION`(바꾸면 올린다).
 * 모델은 **도구를 고르기만** 한다. 도구는 서버가 부른다 — 로컬 CLI 는 도구 0 · 빈 폴더 격리 그대로(`ddd-infrastructure.md` §6).
 * 숫자를 쓰지 않고, 대상 · 사건 종류는 주어진 목록에서만(지어낸 것은 도메인 `acceptAgentCalls` 가 버린다)
 */
export const AGENT_PLAN_PROMPT_VERSION = "agent-plan@2"; // @2 2026-11-18 — 반응 도구는 최근 이 종목에 있었던 사건만 · 판단과 무관한 호출 금지(A/B ② 3 : 17)

export const AGENT_PLAN_SYSTEM_INSTRUCTION = [
  "너는 종목 해설에 붙일 사실을 찾으려고 도구를 고르는 도우미다. 답은 JSON 하나뿐이다.",
  '모양: {"calls": [{"tool": 도구 이름, "entity": 대상 id, "event_kind": 사건 종류 또는 null}]}',
  "도구:",
  "- get_forecast_card(entity) — 그 종목의 채점 통과한 주간 전망(오를 확률 · 90% 구간 · 과거 적중). 없으면 빈 결과",
  "- get_neighbors(entity) — 최근 30일 같이 언급된 종목(3건 이상)",
  "- get_event_reactions(entity, event_kind) — 최근 이 종목에 있었던 사건 뒤 과거 같은 사건의 반응 통계(오른 비율 · 표본). 사건 종류 목록이 비면 쓰지 않는다",
  "- get_documents(entity) — 최근 30일 그 종목 공시 · 소식 제목",
  "규칙:",
  "1. entity 와 event_kind 는 주어진 목록에 있는 값만 그대로 쓴다. 목록에 없으면 그 호출을 쓰지 않는다.",
  "2. 이 판단이 왜 나왔는지 설명하는 데 직접 도움이 될 것만, 가장 도움이 될 것부터 쓴다. 관련 없으면 부르지 않는다 — 다 부를 필요가 없다. 이미 찾은 사실과 같은 것을 다시 부르지 않는다.",
  "3. 더 부를 것이 없으면 {\"calls\": []}.",
  "4. 설명 · 코드 울타리 · 숫자 없이 JSON 만 출력한다.",
].join("\n");

export const buildAgentPlanPrompt = (r: AgentPlanRequest): string =>
  [
    `종목: ${r.koreanName} (id ${r.entity}) · 관점: ${r.mode === "scalp" ? "단타(24시간)" : "장기"}`,
    "",
    "지금 판단 근거:",
    ...r.evidence.map((e) => `- ${e.label}: ${e.value}`),
    "",
    "고를 수 있는 대상(entity):",
    ...r.entities.map((e) => `- ${e.id} (${e.name})`),
    "",
    "고를 수 있는 사건 종류(event_kind):",
    ...(r.eventKinds.length ? r.eventKinds.map((k) => `- ${k.kind} (${k.label})`) : ["- (없음)"]),
    ...(r.found.length ? ["", "이미 찾은 사실:", ...r.found.map((f) => `- ${f}`)] : []),
    "",
    `부를 수 있는 호출: 최대 ${r.remainingCalls}개`,
    "JSON:",
  ].join("\n");

/** 고르기 모델 — 사실 추출과 같은 한 번 부르기(로컬 CLI → Gemini · 같은 게이트). 원장 용도 `agent_plan` */
export class LlmAgentPlanner implements AgentPlanner {
  private readonly llm: OneShotLlm;

  constructor(
    usage: LlmUsageStore | null,
    options: { localModel?: string; run?: typeof runCli; gate?: LocalCliGate } = {}
  ) {
    this.llm = new OneShotLlm(
      { purpose: "agent_plan", system: AGENT_PLAN_SYSTEM_INSTRUCTION, dirPrefix: "salt-agent-", maxOutputTokens: 400 },
      usage,
      options
    );
  }

  useLocal(local: { provider: LocalProvider; bin: string } | null): void {
    this.llm.useLocal(local);
  }

  async plan(request: AgentPlanRequest, options: { geminiAllowed: boolean }): Promise<string> {
    const { output } = await this.llm.call(buildAgentPlanPrompt({ ...request, remainingCalls: Math.min(request.remainingCalls, AGENT_LIMITS.calls) }), options);
    return output;
  }
}
