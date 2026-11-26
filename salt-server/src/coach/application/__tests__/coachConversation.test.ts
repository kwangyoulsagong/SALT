import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import type { CoachConversationRecord, CoachConversationStore, CoachMessageRecord } from "../../domain";
import { COACH_HISTORY_KEEP_DAYS, COACH_HISTORY_KEEP_QUESTIONS, CoachConversationNotFoundError } from "../../domain";
import type { BehaviorCoachView } from "../AnalyzeTradingBehavior";
import {
  AnswerCoachMessage,
  AskCoach,
  FailStaleCoachAnswers,
  GetCoachBriefing,
  ListCoachMessages,
  type CoachAnswerSources,
} from "../CoachConversation";
import type { RiskBudgetView } from "../ManageRiskBudget";
import type { ConversationCard } from "../lib/recommendationCard";

/**
 * 코치 대화 유스케이스(F006 · `SRV-REQ-028` FR-1~9 · 20~25 · `SRV-REQ-029` FR-3 · 4 · 28).
 * 저장은 메모리 가짜 — 조건부 UPDATE(`streaming` 일 때만)를 실제 어댑터와 같게 흉내 낸다.
 */

class MemoryStore implements CoachConversationStore {
  conversations: Array<CoachConversationRecord & { userId: string }> = [];
  messages: Array<CoachMessageRecord & { userId: string }> = [];
  private seq = 0;
  private id = () => `00000000-0000-4000-8000-${String(++this.seq).padStart(12, "0")}`;

  async ask(input: { userId: string; conversationId: string | null; title: string; question: string; at: Date }) {
    let conversation = input.conversationId ? this.conversations.find((c) => c.id === input.conversationId) : undefined;
    if (input.conversationId && (!conversation || conversation.userId !== input.userId)) return null;
    if (!conversation) {
      conversation = { id: this.id(), userId: input.userId, title: input.title, messageCount: 0, lastMessageAt: input.at, createdAt: input.at };
      this.conversations.push(conversation);
    }
    const base = { conversationId: conversation.id, userId: input.userId, intent: null, explanationSource: null, links: [], gaps: [], errorCode: null, card: null };
    const question = { ...base, id: this.id(), role: "user" as const, content: input.question, status: "complete" as const, createdAt: input.at };
    const answer = { ...base, id: this.id(), role: "assistant" as const, content: "", status: "streaming" as const, createdAt: new Date(input.at.getTime() + 1) };
    this.messages.push(question, answer);
    conversation.messageCount += 2;
    conversation.lastMessageAt = answer.createdAt;
    return { conversationId: conversation.id, questionId: question.id, answerId: answer.id };
  }
  async findMessage(userId: string, id: string) {
    return this.messages.find((m) => m.id === id && m.userId === userId) ?? null;
  }
  async findQuestionFor(answer: CoachMessageRecord) {
    return [...this.messages].reverse().find((m) => m.conversationId === answer.conversationId && m.role === "user" && m.createdAt < answer.createdAt) ?? null;
  }
  completeCalls = 0;
  insightIds = new Map<string, string | null>();
  async completeAnswer(
    id: string,
    answer: Pick<CoachMessageRecord, "content" | "intent" | "links" | "gaps" | "card"> & { explanationSource: "rule" | "llm"; insightId: string | null }
  ) {
    this.completeCalls += 1;
    const row = this.messages.find((m) => m.id === id);
    if (!row || row.status !== "streaming") return false;
    const { insightId, ...rest } = answer;
    // 저장소는 JSON 으로 복사한다 — 카드 원본이 나중에 바뀌어도 저장본은 그대로(DB-REQ-022 FR-14)
    Object.assign(row, rest, { card: rest.card ? JSON.parse(JSON.stringify(rest.card)) : null, status: "complete" });
    this.insightIds.set(id, insightId);
    return true;
  }
  async failAnswer(id: string, errorCode: string) {
    const row = this.messages.find((m) => m.id === id);
    if (row?.status === "streaming") Object.assign(row, { status: "failed", errorCode });
  }
  async failStale(olderThan: Date) {
    let n = 0;
    for (const row of this.messages) if (row.status === "streaming" && row.createdAt < olderThan) { Object.assign(row, { status: "failed", errorCode: "LLM_TIMEOUT" }); n += 1; }
    return n;
  }
  async listConversations(userId: string, limit: number) {
    return this.conversations.filter((c) => c.userId === userId).slice(0, limit);
  }
  async listMessages(userId: string, conversationId: string, limit: number) {
    if (!this.conversations.some((c) => c.id === conversationId && c.userId === userId)) return null;
    return this.messages.filter((m) => m.conversationId === conversationId).reverse().slice(0, limit);
  }
  async deleteConversation() {
    return false;
  }
  pruneFails = false;
  async recentQuestionTimes(userId: string, limit: number) {
    if (this.pruneFails) throw new Error("db down");
    return this.messages
      .filter((m) => m.userId === userId && m.role === "user")
      .map((m) => m.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())
      .slice(0, limit);
  }
  async deleteHistoryBefore(userId: string, before: Date) {
    const keep = (m: CoachMessageRecord & { userId: string }) => m.userId !== userId || m.createdAt >= before || m.status === "streaming";
    const removed = this.messages.filter((m) => !keep(m)).length;
    this.messages = this.messages.filter(keep);
    this.conversations = this.conversations.filter((c) => c.userId !== userId || this.messages.some((m) => m.conversationId === c.id));
    for (const c of this.conversations) c.messageCount = this.messages.filter((m) => m.conversationId === c.id).length;
    return removed;
  }
}

