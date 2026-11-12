import prisma from "../../shared/infrastructure/prisma";
import {
  SHORT_DIRECTION_KEY,
  type ScenarioMarket,
  type ShortHorizonCellRow,
  type ShortHorizonPredictionRow,
  type ShortHorizonReader,
} from "../domain";

/** 코치 심볼(`BTC` · `005930`) → 예측 키(`KRW-BTC` · `005930`) — `PrismaBaseRateReader` 와 같은 규칙 */
const forecastKey = (symbol: string, market: ScenarioMarket) =>
  market === "kr" ? symbol : `KRW-${symbol.toUpperCase()}`;

/**
 * 단타 방향 확률 뷰 읽기(F017 v2 단계 5) — 서버는 `forecast` 를 **뷰로만** 읽는다(salt-forecast `db-contract.md` §2).
 * 요청마다 두 문장(칸 ≤ 3행 · 예측 ≤ 3행). 숫자를 다시 계산하지 않는다
 */
export class PrismaShortHorizonReader implements ShortHorizonReader {
  async cells(market: ScenarioMarket): Promise<ShortHorizonCellRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        market: ScenarioMarket;
        horizon: string;
        as_of: Date;
        model_version: string | null;
        status: string;
        blocked_reason: string | null;
        live_ready: boolean;
        window_from: Date | null;
        window_to: Date | null;
        eval_rows: number;
        track_origin: string;
        confident_calls: number;
        confident_hits: number;
        always_up_hits: number;
        misses: unknown;
      }>
    >`
      SELECT market, horizon, as_of, model_version, status, blocked_reason, live_ready, window_from, window_to, eval_rows,
             track_origin, confident_calls, confident_hits, always_up_hits, misses
      FROM forecast.v_short_horizon_cell WHERE prereg_key = ${SHORT_DIRECTION_KEY} AND market = ${market}`;
    return rows.map((r) => ({
      market: r.market,
      horizon: r.horizon,
      asOf: r.as_of,
      modelVersion: r.model_version,
      status: r.status,
      blockedReason: r.blocked_reason,
      liveReady: r.live_ready === true,
      windowFrom: r.window_from,
      windowTo: r.window_to,
      evalRows: Number(r.eval_rows),
      trackOrigin: r.track_origin,
      confidentCalls: Number(r.confident_calls),
      confidentHits: Number(r.confident_hits),
      alwaysUpHits: Number(r.always_up_hits),
      misses: r.misses,
    }));
  }

  async predictions(symbol: string, market: ScenarioMarket): Promise<ShortHorizonPredictionRow[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        horizon: string;
        as_of: Date;
        model_version: string;
        p_up: number;
        q10: number;
        q50: number;
        q90: number;
        ref_price: number;
        invalidation: number;
        expires_at: Date;
        renderable: boolean;
        blocked_reason: string | null;
      }>
    >`
      SELECT horizon, as_of, model_version, p_up, q10, q50, q90, ref_price::float8 AS ref_price,
             invalidation::float8 AS invalidation, expires_at, renderable, blocked_reason
      FROM forecast.v_short_horizon_card
      WHERE prereg_key = ${SHORT_DIRECTION_KEY} AND symbol = ${forecastKey(symbol, market)}`;
    return rows.map((r) => ({
      horizon: r.horizon,
      asOf: r.as_of,
      modelVersion: r.model_version,
      pUp: r.p_up,
      q10: r.q10,
      q50: r.q50,
      q90: r.q90,
      refPrice: Number(r.ref_price),
      invalidation: Number(r.invalidation),
      expiresAt: r.expires_at,
      renderable: r.renderable,
      blockedReason: r.blocked_reason,
    }));
  }
}
