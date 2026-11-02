import prisma from "../../shared/infrastructure/prisma";
import { MarketScheduleUnavailableError, type MarketScheduleReader, type UpcomingEventRow } from "../domain";

/**
 * `forecast.v_upcoming_event` 읽기(`DB-REQ-034` FR-7) — 서버는 `forecast` 를 뷰로만 읽는다(salt-forecast `db-contract.md` §2).
 * Prisma 모델이 없어 `$queryRaw`. 예측 스키마가 없는 DB(예측을 안 띄운 환경)면 503 으로 바꾼다 — 500 은 서버 장애로 읽힌다.
 */
export class PrismaMarketScheduleReader implements MarketScheduleReader {
  async upcoming(): Promise<UpcomingEventRow[]> {
    try {
      const rows = await prisma.$queryRaw<{ kind: string; event_at: Date; event_symbol: string }[]>`
        SELECT kind, event_at, event_symbol FROM forecast.v_upcoming_event ORDER BY event_at
      `;
      return rows.map((r) => ({ kind: r.kind, eventAt: r.event_at, eventSymbol: r.event_symbol }));
    } catch {
      throw new MarketScheduleUnavailableError();
    }
  }
}