const riskView = (): RiskBudgetView =>
  ({
    settings: { perTradeMaxLossKrw: Money.krw(50_000) },
    totalValue: Money.krw(10_000_000),
    gauges: {
      drawdown: { status: "ok", budget: Money.krw(1_000_000), used: Money.krw(100_000) },
      concentration: { status: "exceeded", topSymbol: "BTC", topWeight: new Decimal("0.7"), limit: new Decimal("0.6") },
      btcBeta: { status: "ok", btcEquivalent: Money.krw(8_000_000) },
    },
  }) as unknown as RiskBudgetView;

const sources = (over: Partial<Record<keyof CoachAnswerSources, () => Promise<unknown>>> = {}) => {
  const calls = { riskBudget: 0, profitPlans: 0, behavior: 0, card: 0 };
  const wrap = <K extends keyof CoachAnswerSources>(key: K, fallback: () => Promise<unknown>) =>
    ({
      execute: async () => {
        calls[key] += 1;
        return (over[key] ?? fallback)();
      },
    }) as unknown as CoachAnswerSources[K];
  return {
    calls,
    sources: {
      riskBudget: wrap("riskBudget", async () => riskView()),
      profitPlans: wrap("profitPlans", async () => ({ plans: [] })),
      behavior: wrap("behavior", async () => ({ status: "stable", warnings: [], evidence: { transactionCount: 9 } }) as unknown as BehaviorCoachView),
      card: wrap("card", async () => null),
    } satisfies CoachAnswerSources,
  };
};

const T0 = new Date("2026-11-18T09:00:00Z");

/** BFF 가 답 스트림 헤더로 싣는 이번 주 계획(서버 S4a — plan 이 Kotlin portfolio 로 옮겨 감) */
const WEEKLY = {
  configured: true,
  totalKrw: 300_000,
  items: [
    { asset: "btc" as const, amountKrw: 150_000, fixed: true },
    { asset: "kospi" as const, amountKrw: 150_000, fixed: true },
  ],
};

