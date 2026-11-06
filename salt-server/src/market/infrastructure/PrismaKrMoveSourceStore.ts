import prisma from "../../shared/infrastructure/prisma";
import {
  KR_PRUNE_BATCH,
  kstDateOf,
  krSectorIndexCodeOf,
  type KrMoveSourceStore,
  type KrNewsKind,
  type KrNewsTitleFact,
  type KrProgramFlowFact,
  type KrSectorIndexFact,
} from "../domain";

/**
 * 국내 등락 원천 저장소(F016 단계 B · `DB-REQ-041` FR-1 · 4 · 5). 쓰기는 단계 A 와 같이 `unnest` 한 문장 · `ON CONFLICT` —
 * 시각은 `timestamptz AT TIME ZONE 'UTC'`(UTC 벽시계 열). 오류 코드로 흐름을 가르지 않는다(`prisma-database.md`).
 */
export class PrismaKrMoveSourceStore implements KrMoveSourceStore {
  async saveNewsTitles(facts: Array<KrNewsTitleFact & { kind: KrNewsKind; promo: boolean }>, at: Date) {
    // 쪽 경계(같은 시각)에서 같은 제목이 두 번 오면 한 문장 안 ON CONFLICT 가 같은 행을 두 번 건드린다 — 먼저 하나로
    const unique = [...new Map(facts.map((f) => [f.serial, f])).values()];
    if (unique.length === 0) return 0;
    const col = <T,>(pick: (f: (typeof unique)[number]) => T) => unique.map(pick);
    const links = unique.flatMap((f) => f.codes.map((code) => ({ serial: f.serial, code, publishedAt: f.publishedAt })));
    // 제목 → 연결 순서, 둘 다 DO NOTHING. 트랜잭션을 열지 않는다(`ddd-infrastructure.md` §7) — 연결이 실패해도 다음 회차가 같은
    // 쪽을 다시 받으면 연결은 받은 제목 전부로 다시 시도한다(이미 있는 제목이어도)
    const inserted = await prisma.$executeRaw`
        INSERT INTO kr_news_title (serial, provider_code, provider_name, kind, category_code, title, promo, published_at, collected_at)
        SELECT u.serial, u.provider_code, u.provider_name, u.kind, u.category_code, u.title, u.promo,
          u.published_at AT TIME ZONE 'UTC', (${at}::timestamptz AT TIME ZONE 'UTC')
        FROM unnest(
          ${col((f) => f.serial)}::text[], ${col((f) => f.providerCode)}::text[], ${col((f) => f.providerName)}::text[],
          ${col((f) => f.kind)}::text[], ${col((f) => f.categoryCode)}::text[], ${col((f) => f.title)}::text[],
          ${col((f) => f.promo)}::boolean[], ${col((f) => f.publishedAt)}::timestamptz[]
        ) AS u(serial, provider_code, provider_name, kind, category_code, title, promo, published_at)
        ON CONFLICT (serial) DO NOTHING`;
    await prisma.$executeRaw`
        INSERT INTO kr_news_title_symbol (serial, code, published_at)
        SELECT u.serial, u.code, u.published_at AT TIME ZONE 'UTC'
        FROM unnest(
          ${links.map((l) => l.serial)}::text[], ${links.map((l) => l.code)}::text[], ${links.map((l) => l.publishedAt)}::timestamptz[]
        ) AS u(serial, code, published_at)
        ON CONFLICT (serial, code) DO NOTHING`;
    return inserted;
  }

  async latestNewsPublishedAt() {
    const row = await prisma.krNewsTitle.findFirst({ orderBy: { publishedAt: "desc" }, select: { publishedAt: true } });
    return row?.publishedAt ?? null;
  }

  async newsCollectedAt() {
    const row = await prisma.krNewsTitle.aggregate({ _max: { collectedAt: true } });
    return row._max.collectedAt ?? null;
  }

