import prisma from "../../shared/infrastructure/prisma";
import type { LlmCallRecord, LlmUsage, LlmUsageStore } from "../domain";

/**
 * LLM 시도 원장 — `llm_call_logs` (F010 슬라이스 7).
 *
 * 상한 판정은 요청마다 집계 두 번이다(`requested_at` · `(user_id, requested_at)` 인덱스). 24시간 상한이 300 시도라
 * 창 안의 행은 많아야 수백 개다.
 */
export class PrismaLlmUsageStore implements LlmUsageStore {
  async record(entry: LlmCallRecord): Promise<void> {
    await prisma.llmCallLog.create({ data: entry });
  }

  async usageSince(since: Date, userId: string): Promise<{ user: LlmUsage; total: LlmUsage }> {
    const window = { requestedAt: { gte: since } };
    const [total, user] = await Promise.all([
      prisma.llmCallLog.aggregate({ where: window, _count: { _all: true }, _sum: { totalTokens: true } }),
      prisma.llmCallLog.aggregate({ where: { ...window, userId }, _count: { _all: true }, _sum: { totalTokens: true } }),
    ]);
    const toUsage = (row: typeof total): LlmUsage => ({
      calls: row._count._all,
      tokens: row._sum.totalTokens ?? 0,
    });
    return { user: toUsage(user), total: toUsage(total) };
  }
}
