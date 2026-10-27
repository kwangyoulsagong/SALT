import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  KrIndexQuoteFact,
  KrInvestorFlowFact,
  KrSupplementStore,
  StoredKrIndexQuote,
} from "../domain";

/**
 * 국내 주식 부가 정보 저장소(F011 슬라이스 6 · `DB-REQ-033`). 쓰기는 `PrismaKrStockStore` 와 같이 `unnest` 한 문장 —
 * 시각은 `timestamptz AT TIME ZONE 'UTC'`(그 파일 머리 주석의 9시간 사고), 거래일은 `YYYY-MM-DD` 문자열을 `date` 로.
 */
export class PrismaKrSupplementStore implements KrSupplementStore {
  async upsertIndexQuotes(facts: KrIndexQuoteFact[], at: Date) {
    if (facts.length === 0) return;
    const col = <T,>(pick: (f: KrIndexQuoteFact) => T) => facts.map(pick);
    await prisma.$executeRaw`
      INSERT INTO kr_index_quotes (code, value, change, change_rate, advancers, unchanged, decliners, updated_at)
      SELECT u.*, (${at}::timestamptz AT TIME ZONE 'UTC') FROM unnest(
        ${col((f) => f.code)}::text[], ${col((f) => f.value)}::numeric[], ${col((f) => f.change)}::numeric[],
        ${col((f) => f.changeRate)}::numeric[], ${col((f) => f.advancers)}::int[], ${col((f) => f.unchanged)}::int[],
        ${col((f) => f.decliners)}::int[]
      ) AS u
      ON CONFLICT (code) DO UPDATE SET
        value = EXCLUDED.value, change = EXCLUDED.change, change_rate = EXCLUDED.change_rate,
        advancers = EXCLUDED.advancers, unchanged = EXCLUDED.unchanged, decliners = EXCLUDED.decliners,
        updated_at = EXCLUDED.updated_at`;
  }

  async indexQuotes(codes: string[]): Promise<StoredKrIndexQuote[]> {
    if (codes.length === 0) return [];
    const rows = await prisma.krIndexQuote.findMany({ where: { code: { in: codes } } });
    return rows.map((r) => ({
      code: r.code,
      value: Number(r.value),
      change: Number(r.change),
      changeRate: Number(r.changeRate),
      advancers: r.advancers,
      unchanged: r.unchanged,
      decliners: r.decliners,
      updatedAt: r.updatedAt,
    }));
  }

  async upsertInvestorFlows(code: string, rows: KrInvestorFlowFact[], at: Date) {
    if (rows.length === 0) return;
    const col = <T,>(pick: (f: KrInvestorFlowFact) => T) => rows.map(pick);
    await prisma.$executeRaw`
      INSERT INTO kr_stock_investor_flows (code, trade_date, individual_quantity, individual_value, foreign_quantity,
        foreign_value, institution_quantity, institution_value, collected_at)
      SELECT ${code}, u.*, (${at}::timestamptz AT TIME ZONE 'UTC') FROM unnest(
        ${col((f) => f.date)}::date[],
        ${col((f) => f.individual.quantity)}::bigint[], ${col((f) => f.individual.value)}::numeric[],
        ${col((f) => f.foreign.quantity)}::bigint[], ${col((f) => f.foreign.value)}::numeric[],
        ${col((f) => f.institution.quantity)}::bigint[], ${col((f) => f.institution.value)}::numeric[]
      ) AS u
      ON CONFLICT (code, trade_date) DO UPDATE SET
        individual_quantity = EXCLUDED.individual_quantity, individual_value = EXCLUDED.individual_value,
        foreign_quantity = EXCLUDED.foreign_quantity, foreign_value = EXCLUDED.foreign_value,
        institution_quantity = EXCLUDED.institution_quantity, institution_value = EXCLUDED.institution_value,
        collected_at = EXCLUDED.collected_at`;
  }

  async investorFlowCodesCollectedSince(since: Date) {
    const rows = await prisma.krStockInvestorFlow.findMany({
      where: { collectedAt: { gte: since } },
      distinct: ["code"],
      select: { code: true },
    });
    return rows.map((r) => r.code);
  }

  async investorFlows(code: string, days: number) {
    const rows = await prisma.krStockInvestorFlow.findMany({
      where: { code },
      orderBy: { tradeDate: "desc" },
      take: days,
    });
    const value = (v: Prisma.Decimal) => Number(v);
    return {
      rows: rows.map((r) => ({
        // `@db.Date` 는 UTC 자정 Date 로 온다 — 앞 10자리가 그 거래일이다
        date: r.tradeDate.toISOString().slice(0, 10),
        individual: { quantity: r.individualQuantity, value: value(r.individualValue) },
        foreign: { quantity: r.foreignQuantity, value: value(r.foreignValue) },
        institution: { quantity: r.institutionQuantity, value: value(r.institutionValue) },
      })),
      collectedAt: rows.reduce<Date | null>((latest, r) => (!latest || r.collectedAt > latest ? r.collectedAt : latest), null),
    };
  }
}