describe("코치 대화 — 이번 주 얼마(2026-11-19 밴드 적립 주간 계획)", () => {
  it("적립 칩은 받은 주간 계획만 쓴다(+ 사고팔기 카드) · 위험 예산 0 · 적립 화면 링크", async () => {
    const store = new MemoryStore();
    const { sources: src, calls } = sources();
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: null, chip: "weekly_amount" });
    const result = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId, { weeklyPlan: WEEKLY });
    assert.ok(!("failed" in result));
    assert.deepEqual(calls, { riskBudget: 0, profitPlans: 0, behavior: 0, card: 1 });
    assert.match(result.answer.sentences.join(" "), /이번 주 적립 계획은 300,000원이에요/);
    assert.deepEqual(result.answer.links, [{ kind: "plan" }]);
  });

  for (const [name, given] of [
    ["BFF 가 못 읽음(null)", { weeklyPlan: null }],
    ["사실을 안 받음", {}],
  ] as const) {
    it(`주간 계획 ${name} → 그 문장만 불러올 수 없어요(500 아님)`, async () => {
      const store = new MemoryStore();
      const { sources: src } = sources();
      const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: null, chip: "weekly_amount" });
      const result = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId, given);
      assert.ok(!("failed" in result));
      assert.match(result.answer.sentences.join(" "), /불러올 수 없어요/);
      assert.deepEqual(result.answer.gaps, ["weekly_plan"]);
    });
  }
});

describe("코치 대화 — 묻기 · 답", () => {
  it("칩으로 물으면 칩 문장이 질문이 되고, 답은 위험 예산만 읽는다(필요한 재료만 — FR-20)", async () => {
    const store = new MemoryStore();
    const { sources: src, calls } = sources();
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: null, chip: "risk_check" });
    const result = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId);
    assert.ok(!("failed" in result));
    assert.equal(result.answer.intent, "risk_check");
    assert.deepEqual(calls, { riskBudget: 1, profitPlans: 0, behavior: 0, card: 0 }, "위험 답에는 추천 카드를 끼우지 않는다");
    assert.match(result.answer.sentences.join(" "), /BTC가 70%로 정해 둔 상한 60%를 넘었어요/);

    const list = await new ListCoachMessages(store, new FailStaleCoachAnswers(store, () => T0)).execute("u1", asked.conversationId, 20, null);
    const question = list.items.find((item) => item.role === "user");
    assert.equal(question?.content, "내 포트폴리오 위험한가?", "칩 표식은 화면으로 나가지 않는다");
  });

  it("재연결 — 이미 채운 답은 다시 만들지 않고 저장본(FR-3)", async () => {
    const store = new MemoryStore();
    const { sources: src, calls } = sources();
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: "내가 뭘 잘못했나", chip: null });
    const answer = new AnswerCoachMessage(store, src, undefined, () => T0);
    const first = await answer.execute("u1", asked.messageId);
    const again = await answer.execute("u1", asked.messageId);
    assert.ok(!("failed" in first) && !("failed" in again));
    assert.equal(again.replayed, true);
    assert.deepEqual(again.answer.sentences, first.answer.sentences);
    assert.equal(calls.behavior, 1);
  });

  it("겹친 두 스트림 — 답은 한 벌(FR-4)", async () => {
    const store = new MemoryStore();
    const { sources: src } = sources();
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: "팔아야 하나", chip: null });
    const answer = new AnswerCoachMessage(store, src, undefined, () => T0);
    const [a, b] = await Promise.all([answer.execute("u1", asked.messageId), answer.execute("u1", asked.messageId)]);
    assert.ok(!("failed" in a) && !("failed" in b));
    assert.equal([a.replayed, b.replayed].filter(Boolean).length, 1);
    assert.equal(store.messages.filter((m) => m.role === "assistant" && m.status === "complete").length, 1);
  });

  it("재료 실패 = 그 칸만 '불러올 수 없어요' · 대화는 산다(FR-25)", async () => {
    const store = new MemoryStore();
    const { sources: src } = sources({ riskBudget: async () => { throw new Error("db"); } });
    const logs: string[] = [];
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: null, chip: "risk_check" });
    const result = await new AnswerCoachMessage(store, src, (m) => logs.push(m), () => T0).execute("u1", asked.messageId);
    assert.ok(!("failed" in result));
    assert.deepEqual(result.answer.gaps, ["risk"]);
    assert.match(result.answer.sentences[0], /불러올 수 없/);
    assert.equal(logs.length, 1);
  });

  it("60초 넘게 멈춘 답은 만들지 않고 실패 · 목록을 읽으면 멈춘 답이 실패가 된다(FR-7 · 8)", async () => {
    const store = new MemoryStore();
    const { sources: src, calls } = sources();
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: "위험한가", chip: null });
    const later = () => new Date(T0.getTime() + 61_000);
    const result = await new AnswerCoachMessage(store, src, undefined, later).execute("u1", asked.messageId);
    assert.deepEqual(result, { failed: "LLM_TIMEOUT" });
    assert.equal(calls.riskBudget, 0);

    const other = await new AskCoach(store, () => T0).execute("u1", { conversationId: asked.conversationId, content: "또", chip: null });
    await new ListCoachMessages(store, new FailStaleCoachAnswers(store, later)).execute("u1", asked.conversationId, 20, null);
    assert.equal(store.messages.find((m) => m.id === other.messageId)?.status, "failed");
  });

  it("남의 대화 · 남의 메시지는 없는 것과 같다(404)", async () => {
    const store = new MemoryStore();
    const { sources: src } = sources();
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: "위험한가", chip: null });
    await assert.rejects(
      new AskCoach(store, () => T0).execute("u2", { conversationId: asked.conversationId, content: "끼어들기", chip: null }),
      CoachConversationNotFoundError
    );
    await assert.rejects(new AnswerCoachMessage(store, src).execute("u2", asked.messageId), CoachConversationNotFoundError);
    await assert.rejects(new AnswerCoachMessage(store, src).execute("u1", asked.questionId), CoachConversationNotFoundError);
  });

  it("같은 대화에 이어 물으면 메시지 수가 둘씩 는다(FR-9)", async () => {
    const store = new MemoryStore();
    const ask = new AskCoach(store, () => T0);
    const first = await ask.execute("u1", { conversationId: null, content: "위험한가", chip: null });
    await ask.execute("u1", { conversationId: first.conversationId, content: "잘못했나", chip: null });
    assert.equal(store.conversations[0].messageCount, 4);
    assert.equal(store.conversations[0].title, "위험한가");
  });
});

