import prisma from "../../shared/infrastructure/prisma";
import type { CompanyFact, CompanyFactReader } from "../domain";

/** 회사 사정 재료 — `extracted_fact` 한 종목(GIN `symbols`) · 알게 된 시각 최신순. 숫자는 원문 그대로 문자열(`::text`) */
export class PrismaCompanyFactReader implements CompanyFactReader {
  async recent(symbol: string, since: Date, limit: number): Promise<CompanyFact[]> {
    const rows = await prisma.$queryRaw<
      Array<{ who: string; what: string; amount: string | null; unit: string | null; compared_to: string | null; when_text: string | null;
        event_kind: string; source_kind: string; source_name: string; source_url: string; published_at: Date; available_at: Date }>
    >`
      SELECT who, what, amount::text AS amount, unit, compared_to, when_text, event_kind, source_kind, source_name, source_url,
        published_at, available_at
      FROM extracted_fact
      WHERE symbols @> ARRAY[${symbol}]::text[] AND available_at >= ${since}
      ORDER BY available_at DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      who: r.who,
      what: r.what,
      amount: r.amount,
      unit: r.unit,
      comparedTo: r.compared_to,
      whenText: r.when_text,
      eventKind: r.event_kind,
      sourceKind: r.source_kind === "disclosure" ? "disclosure" : "article",
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      publishedAt: r.published_at,
      availableAt: r.available_at,
    }));
  }
}
