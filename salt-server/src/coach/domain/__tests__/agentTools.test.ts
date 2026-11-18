import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  acceptAgentCalls,
  agentEventMenu,
  defaultAgentPlan,
  documentFacts,
  explanationFactCatalog,
  citeSentence,
  forecastCardFacts,
  neighborFacts,
  numberAgentFacts,
  parseAgentPlan,
  reactionFacts,
  verifyExplanation,
  type AgentForecastCardRow,
  type AgentPlanRequest,
  type AgentToolFact,
  type CoachExplanation,
  type CoachExplanationInput,
} from "..";
import { explanationFixtures } from "./fixtures/explanationFixtures";

/**
 * 에이전트 도구 규칙(O3 · `SRV-REQ-059` · `FC-REQ-023`). 수용 기준:
 * ① 숫자 대조 변이 — 도구 결과에 없는 숫자를 넣으면 그 문장이 탈락 ③ 개인 금액 필드가 프롬프트 입력 타입에 없다
 */
const T = new Date("2026-11-18T01:00:00Z");
const SELF = "asset:kr:005930";
const PEER = "asset:kr:000660";

describe("고르기 검사 — 닫힌 집합 밖은 버린다", () => {
  const ctx = { entities: new Set([SELF, PEER]), eventKinds: new Set(["earnings"]), done: new Set<string>(), remaining: 4 };

  it("모르는 도구 · 지어낸 대상 · 메뉴 밖 사건 종류 · 같은 호출 두 번을 버린다", () => {
    const got = acceptAgentCalls(
      [
        { tool: "get_documents", entity: SELF },
        { tool: "place_order", entity: SELF },
        { tool: "get_documents", entity: "asset:kr:999999" },
        { tool: "get_event_reactions", entity: SELF, event_kind: "made_up" },
        { tool: "get_event_reactions", entity: SELF },
        { tool: "get_documents", entity: SELF },
        { tool: "get_event_reactions", entity: SELF, event_kind: "earnings" },
      ],
      ctx
    );
    assert.deepEqual(got, [
      { tool: "get_documents", entity: SELF },
      { tool: "get_event_reactions", entity: SELF, eventKind: "earnings" },
    ]);
  });

  it("남은 호출 수를 넘지 않는다 · 앞 왕복에서 부른 것은 다시 안 부른다", () => {
    const raw = [
      { tool: "get_neighbors", entity: SELF },
      { tool: "get_documents", entity: SELF },
      { tool: "get_documents", entity: PEER },
    ];
    assert.equal(acceptAgentCalls(raw, { ...ctx, remaining: 1 }).length, 1);
    assert.deepEqual(acceptAgentCalls(raw, { ...ctx, done: new Set([`get_neighbors|${SELF}|`]) })[0], { tool: "get_documents", entity: SELF });
  });

  it("답 원문 — 앞뒤 말 · 코드 울타리를 벗겨 읽는다. 못 읽으면 null(실패), 빈 목록은 [](부를 것 없음)", () => {
    assert.equal(parseAgentPlan('```json\n{"calls":[{"tool":"get_neighbors","entity":"x"}]}\n```')!.length, 1);
    assert.equal(parseAgentPlan("모르겠어요"), null);
    assert.equal(parseAgentPlan('{"calls": "nope"}'), null);
    assert.deepEqual(parseAgentPlan('{"calls": []}'), []);
  });

  it("반응 메뉴 — 최근 이 종목에 일어난 사건 중 통계가 있는 종류만, 같은 종류는 가장 최근 날짜", () => {
    const d = (s: string) => new Date(s);
    const menu = agentEventMenu(
      [
        { kind: "kr_earnings", observedAt: d("2026-11-10T00:00:00Z") },
        { kind: "kr_ir", observedAt: d("2026-11-12T00:00:00Z") },
        { kind: "fomc", observedAt: d("2026-11-12T00:00:00Z") },
      ],
      new Set(["earnings", "ir", "contract"])
    );
    assert.deepEqual(
      menu.map((m) => [m.kind, m.occurredAt.toISOString().slice(0, 10)]),
      [
        ["earnings", "2026-11-10"],
        ["ir", "2026-11-12"],
      ]
    );
    // 사건이 없으면 통계가 있어도 메뉴 0 — 사건 없는 날 과거 통계를 끼워 넣지 않는다(A/B ② 3 : 17)
    assert.deepEqual(agentEventMenu([], new Set(["earnings", "contract"])), []);
  });

  it("고르기가 실패하면 정해 둔 한 바퀴 — 사건 종류가 없으면 셋", () => {
    assert.equal(defaultAgentPlan(SELF, ["earnings"]).length, 4);
    assert.equal(defaultAgentPlan(SELF, []).length, 3);
  });
});