const renderableCard = (): ConversationCard => ({
  insightId: "insight-1",
  payload: {
    action: "hold",
    symbol: "BTC",
    assetType: "crypto",
    score: 55,
    scoreNote: "점수는 확률이 아닙니다",
    renderable: true,
    blockedReason: null,
    reasons: [{ type: "trend", message: "추세 유지" }],
    topFactors: [],
    signalTrackRecord: { signalType: "coach.hold", sample: 24 } as never,
    failureCases: [{ date: "2026-10-01", event: "coach.hold", outcome: "miss", symbol: "ETH", returnRate: -0.08 }],
    explanation: { text: "보유 유지", source: "rule" },
    generatedAt: "2026-11-18T08:00:00.000Z",
  },
  summary: { renderable: true, symbol: "BTC", staleHours: 1 },
});

describe("코치 대화 — 추천 카드(2단계 · SRV-REQ-028 FR-50~54 · DB-REQ-022 FR-10~14)", () => {
  it("팔기 질문 — 카드를 완성 객체로 복사해 저장 · 추천 행 id 연결 · 카드 문장 한 줄", async () => {
    const store = new MemoryStore();
    const card = renderableCard();
    const { sources: src, calls } = sources({ card: async () => card });
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: null, chip: "sell_check" });
    const result = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId);
    assert.ok(!("failed" in result));
    assert.equal(calls.card, 1);
    assert.equal(result.card?.symbol, "BTC");
    assert.equal(result.card?.renderable, true);
    assert.equal(store.insightIds.get(asked.messageId), "insight-1");
    assert.match(result.answer.sentences.at(-1)!, /가장 최근 코치 판단\(BTC\)을 아래 카드로/);

    // 추천이 나중에 바뀌어도(덮어쓰기) 지난 대화 카드는 그대로 — 복사본이다(FR-53)
    (card.payload as { symbol: string }).symbol = "ETH";
    const replay = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId);
    assert.ok(!("failed" in replay));
    assert.equal(replay.replayed, true);
    assert.equal(replay.card?.symbol, "BTC");
    assert.equal(calls.card, 1, "재연결은 카드를 다시 읽지 않는다");
  });

  it("막힌 카드 — 행동 · 종목 · 근거 없이 게이트 칸만, 문장은 사유만(FR-51 · DB-REQ-022 FR-12)", async () => {
    const store = new MemoryStore();
    const blocked: ConversationCard = {
      insightId: "insight-2",
      payload: {
        renderable: false,
        blockedReason: "insufficient_sample",
        signalTrackRecord: { signalType: "coach.buy", sample: 3 } as never,
        failureCases: [],
        generatedAt: "2026-11-18T08:00:00.000Z",
      },
      summary: { renderable: false, symbol: null, staleHours: 30 },
    };
    const { sources: src } = sources({ card: async () => blocked });
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: "이번 주 얼마 넣을까", chip: null });
    const result = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId);
    assert.ok(!("failed" in result));
    assert.equal(result.card?.renderable, false);
    for (const key of ["action", "symbol", "reasons", "score"]) assert.equal(key in (result.card ?? {}), false, key);
    const last = result.answer.sentences.at(-1)!;
    assert.match(last, /사유만/);
    assert.match(last, /30시간 전/);
  });

  it("추천이 없으면 카드 · 카드 문장 둘 다 없다", async () => {
    const store = new MemoryStore();
    const { sources: src } = sources();
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: null, chip: "sell_check" });
    const result = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId);
    assert.ok(!("failed" in result));
    assert.equal(result.card, null);
    assert.equal(store.insightIds.get(asked.messageId), null);
    assert.ok(!result.answer.sentences.some((s) => /코치 판단/.test(s)));
  });

  it("카드 읽기 실패 = 답은 살고 그 사실 한 줄 + gaps", async () => {
    const store = new MemoryStore();
    const { sources: src } = sources({ card: async () => { throw new Error("db"); } });
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: null, chip: "sell_check" });
    const result = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId);
    assert.ok(!("failed" in result));
    assert.equal(result.card, null);
    assert.deepEqual(result.answer.gaps, ["recommendation"]);
    assert.match(result.answer.sentences.at(-1)!, /불러올 수 없어 카드 없이/);
  });
});

