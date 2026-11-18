import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  CoachAnswer,
  CoachAnswerGap,
  CoachConversationRecord,
  CoachConversationStore,
  CoachMessageRecord,
  CoachMessageStatus,
  CoachQuestionIntent,
} from "../domain";

/**
 * 코치 대화 저장 — `coach_conversations` · `coach_messages`(F006 · `DB-REQ-021` · `DB-REQ-022`).
 *
 * 질문 + 답 자리는 **중첩 쓰기 한 문장**이다 — Prisma 는 중첩 create · update 를 한 트랜잭션으로 보낸다. 그래서 메시지 수 ·
 * 마지막 시각이 메시지와 갈라지지 않고(FR-30 · 31), 유스케이스가 트랜잭션을 따로 열 일이 없다.
 * 답 채우기 · 실패는 `status = 'streaming'` 조건부 UPDATE — 경합이 오류가 아니라 "이미 누가 채움"(0행)이 된다(`prisma-database.md`).
 */

const MESSAGE_SELECT = {
  id: true,
  conversationId: true,
  role: true,
  content: true,
  intent: true,
  status: true,
  explanationSource: true,
  linksJson: true,
  gaps: true,
  errorCode: true,
  createdAt: true,
} as const;

type MessageRow = Prisma.CoachMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

const toMessage = (row: MessageRow): CoachMessageRecord => ({
  id: row.id,
  conversationId: row.conversationId,
  role: row.role === "assistant" ? "assistant" : "user",
  content: row.content,
  intent: (row.intent as CoachQuestionIntent | null) ?? null,
  status: row.status as CoachMessageStatus,
  explanationSource: row.explanationSource === "rule" || row.explanationSource === "llm" ? row.explanationSource : null,
  links: Array.isArray(row.linksJson) ? (row.linksJson as unknown as CoachAnswer["links"]) : [],
  gaps: row.gaps as CoachAnswerGap[],
  errorCode: row.errorCode,
  createdAt: row.createdAt,
});

const CONVERSATION_SELECT = { id: true, title: true, messageCount: true, lastMessageAt: true, createdAt: true } as const;

export class PrismaCoachConversationStore implements CoachConversationStore {
  async ask(input: { userId: string; conversationId: string | null; title: string; question: string; at: Date }) {
    // 질문이 답보다 앞에 정렬되게 1ms 차이(같은 시각이면 역순 목록에서 순서가 흔들린다)
    const answerAt = new Date(input.at.getTime() + 1);
    const messages = {
      create: [
        { userId: input.userId, role: "user", content: input.question, status: "complete", createdAt: input.at },
        { userId: input.userId, role: "assistant", status: "streaming", createdAt: answerAt },
      ],
    };
    const select = {
      id: true,
      messages: { where: { createdAt: { gte: input.at } }, select: { id: true, role: true }, orderBy: { createdAt: "asc" as const } },
    };

    let saved: { id: string; messages: Array<{ id: string; role: string }> };
    if (input.conversationId) {
      const owned = await prisma.coachConversation.findFirst({
        where: { id: input.conversationId, userId: input.userId },
        select: { id: true },
      });
      if (!owned) return null;
      saved = await prisma.coachConversation.update({
        where: { id: owned.id },
        data: { messageCount: { increment: 2 }, lastMessageAt: answerAt, messages },
        select,
      });
    } else {
      saved = await prisma.coachConversation.create({
        data: { userId: input.userId, title: input.title || null, messageCount: 2, lastMessageAt: answerAt, messages },
        select,
      });
    }
    const question = saved.messages.find((message) => message.role === "user");
    const answer = saved.messages.find((message) => message.role === "assistant");
    if (!question || !answer) throw new Error("코치 대화 저장 뒤 메시지를 찾지 못했다");
    return { conversationId: saved.id, questionId: question.id, answerId: answer.id };
  }

  async findMessage(userId: string, messageId: string) {
    const row = await prisma.coachMessage.findFirst({ where: { id: messageId, userId }, select: MESSAGE_SELECT });
    return row ? toMessage(row) : null;
  }

  async findQuestionFor(answer: CoachMessageRecord) {
    const row = await prisma.coachMessage.findFirst({
      where: { conversationId: answer.conversationId, role: "user", createdAt: { lt: answer.createdAt } },
      orderBy: { createdAt: "desc" },
      select: MESSAGE_SELECT,
    });
    return row ? toMessage(row) : null;
  }

  async completeAnswer(
    messageId: string,
    answer: Pick<CoachMessageRecord, "content" | "intent" | "links" | "gaps"> & { explanationSource: "rule" | "llm" }
  ) {
    const result = await prisma.coachMessage.updateMany({
      where: { id: messageId, status: "streaming" },
      data: {
        status: "complete",
        content: answer.content,
        intent: answer.intent,
        explanationSource: answer.explanationSource,
        linksJson: answer.links as unknown as Prisma.InputJsonValue,
        gaps: answer.gaps,
      },
    });
    return result.count > 0;
  }

  async failAnswer(messageId: string, errorCode: string) {
    await prisma.coachMessage.updateMany({
      where: { id: messageId, status: "streaming" },
      data: { status: "failed", errorCode },
    });
  }

  async failStale(olderThan: Date) {
    const result = await prisma.coachMessage.updateMany({
      where: { status: "streaming", createdAt: { lt: olderThan } },
      data: { status: "failed", errorCode: "LLM_TIMEOUT" },
    });
    return result.count;
  }

  async listConversations(userId: string, limit: number, cursor: string | null): Promise<CoachConversationRecord[]> {
    return prisma.coachConversation.findMany({
      where: { userId },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: CONVERSATION_SELECT,
    });
  }

  async listMessages(userId: string, conversationId: string, limit: number, cursor: string | null) {
    const owned = await prisma.coachConversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } });
    if (!owned) return null;
    const rows = await prisma.coachMessage.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: MESSAGE_SELECT,
    });
    return rows.map(toMessage);
  }

  async deleteConversation(userId: string, conversationId: string) {
    const result = await prisma.coachConversation.deleteMany({ where: { id: conversationId, userId } });
    return result.count > 0;
  }
}