describe("도구 결과 → 사실 줄", () => {
  const card = (over: Partial<AgentForecastCardRow> = {}): AgentForecastCardRow => ({
    horizonWeeks: 1,
    pUp: 0.56,
    q05: -0.085,
    q95: 0.089,
    sample: 40,
    directionCalls: 14,
    directionHits: 10,
    alwaysUpRate: 0.54,
    missCount: 2,
    modelVersion: "m@1",
    asOf: T,
    ...over,
  });

  it("전망 카드는 3종(채점 이력 · 기준 대비 · 빗나간 수)이 다 있을 때만 · 가장 짧은 기간", () => {
    const [f] = forecastCardFacts("삼성전자", [card({ horizonWeeks: 2 }), card()]);
    assert.match(f!.text, /^삼성전자 1주 전망: 오를 확률 56% · 90% 구간 -8\.1% ~ \+9\.3% \(방향 판정 14번 중 10번 맞음 · 같은 기간 늘 오른다 54% · 구간 밖 2번\)$/);
    assert.deepEqual(forecastCardFacts("삼성전자", [card({ missCount: null })]), []);
    assert.deepEqual(forecastCardFacts("삼성전자", [card({ alwaysUpRate: null })]), []);
    assert.deepEqual(forecastCardFacts("삼성전자", [card({ directionCalls: 0 })]), []);
  });

  it("사건 반응 — 사건 날짜가 앞 · 종목 범위가 있으면 그것, 없으면 시장 · 크기 구분 행은 쓰지 않는다 · 이름 없는 종류는 0줄", () => {
    const base = { family: "event_window" as const, eventKind: "earnings", sourceKey: "event-window@2", asOf: T, baseUpRate: 0.45 };
    const market = [
      { ...base, scope: "market" as const, scopeKey: "kr", variant: "all", horizon: 5, sample: 259, upRate: 0.47 },
      { ...base, scope: "market" as const, scopeKey: "kr", variant: "high", horizon: 1, sample: 84, upRate: 0.54 },
    ];
    const [m] = reactionFacts("earnings", T, "kr", "삼성전자", market);
    assert.equal(m!.text, "11월 18일 삼성전자 실적 공시 — 과거 같은 사건 뒤 국내 종목 전체 5거래일 오른 비율 47%(표본 259건 · 평소 45%)");
    const own = { ...base, family: "earnings" as const, eventKind: "earnings", scope: "symbol" as const, scopeKey: "005930", variant: null, horizon: 1, sample: 24, upRate: 0.58, baseUpRate: null };
    assert.match(reactionFacts("earnings", T, "kr", "삼성전자", [...market, own])[0]!.text, /이 종목 1거래일 오른 비율 58%\(표본 24건\)$/);
    assert.deepEqual(reactionFacts("made_up", T, "kr", "삼성전자", market), []);
  });

  it("이웃 — 같이 언급 3건 이상만(많은 순) · 같은 업종 나열 · 시장 전체는 싣지 않는다 · 조사", () => {
    const at = T;
    const row = (entity: string, name: string, viaPredicate: string, sharedDocuments: number, kind = "asset") => ({
      entity, kind, name, hop: 2, viaPredicate, sharedDocuments, sourceKind: "m", availableAt: at,
    });
    const facts = neighborFacts("삼성전자", [
      row("asset:market:kr:KOSPI", "KOSPI", "belongs_to", 50),
      row(PEER, "SK하이닉스", "belongs_to", 41),
      row("asset:kr:030200", "KT", "mentions", 9),
      row("asset:kr:009150", "삼성전기", "belongs_to", 2),
      row("sector:kr:0013", "업종 0013", "belongs_to", 0, "sector"),
    ]);
    assert.deepEqual(facts.map((f) => f.text), ["최근 30일 삼성전자와 같이 언급된 종목: SK하이닉스(41건) · KT(9건)"]);
    assert.deepEqual(neighborFacts("삼성전자", [row("asset:kr:009150", "삼성전기", "belongs_to", 2)]), []);
  });

  it("문서 — 제목 줄은 뉴스 칸 사실 · 출처 주소 · 시각이 같이", () => {
    const [d] = documentFacts("삼성전자", [
      { document: "document:dart:1", title: "주요사항보고서", predicate: "issued", sourceKind: "dart_filing", observedAt: T, availableAt: T, sourceUrl: "https://dart.fss.or.kr/x" },
    ]);
    assert.equal(d!.news, true);
    assert.equal(d!.text, "11월 18일 삼성전자 공시: 주요사항보고서");
    assert.deepEqual(d!.source, { name: "DART 공시", url: "https://dart.fss.or.kr/x", at: T.toISOString() });
  });

  it("번호 · 같은 글 하나로 · 합 상한 8", () => {
    const f = { tool: "get_neighbors" as const, news: false, source: { name: "s", url: null, at: null } };
    const many = Array.from({ length: 12 }, (_, i) => ({ ...f, text: `줄 ${i % 10}` }));
    const got = numberAgentFacts(many);
    assert.equal(got.length, 8);
    assert.deepEqual(got.map((g) => g.id).slice(0, 2), ["tool-1", "tool-2"]);
  });
});