  async newsTitles(code: string, since: Date, limit: number) {
    // (code, published_at desc) 인덱스로 그 종목 오늘 연결만 → 제목 PK. 광고성은 여기서 뺀다
    const rows = await prisma.$queryRaw<
      Array<{ serial: string; kind: string; provider_name: string; published_at: Date; title: string }>
    >`
      SELECT t.serial, t.kind, t.provider_name, t.published_at, t.title
      FROM kr_news_title_symbol s
      JOIN kr_news_title t ON t.serial = s.serial
      WHERE s.code = ${code} AND s.published_at >= (${since}::timestamptz AT TIME ZONE 'UTC') AND NOT t.promo
      ORDER BY s.published_at DESC, t.serial DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      serial: r.serial,
      kind: (r.kind === "disclosure" ? "disclosure" : "news") as KrNewsKind,
      providerName: r.provider_name,
      publishedAt: r.published_at,
      title: r.title,
    }));
  }

  async sectorIndexCodes(codes: string[]) {
    const result = new Map<string, string>();
    if (codes.length === 0) return result;
    const rows = await prisma.krStockMaster.findMany({ where: { code: { in: codes } }, select: { code: true, sectorCode: true } });
    for (const r of rows) {
      const sector = krSectorIndexCodeOf(r.sectorCode);
      if (sector) result.set(r.code, sector);
    }
    return result;
  }

  async upsertSectorIndices(facts: KrSectorIndexFact[], at: Date) {
    if (facts.length === 0) return;
    const tradeDate = kstDateOf(at);
    const col = <T,>(pick: (f: KrSectorIndexFact) => T) => facts.map(pick);
    // 두 문장 — 둘 다 같은 값으로 덮어 멱등이라 트랜잭션 없이 다음 회차가 맞춘다
    await prisma.$executeRaw`
        INSERT INTO kr_sector_index_quote (code, trade_date, value, change, change_rate, updated_at)
        SELECT u.code, ${tradeDate}::date, u.value, u.change, u.change_rate, (${at}::timestamptz AT TIME ZONE 'UTC')
        FROM unnest(${col((f) => f.code)}::text[], ${col((f) => f.value)}::numeric[], ${col((f) => f.change)}::numeric[],
          ${col((f) => f.changeRate)}::numeric[]) AS u(code, value, change, change_rate)
        ON CONFLICT (code) DO UPDATE SET trade_date = EXCLUDED.trade_date, value = EXCLUDED.value, change = EXCLUDED.change,
          change_rate = EXCLUDED.change_rate, updated_at = EXCLUDED.updated_at`;
    // 같은 거래일은 마지막 값이 덮는다 — 장이 끝나면 그 값이 종가다
    await prisma.$executeRaw`
        INSERT INTO kr_sector_index_daily (code, trade_date, close, change_rate, updated_at)
        SELECT u.code, ${tradeDate}::date, u.value, u.change_rate, (${at}::timestamptz AT TIME ZONE 'UTC')
        FROM unnest(${col((f) => f.code)}::text[], ${col((f) => f.value)}::numeric[], ${col((f) => f.changeRate)}::numeric[])
          AS u(code, value, change_rate)
        ON CONFLICT (code, trade_date) DO UPDATE SET close = EXCLUDED.close, change_rate = EXCLUDED.change_rate,
          updated_at = EXCLUDED.updated_at`;
  }

  async sectorIndices(codes: string[]) {
    if (codes.length === 0) return [];
    const rows = await prisma.krSectorIndexQuote.findMany({ where: { code: { in: codes } } });
    return rows.map((r) => ({
      code: r.code,
      tradeDate: r.tradeDate.toISOString().slice(0, 10),
      value: Number(r.value),
      change: Number(r.change),
      changeRate: Number(r.changeRate),
      updatedAt: r.updatedAt,
    }));
  }

  async appendProgramFlows(facts: KrProgramFlowFact[], at: Date) {
    const unique = [...new Map(facts.map((f) => [`${f.code}|${f.at.getTime()}`, f])).values()];
    if (unique.length === 0) return;
    const col = <T,>(pick: (f: KrProgramFlowFact) => T) => unique.map(pick);
    await prisma.$executeRaw`
      INSERT INTO kr_flow_intraday (code, at, program_net_quantity, program_net_value, program_buy_value, program_sell_value, collected_at)
      SELECT u.code, u.at AT TIME ZONE 'UTC', u.qty, u.net, u.buy, u.sell, (${at}::timestamptz AT TIME ZONE 'UTC')
      FROM unnest(
        ${col((f) => f.code)}::text[], ${col((f) => f.at)}::timestamptz[], ${col((f) => f.netQuantity.toString())}::bigint[],
        ${col((f) => f.netValue)}::numeric[], ${col((f) => f.buyValue)}::numeric[], ${col((f) => f.sellValue)}::numeric[]
      ) AS u(code, at, qty, net, buy, sell)
      ON CONFLICT (code, at) DO NOTHING`;
  }

  async latestProgramFlow(code: string, since: Date) {
    const row = await prisma.krFlowIntraday.findFirst({
      where: { code, at: { gte: since } },
      orderBy: { at: "desc" },
    });
    if (!row) return null;
    return {
      code: row.code,
      at: row.at,
      netQuantity: row.programNetQuantity,
      netValue: Number(row.programNetValue),
      buyValue: Number(row.programBuyValue),
      sellValue: Number(row.programSellValue),
      collectedAt: row.collectedAt,
    };
  }

  async prune(cutoffs: { news: Date; flows: Date; viEvents: Date }) {
    // 나눠 지운다 — 한 번에 지우면 긴 트랜잭션 + 대량 죽은 튜플(`performance-database.md` §8). 연결 표는 FK CASCADE
    const drain = async (remove: () => Promise<number>) => {
      let total = 0;
      for (;;) {
        const n = await remove();
        total += n;
        if (n < KR_PRUNE_BATCH) return total;
      }
    };
    const news = await drain(() => prisma.$executeRaw`
      DELETE FROM kr_news_title WHERE serial IN (
        SELECT serial FROM kr_news_title WHERE published_at < (${cutoffs.news}::timestamptz AT TIME ZONE 'UTC') LIMIT ${KR_PRUNE_BATCH})`);
    const flows = await drain(() => prisma.$executeRaw`
      DELETE FROM kr_flow_intraday WHERE (code, at) IN (
        SELECT code, at FROM kr_flow_intraday WHERE at < (${cutoffs.flows}::timestamptz AT TIME ZONE 'UTC') LIMIT ${KR_PRUNE_BATCH})`);
    const viEvents = await drain(() => prisma.$executeRaw`
      DELETE FROM kr_vi_event WHERE (code, triggered_at) IN (
        SELECT code, triggered_at FROM kr_vi_event WHERE triggered_at < (${cutoffs.viEvents}::timestamptz AT TIME ZONE 'UTC')
        LIMIT ${KR_PRUNE_BATCH})`);
    return { news, flows, viEvents };
  }
}
