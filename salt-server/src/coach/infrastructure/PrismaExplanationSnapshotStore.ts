import type { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  CoachMode,
  ExplainProvider,
  ExplanationSentence,
  ExplanationSnapshotRecord,
  ExplanationSnapshotStore,
} from "../domain";

type Row = Prisma.ExplanationSnapshotGetPayload<object>;

const toRecord = (row: Row): ExplanationSnapshotRecord => ({
  symbol: row.symbol,
  mode: row.mode as CoachMode,
  fingerprint: row.fingerprint,
  action: row.action,
  source: row.source as ExplanationSnapshotRecord["source"],
  provider: row.provider as ExplainProvider,
  sentences: row.sentences as unknown as ExplanationSentence[],
  verifier: row.verifier as unknown as ExplanationSnapshotRecord["verifier"],
  factsHash: row.factsHash,
  generatedAt: row.generatedAt,
});

/**
 * 해설 스냅샷 (`DB-REQ-043` FR-1). 읽기는 인덱스 둘 — 지문 유일 키 · `(symbol, mode, generated_at desc)`.
 * 쓰기는 `ON CONFLICT DO NOTHING` 한 문장(경합은 오류가 안 나게, `prisma-database.md`)
 */
export class PrismaExplanationSnapshotStore implements ExplanationSnapshotStore {
  async find(symbol: string, mode: CoachMode, fingerprint: string): Promise<ExplanationSnapshotRecord | null> {
    const exact = await prisma.explanationSnapshot.findUnique({
      where: { symbol_mode_fingerprint: { symbol, mode, fingerprint } },
    });
    if (exact) return toRecord(exact);
    const latest = await prisma.explanationSnapshot.findFirst({
      where: { symbol, mode },
      orderBy: { generatedAt: "desc" },
    });
    return latest ? toRecord(latest) : null;
  }

  async save(r: ExplanationSnapshotRecord): Promise<boolean> {
    const { count } = await prisma.explanationSnapshot.createMany({
      data: [
        {
          symbol: r.symbol,
          mode: r.mode,
          fingerprint: r.fingerprint,
          action: r.action,
          source: r.source,
          provider: r.provider,
          sentences: r.sentences as unknown as Prisma.InputJsonValue,
          verifier: r.verifier as unknown as Prisma.InputJsonValue,
          factsHash: r.factsHash,
          generatedAt: r.generatedAt,
        },
      ],
      skipDuplicates: true,
    });
    return count > 0;
  }

  async prune(symbol: string, mode: CoachMode, keep: number, historyDays: number): Promise<number> {
    // 한 문장 — 남길 것(최근 keep 벌 ∪ 최근 historyDays 일의 날마다 마지막 한 벌)을 고르고 나머지를 지운다.
    // generated_at 은 timestamptz — KST 날짜는 `AT TIME ZONE 'Asia/Seoul'`(세션 시간대와 무관). 인덱스 (symbol, mode, generated_at desc) 안에서 끝난다
    return prisma.$executeRaw`
      DELETE FROM explanation_snapshot
      WHERE symbol = ${symbol} AND mode = ${mode}
        AND id NOT IN (
          (SELECT id FROM explanation_snapshot
           WHERE symbol = ${symbol} AND mode = ${mode}
           ORDER BY generated_at DESC
           LIMIT ${keep})
          UNION
          (SELECT DISTINCT ON ((generated_at AT TIME ZONE 'Asia/Seoul')::date) id FROM explanation_snapshot
           WHERE symbol = ${symbol} AND mode = ${mode}
             AND generated_at >= now() - make_interval(days => ${historyDays}::int)
           ORDER BY (generated_at AT TIME ZONE 'Asia/Seoul')::date, generated_at DESC)
        )`;
  }

  async listDaily(
    symbol: string,
    mode: CoachMode,
    opts: { since: Date; before: Date; limit: number }
  ): Promise<ExplanationSnapshotRecord[]> {
    // 날마다 마지막 한 벌 — DISTINCT ON 은 날 오름차순으로만 고를 수 있어 바깥에서 최신 날 먼저 다시 정렬한다
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT * FROM (
        SELECT DISTINCT ON ((generated_at AT TIME ZONE 'Asia/Seoul')::date)
          id, symbol, mode, fingerprint, action, source, provider, sentences, verifier,
          facts_hash AS "factsHash", generated_at AS "generatedAt"
        FROM explanation_snapshot
        WHERE symbol = ${symbol} AND mode = ${mode}
          -- 열은 timestamptz — ISO 문자열(Z)을 timestamptz 로 그대로 비교한다(세션 시간대 Asia/Seoul 과 무관)
          AND generated_at >= ${opts.since.toISOString()}::timestamptz
          AND generated_at < ${opts.before.toISOString()}::timestamptz
        ORDER BY (generated_at AT TIME ZONE 'Asia/Seoul')::date, generated_at DESC
      ) d
      ORDER BY "generatedAt" DESC
      LIMIT ${opts.limit}`;
    return rows.map(toRecord);
  }
}
