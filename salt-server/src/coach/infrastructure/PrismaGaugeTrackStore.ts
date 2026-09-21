import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import type { GaugeKind, GaugeTrackStats, GaugeTrackStore } from "../domain";

/** 한 문장에 싣는 행 수. 심볼 ~300 × 구간 5 라 대개 한두 번이다. */
const UPSERT_BATCH = 500;

const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

/**
 * 게이지 적중률 사전 집계 (`gauge_track_records`, `DB-REQ-017` FR-55).
 *
 * 주인은 `coach` 하나다. 원천(심리 · 종가)은 `market` 의 것이라 집계는 그쪽 공개 API 가
 * 하고, 여기는 결과를 담기만 한다.
 */
export class PrismaGaugeTrackStore implements GaugeTrackStore {
  /**
   * `INSERT ... ON CONFLICT` 로 덮고, 이번 회차에 없던 줄을 지운다.
   *
   * 트랜잭션을 열지 않는다(`ddd-infrastructure.md` §7). 두 문장 사이에 읽으면 옛 줄이
   * 하나 더 보일 뿐이고, 그 줄도 직전 회차의 참값이다.
   */
  async replace(
    gauge: GaugeKind,
    records: Omit<GaugeTrackStats, "gauge">[],
    computedAt: Date
  ): Promise<void> {
    for (let i = 0; i < records.length; i += UPSERT_BATCH) {
      const values = records.slice(i, i + UPSERT_BATCH).map(
        (record) => Prisma.sql`(
          gen_random_uuid()::text, ${record.symbol}, ${gauge}, ${record.bucketCode},
          ${record.horizonDays}, ${record.sample},
          ${record.p25}::numeric, ${record.median}::numeric, ${record.p75}::numeric,
          ${record.positiveRate}::numeric,
          ${record.windowFrom}, ${record.windowTo}, ${computedAt}
        )`
      );

      await prisma.$executeRaw`
        INSERT INTO gauge_track_records (
          id, symbol, gauge, bucket, horizon_days, sample_count,
          p25_return, median_return, p75_return, positive_rate,
          window_from, window_to, computed_at
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT (symbol, gauge, bucket, horizon_days) DO UPDATE SET
          sample_count = EXCLUDED.sample_count,
          p25_return = EXCLUDED.p25_return,
          median_return = EXCLUDED.median_return,
          p75_return = EXCLUDED.p75_return,
          positive_rate = EXCLUDED.positive_rate,
          window_from = EXCLUDED.window_from,
          window_to = EXCLUDED.window_to,
          computed_at = EXCLUDED.computed_at
      `;
    }

    await prisma.gaugeTrackRecord.deleteMany({
      where: { gauge, computedAt: { lt: computedAt } },
    });
  }

  async find(
    symbol: string,
    gauge: GaugeKind,
    bucketCode: string,
    horizonDays: number
  ): Promise<GaugeTrackStats | null> {
    const row = await prisma.gaugeTrackRecord.findUnique({
      where: {
        symbol_gauge_bucket_horizonDays: {
          symbol,
          gauge,
          bucket: bucketCode,
          horizonDays,
        },
      },
    });
    if (!row) return null;

    return {
      symbol: row.symbol,
      gauge: row.gauge as GaugeKind,
      bucketCode: row.bucket,
      horizonDays: row.horizonDays,
      sample: row.sampleCount,
      p25: toNumber(row.p25Return),
      median: toNumber(row.medianReturn),
      p75: toNumber(row.p75Return),
      positiveRate: toNumber(row.positiveRate),
      windowFrom: row.windowFrom,
      windowTo: row.windowTo,
    };
  }
}
