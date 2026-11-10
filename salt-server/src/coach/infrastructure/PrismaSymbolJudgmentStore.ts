import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import {
  LIVE_ORIGINS,
  MODE_DECISION_RULE_VERSION,
  DEFAULT_ROUND_TRIP_COSTS,
  KR_STOCK_SELL_TAX,
  RETURN_BUCKETS,
} from "../domain";
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
  RoundTripCosts,
  SampleOrigin,
  SymbolJudgmentStore,
} from "../domain";

/** 집계 한 줄. `$queryRaw` 는 컬럼 이름 그대로 준다 — `numeric` 은 `Decimal` 이다. */
interface ScoreboardRow extends Record<string, unknown> {
  signal_type: string;
  sample: number;
  hits: number;
  above_cost: number;
  pool_sample: number;
  pool_above_cost: number;
  judged_months: number;
  judged_days: number;
  avg_return: Prisma.Decimal | null;
  worst_return: Prisma.Decimal | null;
  first_scored_at: Date | null;
  last_scored_at: Date | null;
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
 * 기저율 풀 — 그룹 키에서 행동을 뗀 `[<자산군>.]<mode>`. 풀은 이 접두 + `.` 로 시작하는 그룹 전부다
 * (코인 `long_term.` 은 국내 `kr_stock.long_term.` 과 겹치지 않는다)
 */
const poolPrefixOf = (signalType: string): string => signalType.slice(0, signalType.lastIndexOf("."));

/**
 * 풀 접두의 `LIKE` 무늬 — `_` · `%` · `\` 는 글자 그대로(`kr_stock` 의 `_` 가 아무 글자로 읽히지 않게). `starts_with` 와 같은 뜻이고
 * `(sample_origin, signal_type)` 인덱스를 탄다(DB 정렬 `C`)
 */
/** 성적 집계를 들고 있는 시간 — 성적은 채점(하루 한 번) · 백테스트 때만 바뀐다. 5분 늦게 보여도 같은 날 같은 숫자다 */
export const JUDGMENT_STATS_TTL_MS = 5 * 60_000;
/**
 * 과거 검산 저장소의 성적 집계 시간 — 행은 스크립트(`judgments:kr-backtest` · `judgments:signal-skill`)만 바꾸고, 스크립트를 돌리면
 * 서버를 다시 띄운다. 5분마다 10만 행 풀을 다시 훑으면 그 첫 요청이 BFF 300ms 를 넘었다(2026-11-10 국내 판단 상세 504)
 */
export const BACKTEST_STATS_TTL_MS = 6 * 3600_000;

/**
 * 키별로 결과를 `ttlMs` 동안 들고 있다 — 같은 키를 동시에 부르면 한 번만 계산한다(진행 중인 약속을 나눈다). 실패는 들고 있지 않는다(다음 요청이 다시)
 */
export const memoizeFor = <T>(ttlMs: number, now: () => number = Date.now) => {
  const held = new Map<string, { at: number; value: Promise<T> }>();
  const memo = (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = held.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    const value = load();
    held.set(key, { at: now(), value });
    value.catch(() => {
      if (held.get(key)?.value === value) held.delete(key);
    });
    return value;
  };
  /** 채점 · 스냅샷을 쓴 뒤 — 들고 있던 값을 버린다 */
  memo.clear = () => held.clear();
  return memo;
};

export const poolPatternOf = (signalType: string): string => `${poolPrefixOf(signalType).replace(/[\\%_]/g, (c) => `\\${c}`)}.%`;

/**
 * 종목 판단 스냅샷 (`symbol_judgment_snapshots`).
 *
 * 이 테이블의 주인은 `coach` 하나다. 행 하나가 표본 하나라서(B39 — 관찰 기간당 1건)
 * 성적은 **그룹 집계 한 번**으로 나온다.
 *
 * ## 출처 (C06 · `DB-REQ-017` FR-60)
 *
 * 성적(`summarize` · `recentCases` · `scoreboard` · `recentCasesByGroup`)은 `countedOrigins` 만 센다.
 * 기본은 `live` 하나다. 워커 쪽(`lastJudgedAt` · `saveSnapshots` · `listPending`)은 설정과 무관하게
 * **늘 `live`** 다 — 합성 행이 실측 표본의 간격을 막거나 채점 대상이 되면 안 된다.
 */
export class PrismaSymbolJudgmentStore implements SymbolJudgmentStore {
  private readonly counted: SampleOrigin[];

