import { logger } from "../../../shared/config/logger";

import {
  AGENT_EVENT_LABEL,
  AGENT_LIMITS,
  AGENT_RECENT_EVENT_DAYS,
  agentEventMenu,
  acceptAgentCalls,
  agentCallKey,
  agentEntityId,
  defaultAgentPlan,
  documentFacts,
  forecastCardFacts,
  neighborFacts,
  numberAgentFacts,
  parseAgentEntity,
  parseAgentPlan,
  reactionFacts,
  type AgentAsset,
  type AgentPlanner,
  type AgentToolCall,
  type AgentToolFact,
  type AgentToolReader,
  type CoachExplanationInput,
} from "../../domain";

export interface AgentGatherDeps {
  reader: AgentToolReader;
  /** 없으면 정해 둔 한 바퀴(`defaultAgentPlan`) */
  planner?: AgentPlanner;
}

export interface AgentTrace {
  /** 누가 골랐나 — 모델(왕복 수, 0 = 모델이 "부를 것 없음") · 정해 둔 한 바퀴(모델 실패 · 못 읽는 답 · 전부 버림) */
  plannedBy: "model" | "default";
  rounds: number;
  calls: AgentToolCall[];
  /** 모델이 냈는데 검사가 버린 호출 수(지어낸 대상 · 메뉴 밖 종류 · 중복 · 상한) */
  rejected: number;
  failedCalls: number;
}

/**
 * 에이전트 도구 모으기(O3 · `SRV-REQ-059` FR-2 · 3) — 고르기(모델) → 도구 부르기(서버) → 사실 줄. 왕복 ≤ 2 · 호출 ≤ 4.
 * 1회차에 이웃을 부르면 2회차 대상에 이웃 종목이 열린다(이웃의 문서 · 전망 · 반응). 도구 하나가 실패해도 나머지로 간다.
 * 사실이 0이면 입력을 그대로 돌려준다 — 해설은 기존 재료로(FR-5 빈칸 0). **트랜잭션 밖**(고르기 LLM 수 초).
 * 도구 호출은 하나씩(연결 풀 — `workers-external.md`)
 */
export const gatherAgentFacts = async (
  deps: AgentGatherDeps,
  input: CoachExplanationInput,
  asset: AgentAsset,
  now: Date,
  options: { geminiAllowed: boolean }
): Promise<{ input: CoachExplanationInput; trace: AgentTrace }> => {
  const entity = agentEntityId(asset, input.symbol);
  // 반응 도구 메뉴 — 최근 이 종목에 실제로 일어난 사건 중 반응 통계가 있는 종류만(없으면 반응 도구를 못 고른다)
  const since = new Date(now.getTime() - AGENT_RECENT_EVENT_DAYS[input.mode] * 86_400_000);
  const [withStats, recent] = await Promise.all([
    deps.reader.eventKinds(input.symbol, asset).catch(() => [] as string[]),
    deps.reader.recentEvents(entity, since, now).catch(() => []),
  ]);
  const menu = agentEventMenu(recent, new Set(withStats));
  const kinds = menu.map((m) => m.kind);
  const occurred = new Map(menu.map((m) => [m.kind, m.occurredAt]));
  const names = new Map<string, string>([[entity, input.koreanName]]);
  const facts: Omit<AgentToolFact, "id">[] = [];
  const done = new Set<string>();
  const trace: AgentTrace = { plannedBy: "model", rounds: 0, calls: [], rejected: 0, failedCalls: 0 };

  const run = async (call: AgentToolCall): Promise<void> => {
    const target = parseAgentEntity(call.entity);
    if (!target) return;
    const name = names.get(call.entity) ?? target.symbol;
    try {
      if (call.tool === "get_forecast_card") {
        facts.push(...forecastCardFacts(name, await deps.reader.forecastCards(target.symbol, target.asset, now)));
      } else if (call.tool === "get_neighbors") {
        const rows = await deps.reader.neighbors(call.entity, AGENT_LIMITS.neighborDepth, now);
        facts.push(...neighborFacts(name, rows));
        // 2회차 대상 — 같이 언급 많은 순 · 같은 업종 종목(종목만, 시장 전체 제외)
        rows
          .filter((r) => r.kind === "asset" && parseAgentEntity(r.entity))
          .slice(0, 6)
          .forEach((r) => names.set(r.entity, r.name));
      } else if (call.tool === "get_event_reactions" && call.eventKind) {
        const at = occurred.get(call.eventKind);
        // 사건은 이 종목에 일어난 것 — 이웃 종목으로 반응을 부르면 그 종목엔 사건 날짜가 없다(버린다)
        if (at && call.entity === entity) {
          facts.push(...reactionFacts(call.eventKind, at, target.asset, name, await deps.reader.eventReactions(call.eventKind, target.symbol, target.asset)));
        }
      } else if (call.tool === "get_documents") {
        const since = new Date(now.getTime() - AGENT_LIMITS.documentDays * 86_400_000);
        facts.push(...documentFacts(name, await deps.reader.documents(call.entity, since, now, AGENT_LIMITS.linesPerCall)));
      }
    } catch (error) {
      trace.failedCalls += 1;
      logger.warn(`에이전트 도구 실패 — ${call.tool} ${call.entity}: ${(error as Error).message}`);
    }
  };

  for (let round = 1; round <= AGENT_LIMITS.rounds; round++) {
    const remaining = AGENT_LIMITS.calls - trace.calls.length;
    if (remaining <= 0) break;
    let calls: AgentToolCall[] = [];
    // 고르기 실패 = 모델 오류 · 못 읽는 답 · 낸 호출이 전부 버려짐. 읽었는데 빈 목록 = "부를 것 없음"(부르지 않는다)
    let failed = !deps.planner;
    if (deps.planner) {
      const raw = await deps.planner
        .plan(
          {
            koreanName: input.koreanName,
            entity,
            mode: input.mode,
            evidence: input.evidence,
            entities: [...names].map(([id, name]) => ({ id, name })),
            eventKinds: menu.map((m) => ({ kind: m.kind, label: `${AGENT_EVENT_LABEL[m.kind]!} — ${m.occurredAt.toISOString().slice(0, 10)} 이 종목에 있었음` })),
            found: facts.map((f) => f.text),
            remainingCalls: remaining,
          },
          options
        )
        .then(parseAgentPlan)
        .catch(() => null);
      if (raw === null) failed = true;
      else {
        calls = acceptAgentCalls(raw, { entities: new Set(names.keys()), eventKinds: new Set(kinds), done, remaining });
        trace.rejected += raw.length - calls.length;
        if (raw.length > 0 && calls.length === 0) failed = true;
      }
    }
    if (calls.length === 0) {
      // 1회차 고르기 실패면 정해 둔 한 바퀴. "부를 것 없음" · 2회차 빈 답이면 끝
      if (round > 1 || !failed) break;
      calls = defaultAgentPlan(entity, kinds).slice(0, remaining);
      trace.plannedBy = "default";
    }
    trace.rounds = round;
    for (const call of calls) {
      done.add(agentCallKey(call));
      trace.calls.push(call);
      await run(call);
    }
    if (trace.plannedBy === "default") break;
  }

  const numbered = numberAgentFacts(facts);
  return { input: numbered.length > 0 ? { ...input, tools: { facts: numbered } } : input, trace };
};