describe("오늘의 브리핑(FR-21)", () => {
  it("보유 점검 · 위험 · 카드 — 저장하지 않고 같은 재료에서", async () => {
    const plans = {
      plans: [
        { symbol: "BTC", status: "stop_loss_review", currentPrice: 100, unrealizedProfitRate: -12, stages: [] },
        { symbol: "ETH", status: "hold_plan", currentPrice: 100, unrealizedProfitRate: 2, stages: [] },
      ],
    };
    const { sources: src, calls } = sources({ profitPlans: async () => plans, card: async () => renderableCard() });
    const result = await new GetCoachBriefing(src, undefined, () => T0).execute("u1");
    assert.deepEqual(calls, { riskBudget: 1, profitPlans: 1, behavior: 0, card: 1 });
    assert.equal(result.generatedAt.toISOString(), T0.toISOString());
    assert.equal(result.card?.symbol, "BTC");
    const text = result.sentences.join(" ");
    assert.match(text, /코인 보유 2개 중 점검 지점에 온 것이 1개예요\(손실 제한 검토 1\)/);
    assert.match(text, /정해 둔 위험 기준을 넘은 항목이 1개/);
    assert.deepEqual(result.links, [{ kind: "profit_plan" }, { kind: "risk_budget" }]);
    assert.equal(result.dropped, 0);
  });

  it("재료 둘 실패 · 추천 없음 — 그 줄만 '불러올 수 없어요', 0 을 쓰지 않는다", async () => {
    const boom = async () => { throw new Error("x"); };
    const { sources: src } = sources({ profitPlans: boom, riskBudget: boom });
    const result = await new GetCoachBriefing(src).execute("u1");
    assert.deepEqual(result.gaps, ["plans", "risk"]);
    assert.equal(result.card, null);
    const text = result.sentences.join(" ");
    assert.match(text, /코인 보유 점검은 지금 불러올 수 없어요/);
    assert.match(text, /아직 만든 코치 판단이 없어요/);
    assert.ok(!/0개/.test(text));
  });
});

