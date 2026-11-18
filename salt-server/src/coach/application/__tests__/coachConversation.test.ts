import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import { Money } from "../../../shared/domain";
import type { CoachConversationRecord, CoachConversationStore, CoachMessageRecord } from "../../domain";
import { CoachConversationNotFoundError } from "../../domain";
import type { BehaviorCoachView } from "../AnalyzeTradingBehavior";
import {
  AnswerCoachMessage,
  AskCoach,
  FailStaleCoachAnswers,
  ListCoachMessages,
  type CoachAnswerSources,
} from "../CoachConversation";
import type { RiskBudgetView } from "../ManageRiskBudget";

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
    const base = { conversationId: conversation.id, userId: input.userId, intent: null, explanationSource: null, links: [], gaps: [], errorCode: null };
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
  async completeAnswer(id: string, answer: Pick<CoachMessageRecord, "content" | "intent" | "links" | "gaps"> & { explanationSource: "rule" | "llm" }) {
    this.completeCalls += 1;
    const row = this.messages.find((m) => m.id === id);
    if (!row || row.status !== "streaming") return false;
    Object.assign(row, answer, { status: "complete" });
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
  const calls = { riskBudget: 0, profitPlans: 0, behavior: 0 };
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
    } satisfies CoachAnswerSources,
  };
};

const T0 = new Date("2026-11-18T09:00:00Z");

describe("코치 대화 — 묻기 · 답", () => {
  it("칩으로 물으면 칩 문장이 질문이 되고, 답은 위험 예산만 읽는다(필요한 재료만 — FR-20)", async () => {
    const store = new MemoryStore();
    const { sources: src, calls } = sources();
    const asked = await new AskCoach(store, () => T0).execute("u1", { conversationId: null, content: null, chip: "risk_check" });
    const result = await new AnswerCoachMessage(store, src, undefined, () => T0).execute("u1", asked.messageId);
    assert.ok(!("failed" in result));
    assert.equal(result.answer.intent, "risk_check");
    assert.deepEqual(calls, { riskBudget: 1, profitPlans: 0, behavior: 0 });
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
