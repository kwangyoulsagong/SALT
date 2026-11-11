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

  async markDropped(callId: string, droppedSentences: number): Promise<void> {
    await prisma.llmCallLog.update({ where: { id: callId }, data: { droppedSentences } });
  }

  /**
   * 시도 수는 공급자 전부, 토큰은 `gemini` 만(`SRV-REQ-050` FR-9) — 로컬 CLI 는 구독이라 토큰 비용이 없다.
   * 집계 넷이지만 창 안 행이 수백 개라 인덱스(`requested_at`) 범위 스캔 하나씩이다
   */
  async usageSince(since: Date, userId: string | null): Promise<{ user: LlmUsage; total: LlmUsage }> {
    const window = { requestedAt: { gte: since } };
    const gemini = { provider: "gemini" };
    const [total, user, totalTokens, userTokens] = await Promise.all([
      prisma.llmCallLog.count({ where: window }),
      prisma.llmCallLog.count({ where: { ...window, userId } }),
      prisma.llmCallLog.aggregate({ where: { ...window, ...gemini }, _sum: { totalTokens: true } }),
      prisma.llmCallLog.aggregate({ where: { ...window, ...gemini, userId }, _sum: { totalTokens: true } }),
    ]);
    return {
      user: { calls: user, tokens: userTokens._sum.totalTokens ?? 0 },
      total: { calls: total, tokens: totalTokens._sum.totalTokens ?? 0 },
    };
  }
}
