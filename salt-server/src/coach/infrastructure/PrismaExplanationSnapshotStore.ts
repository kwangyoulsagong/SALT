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

  async prune(symbol: string, mode: CoachMode, keep: number): Promise<number> {
    // 한 문장 — 남길 것을 고르고 나머지를 지운다(행마다 지우지 않는다)
    return prisma.$executeRaw`
      DELETE FROM explanation_snapshot
      WHERE symbol = ${symbol} AND mode = ${mode}
        AND id NOT IN (
          SELECT id FROM explanation_snapshot
          WHERE symbol = ${symbol} AND mode = ${mode}
          ORDER BY generated_at DESC
          LIMIT ${keep}
        )`;
  }
}
