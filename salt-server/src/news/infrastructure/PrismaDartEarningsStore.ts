import prisma from "../../shared/infrastructure/prisma";
import { type DartEarningsFilingRow, type DartEarningsStore, type EarningsSchedule, type PendingScheduleDoc } from "../domain";

/** 실적 공시 · 일정(`dart_earnings_filing`) · 맞춤 표시(`dart_earnings_sync`) — 쓰기는 한 문장 · `ON CONFLICT` */
export class PrismaDartEarningsStore implements DartEarningsStore {
  async save(rows: Array<DartEarningsFilingRow & { type: string }>, at: Date) {
    const unique = [...new Map(rows.map((r) => [r.rceptNo, r])).values()].filter((r) => /^\d{8}$/.test(r.rceptDate));
    if (unique.length === 0) return 0;
    const col = <T,>(pick: (r: (typeof unique)[number]) => T) => unique.map(pick);
    return prisma.$executeRaw`
      INSERT INTO dart_earnings_filing (rcept_no, stock_code, report_name, pblntf_ty, rcept_date, first_seen_at, kind, period_end)
      SELECT u.rcept_no, u.stock_code, u.report_name, u.ty, to_date(u.rcept_date, 'YYYYMMDD'), ${at}, u.kind, u.period_end::date
      FROM unnest(${col((r) => r.rceptNo)}::text[], ${col((r) => r.stockCode)}::text[], ${col((r) => r.reportName)}::text[],
        ${col((r) => r.type)}::text[], ${col((r) => r.rceptDate)}::text[], ${col((r) => r.kind)}::text[],
        ${col((r) => r.periodEnd)}::text[])
        AS u(rcept_no, stock_code, report_name, ty, rcept_date, kind, period_end)
      ON CONFLICT (rcept_no) DO NOTHING`;
  }

  async synced(codes: string[]) {
    if (codes.length === 0) return new Map<string, Date>();
    const rows = await prisma.dartEarningsSync.findMany({ where: { stockCode: { in: codes } }, select: { stockCode: true, syncedAt: true } });
    return new Map(rows.map((r) => [r.stockCode, r.syncedAt]));
  }

  async markSynced(code: string, filings: number, at: Date) {
    // 처음 맞춤 시각(full_at)은 지킨다 — 10년 이력을 받은 날
    await prisma.$executeRaw`
      INSERT INTO dart_earnings_sync (stock_code, full_at, synced_at, filings) VALUES (${code}, ${at}, ${at}, ${filings})
      ON CONFLICT (stock_code) DO UPDATE SET synced_at = EXCLUDED.synced_at, filings = dart_earnings_sync.filings + EXCLUDED.filings`;
  }

  async pendingDocs(limit: number, since: Date): Promise<Array<PendingScheduleDoc & { attempts: number }>> {
    const rows = await prisma.$queryRaw<Array<{ rcept_no: string; kind: "ir" | "preview"; doc_attempts: number }>>`
      SELECT rcept_no, kind, doc_attempts FROM dart_earnings_filing
      WHERE kind IN ('ir', 'preview') AND doc_status IS NULL AND rcept_date >= ${since}::date
      ORDER BY rcept_date DESC, rcept_no DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({ rceptNo: r.rcept_no, kind: r.kind, attempts: r.doc_attempts }));
  }

  async saveDocs(results: Array<{ rceptNo: string; status: "ok" | "unparsed" | "failed" | null; schedule: EarningsSchedule | null }>) {
    if (results.length === 0) return;
    const col = <T,>(pick: (r: (typeof results)[number]) => T) => results.map(pick);
    await prisma.$executeRaw`
      UPDATE dart_earnings_filing f SET
        -- 시각은 ISO 문자열로 넘긴다 — Prisma 가 Date[] 를 정수 배열로 묶어 캐스트가 깨졌다(2026-11-17 첫 실행)
        doc_status = u.status,
        doc_attempts = f.doc_attempts + 1,
        scheduled_at = u.scheduled_at::timestamptz,
        time_known = u.time_known,
        about_earnings = u.about_earnings,
        period_end = COALESCE(u.period_end::date, f.period_end)
      FROM unnest(${col((r) => r.rceptNo)}::text[], ${col((r) => r.status)}::text[],
        ${col((r) => r.schedule?.scheduledAt.toISOString() ?? null)}::text[], ${col((r) => r.schedule?.timeKnown ?? null)}::boolean[],
        ${col((r) => r.schedule?.aboutEarnings ?? null)}::boolean[], ${col((r) => r.schedule?.periodEnd ?? null)}::text[])
        AS u(rcept_no, status, scheduled_at, time_known, about_earnings, period_end)
      WHERE f.rcept_no = u.rcept_no`;
  }
}