describe("숫자 대조 변이(수용 기준 ①) — 도구 결과에 없는 숫자는 탈락", () => {
  const base = explanationFixtures(1)[0]!;
  const tool = (over: Partial<AgentToolFact>): AgentToolFact => ({
    id: "tool-1",
    tool: "get_event_reactions",
    news: false,
    text: "11월 10일 삼성전자 실적 공시 — 과거 같은 사건 뒤 국내 종목 전체 5거래일 오른 비율 47%(표본 259건 · 평소 45%)",
    source: { name: "사건 반응 통계(event-window@2)", url: null, at: T.toISOString() },
    ...over,
  });
  const input: CoachExplanationInput = {
    ...base,
    tools: {
      facts: [
        tool({}),
        tool({ id: "tool-2", tool: "get_documents", news: true, text: "11월 18일 소식: 반도체 수출 32% 증가", source: { name: "한국투자증권 시황", url: null, at: T.toISOString() } }),
      ],
    },
  };
  const llm = (keyDrivers: string[], newsSummary: string[] = []): CoachExplanation => ({
    modeReasoning: "",
    timeframe: "",
    keyDrivers,
    risks: [],
    newsSummary,
    generatedAt: T.toISOString(),
    cached: false,
  });

  it("도구 숫자를 그대로 옮긴 근거는 남고 그 도구로 인용된다", () => {
    const line = "과거 실적 공시 뒤 5거래일 오른 비율은 47%로 평소 45%와 비슷했어요.";
    const v = verifyExplanation(llm([line]), input, T);
    assert.deepEqual(v.explanation.keyDrivers, [line]);
    assert.equal(v.dropped.length, 0);
    const cites = citeSentence("keyDrivers", line, explanationFactCatalog(input, T));
    assert.ok(cites.some((c) => c.id === "tool-1" && c.label === "사건 반응 통계(event-window@2)"));
  });

  it("숫자가 앞쪽 사실과 우연히 겹쳐도 글로 옮긴 도구 사실이 인용 상한(3) 안에 든다", () => {
    // 2026-11-18 실측 — 시세 · 원인 칩 셋이 상한을 채워 도구 칩이 잘렸다
    const crowded: CoachExplanationInput = {
      ...input,
      cause: {
        strength: "possible",
        headline: "업종 동반 상승",
        note: "",
        evidence: [
          { value: "업종 9종목 중 5종목", compare: null, source: "업종" },
          { value: "표본 20일 평균의 45%", compare: null, source: "수급" },
          { value: "평소 47% 수준", compare: null, source: "시세" },
        ],
        result: "오늘 +0.5%",
      },
    };
    const line = "과거 실적 공시 뒤 5거래일 오른 비율 47%(표본 259건 · 평소 45%)로 집계돼 있어요.";
    const cites = citeSentence("keyDrivers", line, explanationFactCatalog(crowded, T));
    assert.equal(cites[0]!.id, "tool-1");
  });

  it("같은 문장에 도구 결과에 없는 숫자(62%)를 넣으면 탈락", () => {
    const v = verifyExplanation(llm(["과거 실적 공시 뒤 5거래일 오른 비율은 62%였어요."]), input, T);
    assert.equal(v.dropped.length, 1);
    assert.ok(!v.explanation.keyDrivers.some((s) => s.includes("62%")));
  });

  it("도구가 없으면 같은 문장(47%)도 탈락 — 허용 숫자는 도구 결과에서 온다", () => {
    const v = verifyExplanation(llm(["과거 실적 공시 뒤 5거래일 오른 비율은 47%였어요."]), { ...input, tools: undefined }, T);
    assert.equal(v.dropped.length, 1);
  });

  it("제목 줄 숫자(32%)는 뉴스 칸에서만 — 근거 칸이면 탈락", () => {
    const inDriver = verifyExplanation(llm(["반도체 수출이 32% 늘었어요."]), input, T);
    assert.equal(inDriver.dropped.length, 1);
    const inNews = verifyExplanation(llm([], ["반도체 수출이 32% 늘었다는 소식이 있어요."]), input, T);
    assert.equal(inNews.dropped.length, 0);
  });
});

