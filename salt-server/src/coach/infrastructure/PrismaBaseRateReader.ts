import { Prisma } from "@prisma/client";

import prisma from "../../shared/infrastructure/prisma";
import {
  BASE_RATE_KEY,
  type BaseRateReader,
  type BaseRateRow,
  type BaseRateTriggerRow,
  type TradeCheckLedger,
  type TradeCheckMarket,
  type TradeCheckRecord,
} from "../domain";

/** 코치 심볼(`BTC` · `005930`) → 예측 키(`KRW-BTC` · `005930`) */
const forecastKey = (symbol: string, market: TradeCheckMarket) =>
  market === "kr" ? symbol : `KRW-${symbol.toUpperCase()}`;

const num = (v: Prisma.Decimal | number | null): number | null => (v === null ? null : Number(v));

/**
 * 조건부 기저율 뷰 읽기(F017 v2 단계 2) — 서버는 `forecast` 를 **뷰로만** 읽는다(salt-forecast `db-contract.md` §2).
 * 요청 경로라 한 문장씩 · 시장 통계 ≤ 20행 · 종목 문턱 ≤ 12행. 숫자 비교 외 계산 0
 */
export class PrismaBaseRateReader implements BaseRateReader {
  async stats(market: TradeCheckMarket): Promise<BaseRateRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        condition_id: string;
        horizon: number;
        as_of: Date;
        kind: BaseRateRow["kind"];
        status: BaseRateRow["status"];
        sample: number;
        sample_eff: number;
        sample_days: number;
        up_rate: number | null;
        up_low: number | null;
        up_high: number | null;
        mean: number | null;
        q10: number | null;
        q50: number | null;
        q90: number | null;
        hold_up_rate: number | null;
        hold_q10: number | null;
        hold_q50: number | null;
        hold_q90: number | null;
        differs: "higher" | "lower" | null;
        recent_differs: boolean | null;
      }>
    >`
      SELECT condition_id, horizon, as_of, kind, status, sample, sample_eff, sample_days, up_rate, up_low, up_high,
             mean, q10, q50, q90, hold_up_rate, hold_q10, hold_q50, hold_q90, differs, recent_differs
      FROM forecast.v_base_rate WHERE prereg_key = ${BASE_RATE_KEY} AND market = ${market}`;
    return rows.map((r) => ({
      market,
      conditionId: r.condition_id,
      horizon: r.horizon,
      asOf: r.as_of,
      kind: r.kind,
      status: r.status,
      sample: r.sample,
      sampleEff: r.sample_eff,
      sampleDays: r.sample_days,
      upRate: r.up_rate,
      upLow: r.up_low,
      upHigh: r.up_high,
      mean: r.mean,
      q10: r.q10,
      q50: r.q50,
      q90: r.q90,
      holdUpRate: r.hold_up_rate,
      holdQ10: r.hold_q10,
      holdQ50: r.hold_q50,
      holdQ90: r.hold_q90,
      differs: r.differs,
      recentDiffers: r.recent_differs,
    }));
  }

  async triggers(symbol: string, market: TradeCheckMarket): Promise<BaseRateTriggerRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        condition_id: string;
        applies_to: "next" | "closed";
        ref_close: Prisma.Decimal;
        ref_at: Date;
        price_at_least: Prisma.Decimal | null;
        price_at_most: Prisma.Decimal | null;
        open_at_least: Prisma.Decimal | null;
        value_at_least: Prisma.Decimal | null;
      }>
    >`
      SELECT condition_id, applies_to, ref_close, ref_at, price_at_least, price_at_most, open_at_least, value_at_least
      FROM forecast.v_base_rate_trigger
      WHERE prereg_key = ${BASE_RATE_KEY} AND market = ${market} AND symbol = ${forecastKey(symbol, market)}`;
    return rows.map((r) => ({
      conditionId: r.condition_id,
      appliesTo: r.applies_to,
      refClose: Number(r.ref_close),
      refAt: r.ref_at,
      priceAtLeast: num(r.price_at_least),
      priceAtMost: num(r.price_at_most),
      openAtLeast: num(r.open_at_least),
      valueAtLeast: num(r.value_at_least),
    }));
  }
}

/** 점검 원장 — 한 문장 `ON CONFLICT DO NOTHING`(경합은 오류가 안 나게, `prisma-database.md`) */
export class PrismaTradeCheckLedger implements TradeCheckLedger {
  async record(e: TradeCheckRecord): Promise<void> {
    await prisma.tradeCheckLedgerEntry.createMany({
      data: [
        {
          preregKey: e.preregKey,
          symbol: e.symbol,
          market: e.market,
          side: e.side,
          conditionId: e.conditionId,
          horizon: e.horizon,
          refAt: e.refAt,
          status: e.status,
          upRate: e.upRate,
          sampleEff: e.sampleEff,
          priceAtCheck: e.priceAtCheck === null ? null : new Prisma.Decimal(e.priceAtCheck),
          checkedAt: e.checkedAt,
        },
      ],
      skipDuplicates: true,
    });
  }
}
