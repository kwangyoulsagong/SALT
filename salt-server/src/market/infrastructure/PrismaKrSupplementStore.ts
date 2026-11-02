import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type {
  KrAfterHoursFact,
  KrIntradayPoint,
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
      INSERT INTO kr_index_quotes (code, value, change, change_rate, advancers, unchanged, decliners, high, low, trade_value, updated_at)
      SELECT u.*, (${at}::timestamptz AT TIME ZONE 'UTC') FROM unnest(
        ${col((f) => f.code)}::text[], ${col((f) => f.value)}::numeric[], ${col((f) => f.change)}::numeric[],
        ${col((f) => f.changeRate)}::numeric[], ${col((f) => f.advancers)}::int[], ${col((f) => f.unchanged)}::int[],
        ${col((f) => f.decliners)}::int[], ${col((f) => f.high)}::numeric[], ${col((f) => f.low)}::numeric[],
        ${col((f) => f.tradeValue)}::numeric[]
      ) AS u
      ON CONFLICT (code) DO UPDATE SET
        value = EXCLUDED.value, change = EXCLUDED.change, change_rate = EXCLUDED.change_rate,
        advancers = EXCLUDED.advancers, unchanged = EXCLUDED.unchanged, decliners = EXCLUDED.decliners,
        high = EXCLUDED.high, low = EXCLUDED.low, trade_value = EXCLUDED.trade_value,
        updated_at = EXCLUDED.updated_at`;
  }

  async indexQuotes(codes: string[]): Promise<StoredKrIndexQuote[]> {
    if (codes.length === 0) return [];
    const rows = await prisma.krIndexQuote.findMany({ where: { code: { in: codes } } });
    const orNull = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
    return rows.map((r) => ({
      code: r.code,
      value: Number(r.value),
      change: Number(r.change),
      changeRate: Number(r.changeRate),
      advancers: r.advancers,
      unchanged: r.unchanged,
      decliners: r.decliners,
      high: orNull(r.high),
      low: orNull(r.low),
      tradeValue: orNull(r.tradeValue),
      updatedAt: r.updatedAt,
    }));
  }

  /** 분으로 내린 시각 — 같은 분 두 번(재기동 · 겹친 회차)은 덮는다 */
  async appendIndexTicks(facts: Array<{ code: string; value: number }>, at: Date) {
    if (facts.length === 0) return;
    await prisma.$executeRaw`
      INSERT INTO kr_index_ticks (code, at, value)
      SELECT u.code, date_trunc('minute', ${at}::timestamptz AT TIME ZONE 'UTC'), u.value FROM unnest(
        ${facts.map((f) => f.code)}::text[], ${facts.map((f) => f.value)}::numeric[]
      ) AS u(code, value)
      ON CONFLICT (code, at) DO UPDATE SET value = EXCLUDED.value`;
  }

  /**
   * 지수마다 마지막 기록의 KST 날짜 하루치 — PK `(code, at)` 범위 스캔. KST 자정 = UTC 전날 15:00 이라 `+9h` 로 날을 자르고 되돌린다
   */
  async latestSessionIndexTicks(codes: string[]) {
    const out = new Map<string, KrIntradayPoint[]>();
    if (codes.length === 0) return out;
    const rows = await prisma.$queryRaw<Array<{ code: string; at: Date; value: Prisma.Decimal }>>`
      SELECT t.code, t.at, t.value
      FROM unnest(${codes}::text[]) AS c(code)
      CROSS JOIN LATERAL (SELECT max(at) AS m FROM kr_index_ticks WHERE code = c.code) l
      JOIN kr_index_ticks t ON t.code = c.code
        AND t.at >= date_trunc('day', l.m + interval '9 hours') - interval '9 hours'
      ORDER BY t.code, t.at`;
    for (const r of rows) {
      const list = out.get(r.code) ?? [];
      list.push({ at: r.at, value: Number(r.value) });
      out.set(r.code, list);
    }
    return out;
  }

  /** 하루 약 780행이라 한 문장이다 — 나눠 지울 크기가 아니다(`performance-database.md` §8 은 대량 정리 규칙) */
  async pruneIndexTicks(before: Date) {
    return prisma.$executeRaw`DELETE FROM kr_index_ticks WHERE at < (${before}::timestamptz AT TIME ZONE 'UTC')`;
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

  async upsertAfterHours(facts: KrAfterHoursFact[], at: Date) {
    if (facts.length === 0) return;
    const col = <T,>(pick: (f: KrAfterHoursFact) => T) => facts.map(pick);
    await prisma.$executeRaw`
      UPDATE kr_stock_quotes q SET
        after_hours_price = u.price, after_hours_change = u.change, after_hours_change_rate = u.change_rate,
        after_hours_volume = u.volume, after_hours_at = (${at}::timestamptz AT TIME ZONE 'UTC')
      FROM unnest(
        ${col((f) => f.code)}::text[], ${col((f) => f.price)}::numeric[], ${col((f) => f.change)}::numeric[],
        ${col((f) => f.changeRate)}::numeric[], ${col((f) => f.volume)}::bigint[]
      ) AS u(code, price, change, change_rate, volume)
      WHERE q.code = u.code`;
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
