import { randomUUID } from "node:crypto";

import prisma from "../../shared/infrastructure/prisma";
import type { ExtractedFactRow, ExtractedFactStore } from "../domain";

/** 추출 사실(`extracted_fact`, `DB-REQ-043` FR-9) — 같은 (원천, 원문 키, 무엇)은 한 행 · 다시 추출하면 그 원문 키의 사실을 통째로 바꾼다. 문장 칸 없음 */
export class PrismaExtractedFactStore implements ExtractedFactStore {
  async saveMany(rows: ExtractedFactRow[], at: Date): Promise<number> {
    const unique = [...new Map(rows.map((r) => [`${r.sourceKind}|${r.sourceKey}|${r.what}`, r])).values()];
    if (unique.length === 0) return 0;
    const col = <T,>(pick: (r: ExtractedFactRow) => T) => unique.map(pick);
    const inserted = await prisma.$executeRaw`
      INSERT INTO extracted_fact (id, source_kind, source_key, symbols, who, what, amount, unit, compared_to, when_text, event_kind,
        published_at, available_at, source_url, source_name, extractor_version, created_at)
      SELECT u.id, u.source_kind, u.source_key, string_to_array(u.symbols, ','), u.who, u.what, u.amount::numeric, u.unit, u.compared_to,
        u.when_text, u.event_kind, u.published_at, u.available_at, u.source_url, u.source_name, u.extractor_version, ${at}
      FROM unnest(${unique.map(() => randomUUID())}::text[], ${col((r) => r.sourceKind)}::text[], ${col((r) => r.sourceKey)}::text[],
        ${col((r) => r.symbols.join(","))}::text[], ${col((r) => r.who)}::text[], ${col((r) => r.what)}::text[], ${col((r) => r.amount)}::text[],
        ${col((r) => r.unit)}::text[], ${col((r) => r.comparedTo)}::text[], ${col((r) => r.whenText)}::text[], ${col((r) => r.eventKind)}::text[],
        ${col((r) => r.publishedAt)}::timestamptz[], ${col((r) => r.availableAt)}::timestamptz[], ${col((r) => r.sourceUrl)}::text[],
        ${col((r) => r.sourceName)}::text[], ${col((r) => r.extractorVersion)}::text[])
        AS u(id, source_kind, source_key, symbols, who, what, amount, unit, compared_to, when_text, event_kind, published_at, available_at,
          source_url, source_name, extractor_version)
      ON CONFLICT (source_kind, source_key, what) DO UPDATE SET
        symbols = EXCLUDED.symbols, who = EXCLUDED.who, amount = EXCLUDED.amount, unit = EXCLUDED.unit, compared_to = EXCLUDED.compared_to,
        when_text = EXCLUDED.when_text, event_kind = EXCLUDED.event_kind, published_at = EXCLUDED.published_at, available_at = EXCLUDED.available_at,
        source_url = EXCLUDED.source_url, source_name = EXCLUDED.source_name, extractor_version = EXCLUDED.extractor_version, created_at = EXCLUDED.created_at`;
    // 다시 추출한 원문(깨진 DART 본문을 다시 받음, 2026-11-17)은 그 원문 키의 옛 사실을 바꾼다 — 이번에 안 나온 '무엇'은 지운다.
    // 처음 추출엔 옛 행이 없어 0행. 사실 id 를 인용하는 곳은 없다(회사 사정 · 온톨로지 export 는 그때그때 읽는다)
    await prisma.$executeRaw`
      DELETE FROM extracted_fact f
      USING unnest(${col((r) => r.sourceKind)}::text[], ${col((r) => r.sourceKey)}::text[]) AS u(source_kind, source_key)
      WHERE f.source_kind = u.source_kind AND f.source_key = u.source_key AND f.created_at < ${at}`;
    return inserted;
  }
}