  /**
   * `ruleVersion` — 성적이 세는 규칙 버전(F010 슬라이스 1 · `DB-REQ-017` FR-64). 규칙이 바뀌면 같은 `signalType` 이
   * 다른 규칙의 표본이 되므로 **현재 버전만** 센다. 합성 행은 버전과 무관하게 센다 — 로컬 렌더 경로 확인용이라
   * 규칙을 올릴 때마다 시드를 다시 만들 이유가 없다(운영에서는 합성 자체를 세지 않는다).
   */
  constructor(
    countedOrigins: readonly SampleOrigin[] = LIVE_ORIGINS,
    private readonly ruleVersion: string = MODE_DECISION_RULE_VERSION,
    /** 기저율 분자의 비용 경계 — 자산군마다 다르다(F011 FR-64, 국내 주식은 env) */
    private readonly costs: RoundTripCosts = DEFAULT_ROUND_TRIP_COSTS,
    /** 성적 집계를 들고 있는 시간 — 과거 검산 저장소는 길게(`BACKTEST_STATS_TTL_MS`) */
    statsTtlMs: number = JUDGMENT_STATS_TTL_MS
  ) {
    this.counted = [...countedOrigins];
    // 생성자 몸에서 — 필드 초기화는 매개변수 속성보다 먼저 돌 수 있다(useDefineForClassFields)
    this.statsMemo = memoizeFor<JudgmentTrackStats>(statsTtlMs);
  }

  private get countedSql(): Prisma.Sql {
    return Prisma.sql`sample_origin IN (${Prisma.join(this.counted)}) AND (rule_version = ${this.ruleVersion} OR sample_origin = 'synthetic')`;
  }

  private get countedWhere(): Prisma.SymbolJudgmentSnapshotWhereInput {
    return {
      sampleOrigin: { in: this.counted },
      OR: [{ ruleVersion: this.ruleVersion }, { sampleOrigin: "synthetic" }],
    };
  }

  /**
   * 그 행의 왕복 비용(SQL 식) — 기저율 분자 "비용을 넘겨 오름"의 경계. 국내 주식은 매도일(= `evaluated_at` 의 KST 날짜)
   * 거래세 + 수수료 왕복(F011 FR-44). 구간은 도메인 표(`KR_STOCK_SELL_TAX`)를 그대로 펼친다 — SQL 에 숫자를 다시 적으면
   * 채점(`roundTripCostAt`)과 갈라진다. `evaluated_at` 은 UTC 벽시계 TIMESTAMP 라 시간대를 두 번 옮긴다
   */
  private get costSql(): Prisma.Sql {
    const soldOn = Prisma.sql`((evaluated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date`;
    const tax = Prisma.sql`(CASE ${Prisma.join(
      [...KR_STOCK_SELL_TAX]
        .reverse()
        .map((band) => Prisma.sql`WHEN ${soldOn} >= ${band.from}::date THEN ${band.rate}::numeric`),
      " "
    )} ELSE ${KR_STOCK_SELL_TAX[0].rate}::numeric END)`;
    return Prisma.sql`(CASE WHEN LEFT(signal_type, 9) = 'kr_stock.'
                            THEN ${this.costs.krStockCommissionPerSide * 2}::numeric + ${tax}
                            ELSE ${this.costs.crypto}::numeric END)`;
  }

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
      // 규칙이 바뀌면 새 버전의 첫 표본은 바로 쓴다 — 이전 버전의 관찰 기간을 기다리지 않는다
      where: { symbol: { in: symbols }, sampleOrigin: "live", ruleVersion: this.ruleVersion },
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
        ruleVersion: draft.ruleVersion,
        // 워커가 실시간 판단을 남기는 유일한 문이다
        sampleOrigin: "live" satisfies SampleOrigin,
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
        sampleOrigin: "live",
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
        signalType: true,
        entryPrice: true,
        judgedAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      signalType: row.signalType,
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
    // 채점이 성적을 바꿨다 — 쓴 뒤에 버린다(새 스냅샷은 결과가 없어 성적에 안 들어가 버리지 않는다)
    this.statsMemo.clear();
  }

