import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AgentPlanner, AgentPlanRequest, AgentToolReader } from "../../domain";
import { explanationFixtures } from "../../domain/__tests__/fixtures/explanationFixtures";
import { gatherAgentFacts } from "../lib/agentGather";

/**
 * 에이전트 왕복(O3 · `SRV-REQ-059` FR-2 · 3 · 5) — 고르기 → 서버가 도구 부르기 → 사실 줄. 왕복 ≤ 2 · 호출 ≤ 4,
 * 2회차에만 이웃 종목이 대상으로 열린다, 고르기가 실패하면 정해 둔 한 바퀴, 도구 하나 실패는 나머지로 간다
 */
const T = new Date("2026-11-18T01:00:00Z");
const base = { ...explanationFixtures(1)[0]!, symbol: "005930", koreanName: "삼성전자" };
const SELF = "asset:kr:005930";
const PEER = "asset:kr:000660";

const reader = (calls: string[], over: Partial<AgentToolReader> = {}): AgentToolReader => ({
  forecastCards: async (s) => {
    calls.push(`card:${s}`);
    return [];
  },
  neighbors: async (e, depth) => {
    calls.push(`neighbors:${e}:${depth}`);
    return [{ entity: PEER, kind: "asset", name: "SK하이닉스", hop: 2, viaPredicate: "mentions", sharedDocuments: 41, sourceKind: "kr_news_title", availableAt: T }];
  },
  eventKinds: async () => ["earnings"],
  recentEvents: async () => [{ kind: "kr_earnings", observedAt: new Date("2026-11-16T07:00:00Z") }],
  eventReactions: async (k, s) => {
    calls.push(`reactions:${k}:${s}`);
    return [{ family: "event_window", eventKind: "earnings", scope: "market", scopeKey: "kr", variant: "all", horizon: 5, sample: 259, upRate: 0.47, baseUpRate: 0.45, sourceKey: "event-window@2", asOf: T }];
  },
  documents: async (e) => {
    calls.push(`documents:${e}`);
    return [{ document: "document:dart:1", title: `${e} 주요사항보고서`, predicate: "issued", sourceKind: "dart_filing", observedAt: T, availableAt: T, sourceUrl: "https://dart.fss.or.kr/x" }];
  },
  ...over,
});

const planner = (answers: string[], seen: AgentPlanRequest[] = []): AgentPlanner => ({
  plan: async (r) => {
    seen.push(r);
    const a = answers.shift();
    if (a === undefined) throw new Error("no more");
    return a;
  },
});

describe("에이전트 왕복", () => {
  it("1회차 이웃 → 2회차 이웃의 문서 · 지어낸 대상은 버림 · 사실 줄이 입력 tools 로", async () => {
    const calls: string[] = [];
    const seen: AgentPlanRequest[] = [];
    const { input, trace } = await gatherAgentFacts(
      {
        reader: reader(calls),
        planner: planner(
          [
            JSON.stringify({ calls: [{ tool: "get_neighbors", entity: SELF }, { tool: "get_documents", entity: PEER }] }),
            JSON.stringify({ calls: [{ tool: "get_documents", entity: PEER }, { tool: "get_event_reactions", entity: SELF, event_kind: "earnings" }] }),
          ],
          seen
        ),
      },
      base,
      "kr",
      T,
      { geminiAllowed: true }
    );
    // 1회차엔 PEER 가 대상 목록에 없어 버림 → 2회차에 열림
    assert.deepEqual(calls, [`neighbors:${SELF}:2`, `documents:${PEER}`, "reactions:earnings:005930"]);
    assert.equal(trace.plannedBy, "model");
    assert.equal(trace.rounds, 2);
    assert.equal(trace.rejected, 1);
    assert.deepEqual(seen[1]!.entities.map((e) => e.id), [SELF, PEER]);
    assert.ok(seen[1]!.found.some((f) => f.includes("SK하이닉스(41건)")));
    assert.deepEqual(
      input.tools!.facts.map((f) => [f.id, f.tool]),
      [
        ["tool-1", "get_neighbors"],
        ["tool-2", "get_documents"],
        ["tool-3", "get_event_reactions"],
      ]
    );
    assert.match(input.tools!.facts[1]!.text, /^11월 18일 SK하이닉스 공시: asset:kr:000660 주요사항보고서$/);
  });

  it("모델이 \"부를 것 없음\"(빈 목록)이라 답하면 아무것도 부르지 않는다 — 정해 둔 한 바퀴는 실패 때만", async () => {
    const calls: string[] = [];
    const { input, trace } = await gatherAgentFacts(
      { reader: reader(calls), planner: planner([JSON.stringify({ calls: [] })]) },
      base,
      "kr",
      T,
      { geminiAllowed: true }
    );
    assert.deepEqual(calls, []);
    assert.equal(trace.plannedBy, "model");
    assert.equal(trace.rounds, 0);
    assert.equal(input, base);
  });

  it("최근 사건이 없으면 반응 도구를 부르지 않는다(정해 둔 한 바퀴에도 없다)", async () => {
    const calls: string[] = [];
    const { trace } = await gatherAgentFacts(
      { reader: reader(calls, { recentEvents: async () => [] }), planner: planner(["깨진 답"]) },
      base,
      "kr",
      T,
      { geminiAllowed: true }
    );
    assert.equal(trace.plannedBy, "default");
    assert.ok(!calls.some((c) => c.startsWith("reactions:")));
  });

  it("고르기가 실패하면 정해 둔 한 바퀴(전망 · 이웃 · 문서 · 반응) · 왕복 1", async () => {
    const calls: string[] = [];
    const { trace } = await gatherAgentFacts({ reader: reader(calls), planner: planner([]) }, base, "kr", T, { geminiAllowed: true });
    assert.equal(trace.plannedBy, "default");
    assert.equal(trace.rounds, 1);
    assert.deepEqual(calls, ["card:005930", `neighbors:${SELF}:2`, `documents:${SELF}`, "reactions:earnings:005930"]);
  });

  it("호출 합 4를 넘지 않는다", async () => {
    const calls: string[] = [];
    const many = JSON.stringify({
      calls: ["get_forecast_card", "get_neighbors", "get_documents", "get_event_reactions", "get_documents"].map((tool, i) => ({
        tool,
        entity: SELF,
        event_kind: i === 3 ? "earnings" : null,
      })),
    });
    const { trace } = await gatherAgentFacts({ reader: reader(calls), planner: planner([many, many]) }, base, "kr", T, { geminiAllowed: true });
    assert.equal(trace.calls.length, 4);
    assert.equal(calls.length, 4);
  });

  it("도구 하나가 실패해도 나머지 사실로 · 사실 0이면 입력 그대로(빈칸 0)", async () => {
    const calls: string[] = [];
    const broken = reader(calls, { neighbors: async () => Promise.reject(new Error("db")) });
    const { input, trace } = await gatherAgentFacts({ reader: broken, planner: planner([]) }, base, "kr", T, { geminiAllowed: true });
    assert.equal(trace.failedCalls, 1);
    assert.ok(input.tools!.facts.length >= 2);

    const empty: AgentToolReader = {
      forecastCards: async () => [],
      neighbors: async () => [],
      eventKinds: async () => [],
      recentEvents: async () => [],
      eventReactions: async () => [],
      documents: async () => [],
    };
    const out = await gatherAgentFacts({ reader: empty }, base, "kr", T, { geminiAllowed: true });
    assert.equal(out.input, base);
  });
});