describe("대화 보관 한도(SRV-REQ-028 FR-30 — 사용자 2026-11-19 \"너무 쌓이면 안 되니까\")", () => {
  // 답이 끝난 뒤의 상태로 — `streaming` 인 답은 지우지 않는다(지금 쓰이는 중일 수 있다)
  const ask = async (store: MemoryStore, at: Date, conversationId: string | null) => {
    const asked = await new AskCoach(store, () => at).execute("u1", { conversationId, content: `질문 ${at.toISOString()}`, chip: null });
    const answer = store.messages.find((m) => m.id === asked.messageId);
    if (answer) answer.status = "complete";
    return asked;
  };

  it("질문이 101번째가 되면 가장 오래된 질문과 그 답이 같이 지워진다 — 짝은 갈라지지 않는다", async () => {
    const store = new MemoryStore();
    let conversationId: string | null = null;
    for (let i = 0; i < COACH_HISTORY_KEEP_QUESTIONS + 1; i += 1) {
      conversationId = (await ask(store, new Date(T0.getTime() + i * 60_000), conversationId)).conversationId;
    }
    const mine = store.messages.filter((m) => m.userId === "u1");
    assert.equal(mine.filter((m) => m.role === "user").length, COACH_HISTORY_KEEP_QUESTIONS);
    assert.equal(mine.length, COACH_HISTORY_KEEP_QUESTIONS * 2, "답도 질문 수만큼 — 홀로 남은 답 0");
    assert.equal(mine.some((m) => m.createdAt.getTime() === T0.getTime()), false, "첫 질문은 지워졌다");
    assert.equal(store.conversations[0]?.messageCount, COACH_HISTORY_KEEP_QUESTIONS * 2);
  });

  it("90일보다 오래된 질문은 수가 적어도 지워지고, 그 대화가 비면 대화도 지운다", async () => {
    const store = new MemoryStore();
    const old = await ask(store, T0, null);
    const later = new Date(T0.getTime() + (COACH_HISTORY_KEEP_DAYS + 1) * 86_400_000);
    await ask(store, later, null);
    assert.equal(store.conversations.some((c) => c.id === old.conversationId), false);
    assert.equal(store.messages.filter((m) => m.userId === "u1").length, 2);
  });

  it("아직 답하는 중(streaming)인 답은 경계 앞이어도 남긴다", async () => {
    const store = new MemoryStore();
    const first = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: "멈춘 질문", chip: null });
    await ask(store, new Date(T0.getTime() + (COACH_HISTORY_KEEP_DAYS + 1) * 86_400_000), null);
    assert.ok(store.messages.some((m) => m.id === first.messageId));
  });

  it("다른 사람 대화는 건드리지 않는다", async () => {
    const store = new MemoryStore();
    await new AskCoach(store, () => T0).execute("u2", { conversationId: null, content: "남의 질문", chip: null });
    await ask(store, new Date(T0.getTime() + (COACH_HISTORY_KEEP_DAYS + 1) * 86_400_000), null);
    assert.equal(store.messages.filter((m) => m.userId === "u2").length, 2);
  });

  it("지우기가 실패해도 질문은 저장된다", async () => {
    const store = new MemoryStore();
    store.pruneFails = true;
    const asked = await ask(store, T0, null);
    assert.ok(asked.messageId);
  });

  it("메시지 목록이 보관 한도를 같이 준다 — 화면 문구의 숫자는 서버 값", async () => {
    const store = new MemoryStore();
    const asked = await ask(store, T0, null);
    const page = await new ListCoachMessages(store, new FailStaleCoachAnswers(store, () => T0)).execute("u1", asked.conversationId, 30, null);
    assert.deepEqual(page.keep, { questions: COACH_HISTORY_KEEP_QUESTIONS, days: COACH_HISTORY_KEEP_DAYS });
  });
});