  /**
   * 한 신호의 성적 + 같은 풀(자산군 · 모드)의 기저율 — **풀을 한 번만 훑는다**(조건부 집계 `FILTER`). 예전엔 쿼리 여섯을 나란히 날렸고
   * 종목 판단 한 번이 이것을 세 번 불러 요청당 집계 18개였다 — 연결 풀이 작은 서버에서 부하가 조금만 와도 줄을 서서 BFF 300ms 예산을
   * 넘겼다(`/api/app/ai-coach/detail` 504, 2026-11-09). 신호 행은 풀의 부분집합(같은 접두)이라 결과는 같다 — 전후 대조는 체크리스트
   */
  private readonly statsMemo: ReturnType<typeof memoizeFor<JudgmentTrackStats>>;

  /** 성적 — 종목 판단 한 번이 네 번 부른다(모드 둘 × live · 백테스트). 5분 들고 있다(`JUDGMENT_STATS_TTL_MS`) */
  summarize(signalType: string): Promise<JudgmentTrackStats> {
    return this.statsMemo(signalType, () => this.summarizeNow(signalType));
  }

  private async summarizeNow(signalType: string): Promise<JudgmentTrackStats> {
    const own = Prisma.sql`signal_type = ${signalType}`;
    const above = Prisma.sql`return_rate > ${this.costSql}`;
    const rows = await prisma.$queryRaw<
      Array<{
        sample: number;
        hits: number;
        above_cost: number;
        pool_sample: number;
        pool_above_cost: number;
        months: number;
        days: number;
        avg_return: Prisma.Decimal | null;
        worst_return: Prisma.Decimal | null;
        first_scored_at: Date | null;
        last_scored_at: Date | null;
      }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE ${own})::int AS sample,
        COUNT(*) FILTER (WHERE ${own} AND outcome = 'hit')::int AS hits,
        -- 기저율의 분자 — 비용 경계는 행마다 그 매도일의 왕복 비용(\`costSql\`, 국내 주식 거래세가 해마다 다르다)
        COUNT(*) FILTER (WHERE ${own} AND ${above})::int AS above_cost,
        -- 기저율 — 규칙이 고르기 전의 풀(같은 자산군 · 모드, 행동 무관)
        COUNT(*)::int AS pool_sample,
        COUNT(*) FILTER (WHERE ${above})::int AS pool_above_cost,
        -- 판단 달(KST) 수 — 국내 백테스트 표시 조건. \`judged_at\` 은 UTC 벽시계 TIMESTAMP 라 시간대를 두 번 옮긴다
        COUNT(DISTINCT date_trunc('month', (judged_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')) FILTER (WHERE ${own})::int AS months,
        -- 판단 날(KST) 수 — 과거 검산 3종 채움 조건(signal-skill@1 [display])
        COUNT(DISTINCT ((judged_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date) FILTER (WHERE ${own})::int AS days,
        AVG(return_rate) FILTER (WHERE ${own}) AS avg_return,
        MIN(return_rate) FILTER (WHERE ${own}) AS worst_return,
        MIN(evaluated_at) FILTER (WHERE ${own}) AS first_scored_at,
        MAX(evaluated_at) FILTER (WHERE ${own}) AS last_scored_at
      FROM symbol_judgment_snapshots
      WHERE signal_type LIKE ${poolPatternOf(signalType)} AND outcome IS NOT NULL AND ${this.countedSql}`;
    const r = rows[0]!;

    return {
      sample: r.sample,
      hits: r.hits,
      aboveCost: r.above_cost,
      poolSample: r.pool_sample,
      poolAboveCost: r.pool_above_cost,
      judgedMonths: r.months,
      judgedDays: r.days,
      avgReturn: r.avg_return === null ? null : Number(r.avg_return),
      worstReturn: r.worst_return === null ? null : Number(r.worst_return),
      firstScoredAt: r.first_scored_at,
      lastScoredAt: r.last_scored_at,
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

    // 기저율 풀은 그룹 결과 위의 창 함수 — 같은 접두(`[<자산군>.]<mode>`) 그룹을 합친다. 스캔은 한 번 그대로
    const rows = await prisma.$queryRaw<ScoreboardRow[]>`
      SELECT g.*,
             SUM(g.sample) OVER (PARTITION BY regexp_replace(g.signal_type, '[.][^.]+$', ''))::int AS pool_sample,
             SUM(g.above_cost) OVER (PARTITION BY regexp_replace(g.signal_type, '[.][^.]+$', ''))::int AS pool_above_cost
      FROM (
      SELECT signal_type,
             COUNT(*)::int AS sample,
             COUNT(*) FILTER (WHERE outcome = 'hit')::int AS hits,
             COUNT(*) FILTER (WHERE return_rate > ${this.costSql})::int AS above_cost,
             AVG(return_rate) AS avg_return,
             MIN(return_rate) AS worst_return,
             COUNT(DISTINCT date_trunc('month', (judged_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'))::int AS judged_months,
             COUNT(DISTINCT ((judged_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date)::int AS judged_days,
             MIN(evaluated_at) AS first_scored_at,
             MAX(evaluated_at) AS last_scored_at,
             PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY return_rate) AS p25,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY return_rate) AS median,
             PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY return_rate) AS p75,
             ${Prisma.join(bucketColumns, ", ")}
      FROM symbol_judgment_snapshots
      WHERE outcome IS NOT NULL AND return_rate IS NOT NULL AND ${this.countedSql}
      GROUP BY signal_type
      ) g
      ORDER BY g.signal_type
    `;

    return rows.map((row) => ({
      signalType: row.signal_type,
      sample: row.sample,
      hits: row.hits,
      aboveCost: row.above_cost,
      poolSample: row.pool_sample,
      poolAboveCost: row.pool_above_cost,
      judgedMonths: row.judged_months,
      judgedDays: row.judged_days,
      avgReturn: toNumberOrNull(row.avg_return),
      worstReturn: toNumberOrNull(row.worst_return),
      firstScoredAt: row.first_scored_at,
      lastScoredAt: row.last_scored_at,
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
                 -- 같은 시각 판단(백테스트는 종가 16:00 로 겹친다)은 종목 코드로 — 판단 카드(recentCases)와 같은 사례가 나오게
                 PARTITION BY signal_type, outcome ORDER BY judged_at DESC, symbol ASC
               ) AS rn
        FROM symbol_judgment_snapshots
        WHERE outcome IS NOT NULL AND return_rate IS NOT NULL AND ${this.countedSql}
      ) ranked
      WHERE rn <= ${limit}
      ORDER BY signal_type, outcome, judged_at DESC, symbol ASC
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
      where: { signalType, outcome, ...this.countedWhere },
      // 같은 시각 판단은 종목 코드로 — 성적표(`recentCasesByGroup`)와 같은 순서
      orderBy: [{ judgedAt: "desc" }, { symbol: "asc" }],
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
