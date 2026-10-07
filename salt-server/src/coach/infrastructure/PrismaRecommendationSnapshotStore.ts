import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import { LIVE_ORIGINS, ROUND_TRIP_COST } from "../domain";
import type {
  CoachAction,
  JudgmentEvaluation,
  JudgmentOutcome,
  JudgmentTrackStats,
  PendingRecommendation,
  RecommendationCase,
  RecommendationFilter,
  RecommendationSnapshotDraft,
  RecommendationSnapshotStore,
  SampleOrigin,
} from "../domain";

/**
 * 저장 추천 스냅샷 (`coach_recommendation_snapshots`, F010 슬라이스 0).
 *
 * `PrismaSymbolJudgmentStore` 와 같은 규칙이다 — 행 하나가 표본 하나, 성적은 집계 한 번, 실측은 `countedOrigins`
 * 만 센다. 쓰는 쪽(`saveSnapshot` · `listPending`)은 설정과 무관하게 **늘 `live`** 다.
 */
export class PrismaRecommendationSnapshotStore implements RecommendationSnapshotStore {
  private readonly counted: SampleOrigin[];

  constructor(countedOrigins: readonly SampleOrigin[] = LIVE_ORIGINS) {
    this.counted = [...countedOrigins];
  }

  private scope(userId: string, filter: RecommendationFilter): Prisma.CoachRecommendationSnapshotWhereInput {
    return {
      userId,
      sampleOrigin: { in: this.counted },
      ...(filter.signalType ? { signalType: filter.signalType } : {}),
      ...(filter.symbol ? { symbol: filter.symbol } : {}),
    };
  }

  async lastJudgedAt(userId: string): Promise<Map<string, Date>> {
    const rows = await prisma.coachRecommendationSnapshot.groupBy({
      by: ["symbol", "action"],
      where: { userId, sampleOrigin: "live" },
      _max: { judgedAt: true },
    });
    const result = new Map<string, Date>();
    for (const row of rows) {
      if (row._max.judgedAt) result.set(`${row.symbol}:${row.action}`, row._max.judgedAt);
    }
    return result;
  }

  async saveSnapshot(draft: RecommendationSnapshotDraft): Promise<boolean> {
    const { count } = await prisma.coachRecommendationSnapshot.createMany({
      data: [
        {
          userId: draft.userId,
          symbol: draft.symbol,
          mode: "long_term",
          action: draft.action,
          signalType: draft.signalType,
          score: draft.score,
          reasons: draft.reasons,
          entryPrice: new Prisma.Decimal(draft.entryPrice),
          judgedAt: draft.judgedAt,
          sampleOrigin: "live" satisfies SampleOrigin,
        },
      ],
      skipDuplicates: true,
    });
    return count > 0;
  }

  async listPending(judgedBefore: Date, limit: number): Promise<PendingRecommendation[]> {
    const rows = await prisma.coachRecommendationSnapshot.findMany({
      where: { evaluatedAt: null, sampleOrigin: "live", judgedAt: { lte: judgedBefore } },
      orderBy: { judgedAt: "asc" },
      take: limit,
      select: { id: true, symbol: true, action: true, entryPrice: true, judgedAt: true },
    });
    return rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      action: row.action as CoachAction,
      entryPrice: Number(row.entryPrice),
      judgedAt: row.judgedAt,
    }));
  }

  /** 판단 스냅샷과 같은 한 문장 `UPDATE ... FROM (VALUES ...)` — 행끼리 독립이라 트랜잭션이 필요 없다. */
  async saveEvaluations(evaluations: JudgmentEvaluation[]): Promise<void> {
    if (evaluations.length === 0) return;
    const values = Prisma.join(
      evaluations.map(
        (e) =>
          Prisma.sql`(${e.id}, ${new Prisma.Decimal(e.exitPrice)}::numeric, ${e.returnRate.toFixed(6)}::numeric, ${e.outcome}, (${e.evaluatedAt.toISOString()}::timestamptz AT TIME ZONE 'UTC'))`
      )
    );
    await prisma.$executeRaw`
      UPDATE coach_recommendation_snapshots AS s
      SET exit_price = v.exit_price,
          return_rate = v.return_rate,
          outcome = v.outcome,
          evaluated_at = v.evaluated_at
      FROM (VALUES ${values}) AS v(id, exit_price, return_rate, outcome, evaluated_at)
      WHERE s.id = v.id AND s.evaluated_at IS NULL
    `;
  }

  async summarize(userId: string, filter: RecommendationFilter): Promise<JudgmentTrackStats> {
    const where = { ...this.scope(userId, filter), outcome: { not: null } };
    const [all, hits, aboveCost] = await Promise.all([
      prisma.coachRecommendationSnapshot.aggregate({
        where,
        _count: { _all: true },
        _avg: { returnRate: true },
        _min: { returnRate: true, evaluatedAt: true },
        _max: { evaluatedAt: true },
      }),
      prisma.coachRecommendationSnapshot.count({ where: { ...where, outcome: "hit" } }),
      prisma.coachRecommendationSnapshot.count({ where: { ...where, returnRate: { gt: ROUND_TRIP_COST } } }),
    ]);
    return {
      sample: all._count._all,
      hits,
      aboveCost,
      avgReturn: all._avg.returnRate === null ? null : Number(all._avg.returnRate),
      worstReturn: all._min.returnRate === null ? null : Number(all._min.returnRate),
      firstScoredAt: all._min.evaluatedAt,
      lastScoredAt: all._max.evaluatedAt,
    };
  }

  async recentCases(
    userId: string,
    filter: RecommendationFilter,
    outcome: JudgmentOutcome | null,
    limit: number
  ): Promise<RecommendationCase[]> {
    const rows = await prisma.coachRecommendationSnapshot.findMany({
      where: { ...this.scope(userId, filter), outcome: outcome ?? { not: null } },
      orderBy: { judgedAt: "desc" },
      take: limit,
      select: { symbol: true, action: true, judgedAt: true, entryPrice: true, exitPrice: true, returnRate: true, outcome: true },
    });
    return rows.map((row) => ({
      symbol: row.symbol,
      action: row.action as CoachAction,
      judgedAt: row.judgedAt,
      entryPrice: Number(row.entryPrice),
      exitPrice: Number(row.exitPrice),
      returnRate: Number(row.returnRate),
      outcome: row.outcome as JudgmentOutcome,
    }));
  }
}
