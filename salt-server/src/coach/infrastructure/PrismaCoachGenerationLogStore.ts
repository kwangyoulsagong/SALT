import prisma from "../../shared/infrastructure/prisma";
import type {
  CoachGenerationEntry,
  CoachGenerationLogStore,
  CoachGenerationSource,
  CoachGenerationStatus,
} from "../domain";

/**
 * 코치 생성 기록 — `coach_generation_logs`.
 *
 * `source` · `status` 는 CHECK 없는 문자열이다. 모르는 값은 가장 보수적인 쪽으로 읽는다:
 * 모르는 출처는 `manual`(쿨다운에 걸리는 쪽), 모르는 상태는 `failed`.
 */

const toSource = (value: string): CoachGenerationSource =>
  value === "worker" ? "worker" : "manual";

const STATUSES: CoachGenerationStatus[] = [
  "running",
  "succeeded",
  "failed",
  "cooldown_rejected",
];
const toStatus = (value: string): CoachGenerationStatus =>
  STATUSES.includes(value as CoachGenerationStatus)
    ? (value as CoachGenerationStatus)
    : "failed";

const toLlmSource = (value: string | null): "llm" | "rule" | null =>
  value === "llm" || value === "rule" ? value : null;

export class PrismaCoachGenerationLogStore implements CoachGenerationLogStore {
  async start(
    userId: string,
    source: CoachGenerationSource,
    requestedAt: Date
  ): Promise<string> {
    const row = await prisma.coachGenerationLog.create({
      data: { userId, source, status: "running", requestedAt },
      select: { id: true },
    });
    return row.id;
  }

  async finish(
    id: string,
    result: {
      status: "succeeded" | "failed";
      llmSource: "llm" | "rule" | null;
      durationMs: number;
      errorCode: string | null;
    }
  ): Promise<void> {
    await prisma.coachGenerationLog.update({
      where: { id },
      data: result,
    });
  }

  async recordRejected(userId: string, requestedAt: Date): Promise<void> {
    await prisma.coachGenerationLog.create({
      data: {
        userId,
        source: "manual",
        status: "cooldown_rejected",
        requestedAt,
      },
    });
  }

  async lastAcceptedManualAt(userId: string): Promise<Date | null> {
    const row = await prisma.coachGenerationLog.findFirst({
      where: {
        userId,
        source: "manual",
        status: { not: "cooldown_rejected" },
      },
      orderBy: { requestedAt: "desc" },
      select: { requestedAt: true },
    });
    return row?.requestedAt ?? null;
  }

  async recent(userId: string, limit: number): Promise<CoachGenerationEntry[]> {
    const rows = await prisma.coachGenerationLog.findMany({
      where: { userId },
      orderBy: { requestedAt: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      requestedAt: row.requestedAt,
      source: toSource(row.source),
      status: toStatus(row.status),
      llmSource: toLlmSource(row.llmSource),
      durationMs: row.durationMs,
      errorCode: row.errorCode,
    }));
  }
}
