import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import { RETURN_BUCKETS } from "../domain";
import type {
  CoachMode,
  JudgmentCase,
  JudgmentEvaluation,
  JudgmentGroupStats,
  JudgmentOutcome,
  JudgmentSnapshotDraft,
  JudgmentTrackStats,
  ModeDecisionAction,
  PendingJudgment,
  SymbolJudgmentStore,
} from "../domain";

/** 집계 한 줄. `$queryRaw` 는 컬럼 이름 그대로 준다 — `numeric` 은 `Decimal` 이다. */
interface ScoreboardRow extends Record<string, unknown> {
  signal_type: string;
  sample: number;
  hits: number;
  avg_return: Prisma.Decimal | null;
  worst_return: Prisma.Decimal | null;
  p25: Prisma.Decimal | null;
  median: Prisma.Decimal | null;
  p75: Prisma.Decimal | null;
}

interface CaseRow {
  signal_type: string;
  symbol: string;
  action: string;
  judged_at: Date;
  return_rate: Prisma.Decimal;
  outcome: JudgmentOutcome;
}

const toNumberOrNull = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

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

  /**
   * 신호 유형별 성적 + 수익률 분포.
   *
   * 한 문장이다. 그룹 집계 · 구간별 표본 수 · 사분위수를 각각 쿼리하면 같은 스캔을
   * 세 번 한다. 구간 경계는 **도메인 정책이 주는 배열**(`RETURN_BUCKETS`)을 그대로
   * `FILTER` 로 펼친 것이다 — SQL 에 숫자를 다시 적으면 화면과 갈라진다.
   *
   * `outcome` 이 있는 행만 본다(= 관찰 기간이 끝나 판정된 표본). 판정 전 행은 성적이 아니다.
   */
  async scoreboard(): Promise<JudgmentGroupStats[]> {
    const bucketColumns = RETURN_BUCKETS.map((bucket, index) => {
      const bounds: Prisma.Sql[] = [];
      if (bucket.min !== null) {
        bounds.push(Prisma.sql`return_rate > ${bucket.min}::numeric`);
      }
      if (bucket.max !== null) {
        bounds.push(Prisma.sql`return_rate <= ${bucket.max}::numeric`);
      }
      return Prisma.sql`COUNT(*) FILTER (WHERE ${Prisma.join(
        bounds,
        " AND "
      )})::int AS ${Prisma.raw(`bucket_${index}`)}`;
    });

    const rows = await prisma.$queryRaw<ScoreboardRow[]>`
      SELECT signal_type,
             COUNT(*)::int AS sample,
             COUNT(*) FILTER (WHERE outcome = 'hit')::int AS hits,
             AVG(return_rate) AS avg_return,
             MIN(return_rate) AS worst_return,
             PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY return_rate) AS p25,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY return_rate) AS median,
             PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY return_rate) AS p75,
             ${Prisma.join(bucketColumns, ", ")}
      FROM symbol_judgment_snapshots
      WHERE outcome IS NOT NULL AND return_rate IS NOT NULL
      GROUP BY signal_type
      ORDER BY signal_type
    `;

    return rows.map((row) => ({
      signalType: row.signal_type,
      sample: row.sample,
      hits: row.hits,
      avgReturn: toNumberOrNull(row.avg_return),
      worstReturn: toNumberOrNull(row.worst_return),
      p25: toNumberOrNull(row.p25),
      median: toNumberOrNull(row.median),
      p75: toNumberOrNull(row.p75),
      bucketCounts: Object.fromEntries(
        RETURN_BUCKETS.map((bucket, index) => [
          bucket.code,
          Number(row[`bucket_${index}`] ?? 0),
        ])
      ),
    }));
  }

  /**
   * 그룹 × 결과별 최근 N 건. `ROW_NUMBER()` 로 한 문장에 담는다 —
   * 그룹 8개면 `recentCases` 를 16번 부르는 것과 같은 결과를 쿼리 1회로 얻는다.
   */
  async recentCasesByGroup(
    limit: number
  ): Promise<Map<string, Record<JudgmentOutcome, JudgmentCase[]>>> {
    const rows = await prisma.$queryRaw<CaseRow[]>`
      SELECT signal_type, symbol, action, judged_at, return_rate, outcome
      FROM (
        SELECT signal_type, symbol, action, judged_at, return_rate, outcome,
               ROW_NUMBER() OVER (
                 PARTITION BY signal_type, outcome ORDER BY judged_at DESC
               ) AS rn
        FROM symbol_judgment_snapshots
        WHERE outcome IS NOT NULL AND return_rate IS NOT NULL
      ) ranked
      WHERE rn <= ${limit}
      ORDER BY signal_type, outcome, judged_at DESC
    `;

    const grouped = new Map<string, Record<JudgmentOutcome, JudgmentCase[]>>();
    for (const row of rows) {
      const entry =
        grouped.get(row.signal_type) ?? ({ hit: [], miss: [] } as Record<JudgmentOutcome, JudgmentCase[]>);
      entry[row.outcome].push({
        symbol: row.symbol,
        judgedAt: row.judged_at,
        action: row.action as ModeDecisionAction,
        returnRate: Number(row.return_rate),
      });
      grouped.set(row.signal_type, entry);
    }
    return grouped;
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
