import prisma from "../../shared/infrastructure/prisma";
import type {
  KrMarket,
  KrMarketAction,
  KrMarketActionKind,
  KrMarketActionSource,
  KrMarketStatusStore,
  KrViEventFact,
  KrViKind,
} from "../domain";

/**
 * 국내 시장 상태 저장소(F016 단계 A · `DB-REQ-041` FR-2 · 3). 쓰기는 `PrismaKrStockStore` 와 같이 `unnest` 한 문장 —
 * 시각은 `timestamptz AT TIME ZONE 'UTC'`(UTC 벽시계 열), 거래일은 `YYYY-MM-DD` 문자열을 `date` 로.
 * 경합은 `ON CONFLICT` 로 끝낸다(오류 코드로 흐름을 가르지 않는다 — `prisma-database.md`).
 */
export class PrismaKrMarketStatusStore implements KrMarketStatusStore {
  async upsertViEvents(events: KrViEventFact[], at: Date) {
    if (events.length === 0) return;
    // 한 회차 안 같은 (종목 · 발동 시각)이 두 쪽에 걸쳐 오면 ON CONFLICT 가 같은 행을 두 번 건드려 실패한다 — 먼저 하나로
    const unique = [...new Map(events.map((e) => [`${e.code}|${e.triggeredAt.getTime()}`, e])).values()];
    const col = <T,>(pick: (e: KrViEventFact) => T) => unique.map(pick);
    await prisma.$executeRaw`
      INSERT INTO kr_vi_event (code, triggered_at, released_at, kind, trigger_price, static_gap_rate, dynamic_gap_rate,
        trigger_count, collected_at)
      SELECT u.code, u.triggered_at AT TIME ZONE 'UTC', u.released_at AT TIME ZONE 'UTC', u.kind, u.trigger_price,
        u.static_gap_rate, u.dynamic_gap_rate, u.trigger_count, (${at}::timestamptz AT TIME ZONE 'UTC')
      FROM unnest(
        ${col((e) => e.code)}::text[], ${col((e) => e.triggeredAt)}::timestamptz[], ${col((e) => e.releasedAt)}::timestamptz[],
        ${col((e) => e.kind)}::text[], ${col((e) => e.triggerPrice)}::numeric[], ${col((e) => e.staticGapRate)}::numeric[],
        ${col((e) => e.dynamicGapRate)}::numeric[], ${col((e) => e.count)}::int[]
      ) AS u(code, triggered_at, released_at, kind, trigger_price, static_gap_rate, dynamic_gap_rate, trigger_count)
      ON CONFLICT (code, triggered_at) DO UPDATE SET
        -- 해제 시각은 한 번 생기면 지우지 않는다(다음 쪽이 해제 전 모습으로 다시 와도)
        released_at = COALESCE(EXCLUDED.released_at, kr_vi_event.released_at),
        kind = COALESCE(EXCLUDED.kind, kr_vi_event.kind),
        trigger_price = COALESCE(EXCLUDED.trigger_price, kr_vi_event.trigger_price),
        static_gap_rate = COALESCE(EXCLUDED.static_gap_rate, kr_vi_event.static_gap_rate),
        dynamic_gap_rate = COALESCE(EXCLUDED.dynamic_gap_rate, kr_vi_event.dynamic_gap_rate),
        trigger_count = COALESCE(EXCLUDED.trigger_count, kr_vi_event.trigger_count),
        collected_at = EXCLUDED.collected_at`;
  }

  async latestViEvents(codes: string[], since: Date) {
    const result = new Map<string, KrViEventFact>();
    if (codes.length === 0) return result;
    // 종목마다 최근 하나 — PK (code, triggered_at) 를 그대로 탄다
    const rows = await prisma.$queryRaw<
      Array<{
        code: string;
        triggered_at: Date;
        released_at: Date | null;
        kind: string | null;
        trigger_price: unknown;
        static_gap_rate: unknown;
        dynamic_gap_rate: unknown;
        trigger_count: number | null;
      }>
    >`
      SELECT DISTINCT ON (code) code, triggered_at, released_at, kind, trigger_price, static_gap_rate, dynamic_gap_rate, trigger_count
      FROM kr_vi_event
      WHERE code = ANY(${codes}::text[]) AND triggered_at >= (${since}::timestamptz AT TIME ZONE 'UTC')
      ORDER BY code, triggered_at DESC`;
    const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    for (const r of rows) {
      result.set(r.code, {
        code: r.code,
        triggeredAt: r.triggered_at,
        releasedAt: r.released_at,
        kind: toViKind(r.kind),
        triggerPrice: n(r.trigger_price),
        staticGapRate: n(r.static_gap_rate),
        dynamicGapRate: n(r.dynamic_gap_rate),
        count: r.trigger_count,
      });
    }
    return result;
  }

  async upsertMarketActions(actions: KrMarketAction[], at: Date) {
    if (actions.length === 0) return;
    const col = <T,>(pick: (a: KrMarketAction) => T) => actions.map(pick);
    await prisma.$executeRaw`
      INSERT INTO kr_market_action (market, trade_date, kind, stage, direction, started_at, ended_at, source, updated_at)
      SELECT u.market, u.trade_date::date, u.kind, u.stage, u.direction, u.started_at AT TIME ZONE 'UTC',
        u.ended_at AT TIME ZONE 'UTC', u.source, (${at}::timestamptz AT TIME ZONE 'UTC')
      FROM unnest(
        ${col((a) => a.market)}::text[], ${col((a) => a.tradeDate)}::text[], ${col((a) => a.kind)}::text[],
        ${col((a) => a.stage)}::int[], ${col((a) => a.direction)}::text[], ${col((a) => a.startedAt)}::timestamptz[],
        ${col((a) => a.endedAt)}::timestamptz[], ${col((a) => a.source)}::text[]
      ) AS u(market, trade_date, kind, stage, direction, started_at, ended_at, source)
      ON CONFLICT (market, trade_date, kind, stage) DO UPDATE SET
        -- 시작은 처음 본 값 그대로 · 끝은 한 번 보면 지우지 않는다 · 실시간 원천(feed)이 추정을 이긴다
        ended_at = COALESCE(kr_market_action.ended_at, EXCLUDED.ended_at),
        source = CASE WHEN kr_market_action.source = 'feed' THEN 'feed' ELSE EXCLUDED.source END,
        updated_at = EXCLUDED.updated_at`;
  }

  async marketActions(tradeDate: string): Promise<KrMarketAction[]> {
    const rows = await prisma.krMarketAction.findMany({
      where: { tradeDate: new Date(`${tradeDate}T00:00:00Z`) },
      orderBy: [{ startedAt: "asc" }],
    });
    return rows.map((r) => ({
      market: r.market as KrMarket,
      tradeDate,
      kind: r.kind as KrMarketActionKind,
      stage: r.stage,
      direction: r.direction === "up" ? "up" : "down",
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      source: r.source as KrMarketActionSource,
    }));
  }
}

const VI_KINDS: readonly KrViKind[] = ["static", "dynamic", "both"];
const toViKind = (v: string | null): KrViKind | null =>
  v !== null && (VI_KINDS as readonly string[]).includes(v) ? (v as KrViKind) : null;