/** 수용 기준 ③ — 개인 금액(보유 수량 · 평단 · 원화 손익) 필드가 프롬프트로 가는 입력 타입에 없다(컴파일 시점 + 소스) */
type PersonalAmount =
  | "quantity"
  | "avgPrice"
  | "averagePrice"
  | "avgBuyPrice"
  | "costBasis"
  | "pnl"
  | "profitKrw"
  | "unrealizedPnl"
  | "holding"
  | "holdings"
  | "position";
type Leak<T> = Extract<keyof T, PersonalAmount>;
const noPersonalAmount: [Leak<CoachExplanationInput>, Leak<AgentPlanRequest>, Leak<AgentToolFact>] extends [never, never, never]
  ? true
  : false = true;

describe("개인 금액 0(수용 기준 ③)", () => {
  it("해설 입력 · 고르기 요청 · 도구 사실 타입에 개인 금액 필드가 없다", () => {
    assert.equal(noPersonalAmount, true);
  });

  it("에이전트 코드(규칙 · 고르기 프롬프트 · 리더 · 모으기)가 보유 · 평단 · 손익을 읽지 않는다", () => {
    const root = path.resolve(__dirname, "../..");
    const files = [
      "domain/policy/agentTools.ts",
      "infrastructure/LlmAgentPlanner.ts",
      "infrastructure/PrismaAgentToolReader.ts",
      "application/lib/agentGather.ts",
    ];
    for (const f of files) {
      const src = readFileSync(path.join(root, f), "utf8");
      assert.doesNotMatch(src, /\b(avgPrice|averagePrice|avgBuyPrice|costBasis|unrealizedPnl|profitKrw|holdings?|portfolio)\b/, f);
    }
  });
});
