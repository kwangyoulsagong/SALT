import prisma from "../../shared/infrastructure/prisma";
import { POST_MOVE_GAP_MAX_HOURS, type MoveEvidenceReader, type PriceAfterEvent } from "../domain";

/** 프로그램 수급 평소 — 앞 거래일을 이만큼(달력 일)까지 본다. 보관(`KR_FLOW_INTRADAY_RETENTION_DAYS`)이 그보다 짧으면 있는 만큼 */
const PROGRAM_USUAL_LOOKBACK_DAYS = 30;
const BAR_MINUTES = 5;

/**
 * 원인 근거의 재료(F017 v4 순서 1b · `SRV-REQ-053` FR-11) — 요청 경로라 **한 문장씩 · 큰 결과를 Node 로 옮기지 않는다**
 * (`workers-external.md`). 시각 칸은 전부 `timestamp without time zone`(UTC) — 넘기는 시각을 `AT TIME ZONE 'UTC'` 로 맞춘다.
 */
export class PrismaMoveEvidenceReader implements MoveEvidenceReader {
  async krSectorBreadth(code: string, since: Date) {
    const rows = await prisma.$queryRaw<Array<{ total: number; up: number; down: number }>>`
      SELECT count(*)::int AS total,
             (count(*) FILTER (WHERE q.change_rate > 0))::int AS up,
             (count(*) FILTER (WHERE q.change_rate < 0))::int AS down
      FROM kr_stock_master me
      JOIN kr_stock_master k
        ON coalesce(k.sector_mid_code, k.sector_code) = coalesce(me.sector_mid_code, me.sector_code) AND k.code <> me.code
      JOIN kr_stock_quotes q ON q.code = k.code
      WHERE me.code = ${code} AND q.price_updated_at >= (${since}::timestamptz AT TIME ZONE 'UTC')`;
    const row = rows[0];
    return row && row.total > 0 ? row : null;
  }

  async krProgramUsual(code: string, before: Date) {
    const from = new Date(before.getTime() - PROGRAM_USUAL_LOOKBACK_DAYS * 86_400_000);
    // 거래일마다 마지막 누적 한 행 — (code, at) PK 를 거꾸로 훑는다
    const rows = await prisma.$queryRaw<Array<{ days: number; usual: number | null }>>`
      SELECT count(*)::int AS days, avg(abs(v))::float8 AS usual
      FROM (
        SELECT DISTINCT ON ((at + interval '9 hours')::date) program_net_value AS v
        FROM kr_flow_intraday
        WHERE code = ${code}
          AND at < (${before}::timestamptz AT TIME ZONE 'UTC')
          AND at >= (${from}::timestamptz AT TIME ZONE 'UTC')
        ORDER BY (at + interval '9 hours')::date, at DESC
      ) d`;
    const row = rows[0];
    return { usualAbs: row?.usual ?? null, days: row?.days ?? 0 };
  }

  async pricesAfter(symbol: string, times: readonly Date[], windowMinutes: number) {
    const out = new Map<number, PriceAfterEvent>();
    if (times.length === 0) return out;
    const rows = await prisma.$queryRaw<Array<{ at: Date; before: number | null; after: number | null; after_ts: Date | null; first_ts: Date | null }>>`
      SELECT t.at AS at, b.close::float8 AS before, a.close::float8 AS after, a.timestamp AS after_ts, f.timestamp AS first_ts
      FROM unnest(${times.map((t) => t.toISOString())}::timestamptz[]) AS raw(at_tz)
      CROSS JOIN LATERAL (SELECT (raw.at_tz AT TIME ZONE 'UTC') AS at) t
      LEFT JOIN LATERAL (
        -- 소식 전에 이미 닫힌 마지막 봉
        SELECT close FROM price_history
        WHERE symbol = ${symbol} AND timeframe = '5m' AND timestamp <= t.at - make_interval(mins => ${BAR_MINUTES}::int)
        ORDER BY timestamp DESC LIMIT 1
      ) b ON true
      LEFT JOIN LATERAL (
        -- 소식이 걸친 봉 또는 그 뒤 첫 봉(장 밖 소식이면 다음 장 시작)
        SELECT timestamp FROM price_history
        WHERE symbol = ${symbol} AND timeframe = '5m' AND timestamp > t.at - make_interval(mins => ${BAR_MINUTES}::int)
          AND timestamp <= t.at + make_interval(hours => ${POST_MOVE_GAP_MAX_HOURS}::int)
        ORDER BY timestamp ASC LIMIT 1
      ) f ON true
      LEFT JOIN LATERAL (
        SELECT close, timestamp FROM price_history
        WHERE symbol = ${symbol} AND timeframe = '5m' AND timestamp >= f.timestamp
          AND timestamp <= greatest(t.at, f.timestamp) + make_interval(mins => ${windowMinutes - BAR_MINUTES}::int)
        ORDER BY timestamp DESC LIMIT 1
      ) a ON true`;
    for (const r of rows) {
      if (r.before === null || r.after === null || r.after_ts === null || r.first_ts === null) continue;
      // timestamp without time zone → 드라이버가 UTC 로 읽는다
      out.set(r.at.getTime(), {
        before: r.before,
        after: r.after,
        afterAt: new Date(r.after_ts.getTime() + BAR_MINUTES * 60_000),
        firstBarAt: r.first_ts,
      });
    }
    return out;
  }

  /**
   * 첫 일봉 날짜 — 거래소 일봉은 상장일부터 있다. `market_assets.listed_at` 은 **우리 수집이 처음 본 날**이라 쓰지 않는다
   * (2026-11-13 대조: 수집이 쉰 뒤 한꺼번에 들어온 31종목이 같은 날짜 · 실제 첫 봉은 2주 ~ 한 달 앞)
   */
  async cryptoListedAt(symbol: string) {
    const rows = await prisma.$queryRaw<Array<{ first: Date | null }>>`
      SELECT min(timestamp) AS first FROM price_history WHERE symbol = ${symbol} AND timeframe = '1d'`;
    return rows[0]?.first ?? null;
  }
}
