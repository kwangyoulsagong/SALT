import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  CoachMode,
  JudgmentCase,
  JudgmentEvaluation,
  JudgmentOutcome,
  JudgmentSnapshotDraft,
  JudgmentTrackStats,
  ModeDecisionAction,
  PendingJudgment,
  SymbolJudgmentStore,
} from "../domain";

/**
 * 종목 판단 스냅샷 (`symbol_judgment_snapshots`).
 *
 * 이 테이블의 주인은 `coach` 하나다. 행 하나가 표본 하나라서(B39 — 관찰 기간당 1건)
 * 성적은 **그룹 집계 한 번**으로 나온다.
 */
export class PrismaSymbolJudgmentStore implements SymbolJudgmentStore {
  /**
   * 종목 · 모드별 마지막 판단 시각.
   *
   * `groupBy` 한 번이다 — 심볼마다 `findFirst` 를 돌리지 않는다.
   * `(symbol, mode, judged_at DESC)` 인덱스가 덮는다.
   */
  async lastJudgedAt(symbols: string[]): Promise<Map<string, Date>> {
    if (symbols.length === 0) return new Map();

    const rows = await prisma.symbolJudgmentSnapshot.groupBy({
      by: ["symbol", "mode"],
      where: { symbol: { in: symbols } },
      _max: { judgedAt: true },
    });

    const result = new Map<string, Date>();
    for (const row of rows) {
      if (row._max.judgedAt) result.set(`${row.symbol}:${row.mode}`, row._max.judgedAt);
    }
    return result;
  }

  async saveSnapshots(drafts: JudgmentSnapshotDraft[]): Promise<number> {
    if (drafts.length === 0) return 0;

    const { count } = await prisma.symbolJudgmentSnapshot.createMany({
      data: drafts.map((draft) => ({
        symbol: draft.symbol,
        mode: draft.mode,
        action: draft.action,
        signalType: draft.signalType,
        score: draft.score,
        reasons: draft.reasons,
        entryPrice: new Prisma.Decimal(draft.entryPrice),
        judgedAt: draft.judgedAt,
      })),
      // `(symbol, mode, judged_at)` 유니크 — 워커가 겹쳐 돌아도 한 벌이다
      skipDuplicates: true,
    });
    return count;
  }

  async listPending(
    judgedBefore: Record<CoachMode, Date>,
    limit: number
  ): Promise<PendingJudgment[]> {
    const rows = await prisma.symbolJudgmentSnapshot.findMany({
      where: {
        evaluatedAt: null,
        OR: [
          { mode: "scalp", judgedAt: { lte: judgedBefore.scalp } },
          { mode: "long_term", judgedAt: { lte: judgedBefore.long_term } },
        ],
      },
      orderBy: { judgedAt: "asc" },
      take: limit,
      select: {
        id: true,
        symbol: true,
        mode: true,
        action: true,
        entryPrice: true,
        judgedAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      mode: row.mode as CoachMode,
      action: row.action as ModeDecisionAction,
      entryPrice: Number(row.entryPrice),
      judgedAt: row.judgedAt,
    }));
  }

  async saveEvaluations(evaluations: JudgmentEvaluation[]): Promise<void> {
    if (evaluations.length === 0) return;

    // 행마다 값이 달라 `updateMany` 로 묶을 수 없다. 행별 `update` 는 왕복이 N 번이고
    // 트랜잭션으로 묶는 것은 이 레이어의 일이 아니다(`ddd-infrastructure.md` §7) —
    // `UPDATE ... FROM (VALUES ...)` 한 문장으로 보낸다. 행끼리 독립이라 원자성이 필요 없다.
    // 시각은 Prisma 가 쓰는 방식(UTC 로 `timestamp` 에 저장)과 같게 — 세션 타임존에 기대지 않는다.
    const values = Prisma.join(
      evaluations.map(
        (evaluation) =>
          Prisma.sql`(${evaluation.id}, ${new Prisma.Decimal(evaluation.exitPrice)}::numeric, ${evaluation.returnRate.toFixed(6)}::numeric, ${evaluation.outcome}, (${evaluation.evaluatedAt.toISOString()}::timestamptz AT TIME ZONE 'UTC'))`
      )
    );

    await prisma.$executeRaw`
      UPDATE symbol_judgment_snapshots AS s
      SET exit_price = v.exit_price,
          return_rate = v.return_rate,
          outcome = v.outcome,
          evaluated_at = v.evaluated_at
      FROM (VALUES ${values}) AS v(id, exit_price, return_rate, outcome, evaluated_at)
      WHERE s.id = v.id AND s.evaluated_at IS NULL
    `;
  }

  async summarize(signalType: string): Promise<JudgmentTrackStats> {
    const [all, hits] = await Promise.all([
      prisma.symbolJudgmentSnapshot.aggregate({
        where: { signalType, outcome: { not: null } },
        _count: { _all: true },
        _avg: { returnRate: true },
        _min: { returnRate: true },
      }),
      prisma.symbolJudgmentSnapshot.count({
        where: { signalType, outcome: "hit" },
      }),
    ]);

    return {
      sample: all._count._all,
      hits,
      avgReturn: all._avg.returnRate === null ? null : Number(all._avg.returnRate),
      worstReturn: all._min.returnRate === null ? null : Number(all._min.returnRate),
    };
  }

  async recentCases(
    signalType: string,
    outcome: JudgmentOutcome,
    limit: number
  ): Promise<JudgmentCase[]> {
    const rows = await prisma.symbolJudgmentSnapshot.findMany({
      where: { signalType, outcome },
      orderBy: { judgedAt: "desc" },
      take: limit,
      select: { symbol: true, judgedAt: true, action: true, returnRate: true },
    });

    return rows.map((row) => ({
      symbol: row.symbol,
      judgedAt: row.judgedAt,
      action: row.action as ModeDecisionAction,
      returnRate: Number(row.returnRate),
    }));
  }
}
