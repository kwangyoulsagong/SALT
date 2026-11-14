import prisma from "../../shared/infrastructure/prisma";
import { type DartFiling, type DartFilingStore, type DartType, type StoredDartFiling } from "../domain";

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** 공시 목록(`dart_filing`) · 백필 표시(`dart_backfill`) — 쓰기는 한 문장 · `ON CONFLICT` */
export class PrismaDartFilingStore implements DartFilingStore {
  async save(filings: Array<DartFiling & { type: DartType }>, at: Date) {
    const unique = [...new Map(filings.map((f) => [f.rceptNo, f])).values()].filter((f) => /^\d{8}$/.test(f.rceptDate));
    if (unique.length === 0) return 0;
    const col = <T,>(pick: (f: (typeof unique)[number]) => T) => unique.map(pick);
    return prisma.$executeRaw`
      INSERT INTO dart_filing (rcept_no, stock_code, corp_name, report_name, pblntf_ty, rcept_date, first_seen_at)
      SELECT u.rcept_no, u.stock_code, u.corp_name, u.report_name, u.ty, to_date(u.rcept_date, 'YYYYMMDD'), ${at}
      FROM unnest(${col((f) => f.rceptNo)}::text[], ${col((f) => f.stockCode)}::text[], ${col((f) => f.corpName)}::text[],
        ${col((f) => f.reportName)}::text[], ${col((f) => f.type)}::text[], ${col((f) => f.rceptDate)}::text[])
        AS u(rcept_no, stock_code, corp_name, report_name, ty, rcept_date)
      ON CONFLICT (rcept_no) DO NOTHING`;
  }

  async backfilled(codes: string[]) {
    if (codes.length === 0) return new Set<string>();
    const rows = await prisma.dartBackfill.findMany({ where: { stockCode: { in: codes } }, select: { stockCode: true } });
    return new Set(rows.map((r) => r.stockCode));
  }

  async markBackfilled(code: string, filings: number, at: Date) {
    await prisma.$executeRaw`
      INSERT INTO dart_backfill (stock_code, done_at, filings) VALUES (${code}, ${at}, ${filings})
      ON CONFLICT (stock_code) DO UPDATE SET done_at = EXCLUDED.done_at, filings = EXCLUDED.filings`;
  }

  async withoutBody(codes: string[], since: Date): Promise<DartFiling[]> {
    if (codes.length === 0) return [];
    const rows = await prisma.$queryRaw<Array<{ rcept_no: string; stock_code: string; corp_name: string; report_name: string; rcept_date: Date }>>`
      SELECT f.rcept_no, f.stock_code, f.corp_name, f.report_name, f.rcept_date
      FROM dart_filing f
      WHERE f.stock_code = ANY(${codes}::text[]) AND f.rcept_date >= ${since}::date
        AND NOT EXISTS (SELECT 1 FROM news_ai_body b WHERE b.key = 'dart:' || f.rcept_no)
      ORDER BY f.rcept_date DESC, f.rcept_no DESC
      LIMIT 5000`;
    return rows.map((r) => ({ rceptNo: r.rcept_no, stockCode: r.stock_code, corpName: r.corp_name, reportName: r.report_name, rceptDate: ymd(r.rcept_date), filer: "" }));
  }

  async recent(code: string, since: Date, limit: number): Promise<StoredDartFiling[]> {
    const rows = await prisma.dartFiling.findMany({
      where: { stockCode: code, rceptDate: { gte: since } },
      orderBy: [{ rceptDate: "desc" }, { rceptNo: "desc" }],
      take: limit,
    });
    return rows.map((r) => ({ rceptNo: r.rceptNo, stockCode: r.stockCode, corpName: r.corpName, reportName: r.reportName, rceptDate: ymd(r.rceptDate), firstSeenAt: r.firstSeenAt }));
  }
}
