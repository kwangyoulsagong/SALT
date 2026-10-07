import Decimal from "decimal.js";
import prisma from "../../shared/infrastructure/prisma";
import type {
  DailyBar,
  EventCardRow,
  ForecastCardRow,
  ForecastReader,
  MarketRegimeState,
  MarketWarningState,
  PositioningRow,
  RealizedVolatility,
  SignalReactionRow,
  SymbolRisk,
  TargetWeightLiveRecord,
} from "../domain";
import { TARGET_WEIGHT_LIVE_PREREG_KEY } from "../domain";

interface CardSqlRow {
  horizon_weeks: number;
  as_of: Date | null;
  model_version: string;
  base_close: string | null;
  q05: number | null;
  q10: number | null;
  q25: number | null;
  q50: number | null;
  q75: number | null;
  q90: number | null;
  q95: number | null;
  p_up: number | null;
  direction: string | null;
  renderable: boolean | null;
  blocked_reason: string | null;
  range_renderable: boolean | null;
  range_blocked_reason: string | null;
  score_kind: string;
  sample: number;
  coverage90: number | null;
  width90: number | null;
  baseline_width90: number | null;
  pinball_skill: number | null;
  pinball_skill_ci_low: number | null;
  direction_calls: number;
  direction_hits: number;
  direction_base_rate: number | null;
  recent_misses: { asOf: string; realized: number; q05: number; q95: number }[] | null;
}

/**
 * `forecast.v_forecast_card` 읽기 — **뷰만** 읽는다(`salt-forecast/.claude/rules/db-contract.md` §2 · §4).
 *
 * 쓰기 주인은 `salt-forecast`(Python)이고 Prisma 모델이 없다(`DB-REQ-029` — SQL 전용 마이그레이션).
 * 그래서 `$queryRaw` 다. 심볼은 코치 모양 `BTC` → 전망 모양 `KRW-BTC`.
 */
interface EventSqlRow {
  kind: string;
  event_at: Date;
  announced_at: Date;
  source: string;
  horizon_days: number;
  as_of: Date;
  sample: number;
  q05: number | null;
  q25: number | null;
  q50: number | null;
  q75: number | null;
  q95: number | null;
  up_rate: number | null;
  baseline_q05: number | null;
  baseline_q50: number | null;
  baseline_q95: number | null;
  move_ratio: number | null;
  pre_return_5d_median: number | null;
  recent_misses: EventCardRow["recentMisses"];
  recent_events: EventCardRow["recentEvents"];
  renderable: boolean;
  blocked_reason: string | null;
}

type StatsSqlRow = Omit<EventSqlRow, "kind" | "event_at" | "announced_at" | "source">;

const toStats = (r: StatsSqlRow) => ({
  horizonDays: Number(r.horizon_days),
  asOf: r.as_of,
  sample: Number(r.sample),
  q05: r.q05,
  q25: r.q25,
  q50: r.q50,
  q75: r.q75,
  q95: r.q95,
  upRate: r.up_rate,
  baselineQ05: r.baseline_q05,
  baselineQ50: r.baseline_q50,
  baselineQ95: r.baseline_q95,
  moveRatio: r.move_ratio,
  preReturn5dMedian: r.pre_return_5d_median,
  recentMisses: r.recent_misses,
  recentEvents: r.recent_events,
  renderable: r.renderable,
  blockedReason: r.blocked_reason,
});

interface SignalSqlRow {
  as_of: Date;
  bar_open: Date;
  funding_rate: number | null;
  funding_pct_1y: number | null;
  funding_sample: number;
  funding_state: string | null;
  oi_usd: number | null;
  oi_at: Date | null;
  oi_change_7d: number | null;
  kimchi_premium: number | null;
  kimchi_state: string | null;
  kimchi_since: Date | null;
  fx_usdkrw: number | null;
  fx_observed_at: Date | null;
}

interface MarketRegimeSqlRow {
  as_of: Date;
  close: number;
  sma_200d: number | null;
  trend_open: boolean;
  hmm_p_high: number | null;
  drawdown_365d: number | null;
  gate_key: string | null;
  gate_open: boolean;
  event_factor: number;
  next_event_kind: string | null;
  next_event_at: Date | null;
  prereg_key: string;
}

interface TargetWeightLiveSqlRow {
  target: number;
  as_of: Date;
  first_rebalance_at: Date;
  n_weeks: number;
  n_excluded: number;
  cum_return: number | null;
  btc_cum_return: number | null;
  mdd: number | null;
  btc_mdd: number | null;
  vol: number | null;
  upside: number | null;
  downside: number | null;
  worst_weeks: Array<{ rebalance_at: string; strategy?: number | null; btc?: number | null; exposure?: number | null }> | null;
}

export class PrismaForecastReader implements ForecastReader {
  async eventCards(symbol: string): Promise<EventCardRow[]> {
    const rows = await prisma.$queryRaw<EventSqlRow[]>`
      SELECT kind, event_at, announced_at, source, horizon_days, as_of, sample,
             q05, q25, q50, q75, q95, up_rate, baseline_q05, baseline_q50, baseline_q95,
             move_ratio, pre_return_5d_median, recent_misses, recent_events, renderable, blocked_reason
      FROM forecast.v_event_card
      WHERE symbol = ${`KRW-${symbol}`}
      ORDER BY event_at, horizon_days
    `;
    return rows.map((r) => ({
      kind: r.kind,
      eventAt: r.event_at,
      announcedAt: r.announced_at,
      source: r.source,
      ...toStats(r),
    }));
  }

  /**
   * 쏠림 신호 — 상태 뷰 한 행 + 반응 뷰(종류 4 × 기간 3). 두 뷰 모두 `DISTINCT ON` 최신 한 행씩이다(`FC-REQ-007`)
   */
  async positioning(symbol: string): Promise<{ row: PositioningRow | null; reactions: SignalReactionRow[] }> {
    const key = `KRW-${symbol}`;
    const [states, stats] = await Promise.all([
      prisma.$queryRaw<SignalSqlRow[]>`
        SELECT as_of, bar_open, funding_rate, funding_pct_1y, funding_sample, funding_state, oi_usd, oi_at,
               oi_change_7d, kimchi_premium, kimchi_state, kimchi_since, fx_usdkrw, fx_observed_at
        FROM forecast.v_market_signal WHERE symbol = ${key}
      `,
      prisma.$queryRaw<(StatsSqlRow & { kind: string })[]>`
        SELECT kind, horizon_days, as_of, sample, q05, q25, q50, q75, q95, up_rate,
               baseline_q05, baseline_q50, baseline_q95, move_ratio, pre_return_5d_median,
               recent_misses, recent_events, renderable, blocked_reason
        FROM forecast.v_signal_reaction WHERE symbol = ${key}
        ORDER BY kind, horizon_days
      `,
    ]);
    const s = states[0];
    const row: PositioningRow | null = s
      ? {
          asOf: s.as_of,
          barOpen: s.bar_open,
          fundingRate: s.funding_rate,
          fundingPct1y: s.funding_pct_1y,
          fundingSample: Number(s.funding_sample),
          fundingState: s.funding_state,
          oiUsd: s.oi_usd,
          oiAt: s.oi_at,
          oiChange7d: s.oi_change_7d,
          kimchiPremium: s.kimchi_premium,
          kimchiState: s.kimchi_state,
          kimchiSince: s.kimchi_since,
          fxUsdKrw: s.fx_usdkrw,
          fxObservedAt: s.fx_observed_at,
        }
      : null;
    return { row, reactions: stats.map((r) => ({ kind: r.kind, ...toStats(r) })) };
  }

  /**
   * 닫힌 일봉만 — 뷰가 이미 `interval = '1d'` 이고 `available_at` 이 마감 시각이다. 지금보다 늦게 쓸 수 있는 봉
   * (진행 중인 오늘 봉)은 거른다. 심볼은 코치 모양 `BTC` ↔ 전망 모양 `KRW-BTC`
   */
  async dailyCloses(symbols: string[], from: Date, to?: Date): Promise<Map<string, DailyBar[]>> {
    const result = new Map<string, DailyBar[]>();
    if (!symbols.length) return result;
    // `to` 가 없으면 끝이 열려 있다 — 무한대 대신 먼 미래
    const until = to ?? new Date("9999-12-31T00:00:00Z");
    const rows = await prisma.$queryRaw<{ symbol: string; open_time: Date; close: string }[]>`
      SELECT symbol, open_time, close::text AS close FROM forecast.v_daily_close
      WHERE symbol = ANY(${symbols.map((symbol) => `KRW-${symbol}`)}::text[])
        AND open_time >= ${from} AND open_time <= ${until} AND available_at <= now()
      ORDER BY symbol, open_time
    `;
    for (const row of rows) {
      const symbol = row.symbol.replace(/^KRW-/, "");
      const bars = result.get(symbol) ?? [];
      bars.push({ openTime: row.open_time, close: new Decimal(row.close) });
      result.set(symbol, bars);
    }
    return result;
  }

  async recentCloses(symbol: string, days: number): Promise<{ date: string; close: number }[]> {
    const rows = await prisma.$queryRaw<{ open_time: Date; close: string }[]>`
      SELECT open_time, close::text AS close FROM forecast.v_daily_close
      WHERE symbol = ${`KRW-${symbol}`} ORDER BY open_time DESC LIMIT ${days}
    `;
    return rows.reverse().map((r) => ({ date: r.open_time.toISOString().slice(0, 10), close: Number(r.close) }));
  }

  async cards(symbol: string): Promise<ForecastCardRow[]> {
    const rows = await prisma.$queryRaw<CardSqlRow[]>`
      SELECT horizon_weeks, as_of, model_version, base_close::text AS base_close,
             q05, q10, q25, q50, q75, q90, q95, p_up, direction, renderable, blocked_reason,
             range_renderable, range_blocked_reason, score_kind, sample, coverage90, width90,
             baseline_width90, pinball_skill, pinball_skill_ci_low, direction_calls, direction_hits,
             direction_base_rate, recent_misses
      FROM forecast.v_forecast_card
      WHERE symbol = ${`KRW-${symbol}`}
      ORDER BY horizon_weeks
    `;
    return rows.map((r) => {
      const q = [r.q05, r.q10, r.q25, r.q50, r.q75, r.q90, r.q95];
      const quantiles = q.every((v): v is number => v !== null)
        ? (q as ForecastCardRow["quantiles"])
        : null;
      return {
        horizonWeeks: Number(r.horizon_weeks),
        asOf: r.as_of,
        modelVersion: r.model_version,
        baseClose: r.base_close === null ? null : Number(r.base_close),
        quantiles,
        pUp: r.p_up,
        direction:
          r.direction === "up" || r.direction === "down" || r.direction === "abstain" ? r.direction : null,
        renderable: r.renderable === true,
        blockedReason: r.blocked_reason,
        rangeRenderable: r.range_renderable === true,
        rangeBlockedReason: r.range_blocked_reason,
        scoreKind: r.score_kind === "live" ? "live" : "backtest",
        sample: Number(r.sample),
        coverage90: r.coverage90,
        width90: r.width90,
        baselineWidth90: r.baseline_width90,
        pinballSkill: r.pinball_skill,
        pinballSkillCiLow: r.pinball_skill_ci_low,
        directionCalls: Number(r.direction_calls),
        directionHits: Number(r.direction_hits),
        directionBaseRate: r.direction_base_rate,
        recentMisses: r.recent_misses ?? [],
      };
    });
  }

  /**
   * 실현 변동성 — `forecast.v_realized_vol`(FC-REQ-006, EWMA λ 0.94 · 연율 365일). 종목별 최신 한 행.
   * 막힌 행(`annualized` null — 이력 부족 · 기준 대비 실력 없음 · 시세 끊김)과 3일 넘게 갱신 안 된 행은 `null` 이다.
   * 사이즈 계산은 그때 변동성 타깃 칸을 `insufficient_data` 로 준다(0 이 아니다).
   */
  /** 여러 종목 한 쿼리 — `symbol = ANY(...)`. 3일 넘은 행은 뺀다(`realizedVolatility` 와 같은 신선도) */
  async symbolRisk(symbols: string[]): Promise<Map<string, SymbolRisk>> {
    if (!symbols.length) return new Map();
    const markets = symbols.map((symbol) => `KRW-${symbol.toUpperCase()}`);
    const rows = await prisma.$queryRaw<
      { symbol: string; annualized: number | null; ewma: number | null; btc_beta: number | null; as_of: Date }[]
    >`
      SELECT symbol, annualized, ewma, btc_beta, as_of FROM forecast.v_realized_vol
      WHERE symbol = ANY(${markets}) AND as_of >= now() - interval '3 days'
    `;
    return new Map(
      rows.map((r) => [
        r.symbol.replace(/^KRW-/, ""),
        {
          annualized: r.annualized !== null && r.annualized > 0 ? r.annualized : null,
          ewma: r.ewma !== null && r.ewma > 0 ? r.ewma : null,
          btcBeta: r.btc_beta !== null && Number.isFinite(r.btc_beta) ? r.btc_beta : null,
          asOf: r.as_of,
        },
      ])
    );
  }

  /** 거래소 유의 · 주의 — 여러 종목 한 쿼리(`FC-REQ-014`). 3일 넘은 스냅샷은 뺀다(수집이 멈추면 표시도 멈춘다) */
  async marketWarnings(symbols: string[]): Promise<Map<string, MarketWarningState>> {
    if (!symbols.length) return new Map();
    const markets = symbols.map((symbol) => `KRW-${symbol.toUpperCase()}`);
    const rows = await prisma.$queryRaw<{ symbol: string; warning: boolean; cautions: string[]; fetched_at: Date }[]>`
      SELECT symbol, warning, cautions, fetched_at FROM forecast.v_market_warning
      WHERE symbol = ANY(${markets}) AND fetched_at >= now() - interval '3 days'
    `;
    return new Map(
      rows.map((r) => [
        r.symbol.replace(/^KRW-/, ""),
        { warning: r.warning, cautions: [...r.cautions].sort(), fetchedAt: r.fetched_at },
      ])
    );
  }

  /** BTC 국면 한 행(`FC-REQ-010`). 3일 넘었으면 없는 것으로 — 낡은 국면을 오늘 것처럼 쓰지 않는다 */
  async marketRegime(): Promise<MarketRegimeState | null> {
    const rows = await prisma.$queryRaw<MarketRegimeSqlRow[]>`
      SELECT as_of, close, sma_200d, trend_open, hmm_p_high, drawdown_365d, gate_key, gate_open,
             event_factor, next_event_kind, next_event_at, prereg_key
      FROM forecast.v_market_regime
      WHERE symbol = 'KRW-BTC' AND as_of >= now() - interval '3 days'
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      asOf: r.as_of,
      close: r.close,
      sma200d: r.sma_200d,
      trendOpen: r.trend_open,
      highVolProbability: r.hmm_p_high,
      drawdown365d: r.drawdown_365d,
      gateKey: r.gate_key,
      gateOpen: r.gate_open,
      eventFactor: r.event_factor,
      nextEventKind: r.next_event_kind,
      nextEventAt: r.next_event_at,
      preregKey: r.prereg_key,
    };
  }

  async targetWeightLive(target: number): Promise<TargetWeightLiveRecord | null> {
    // 목표는 등록 격자(0.10 · 0.15 …)의 double — 부동소수 비교를 피해 범위로 찾는다
    const rows = await prisma.$queryRaw<TargetWeightLiveSqlRow[]>`
      SELECT target, as_of, first_rebalance_at, n_weeks, n_excluded, cum_return, btc_cum_return,
             mdd, btc_mdd, vol, upside, downside, worst_weeks
      FROM forecast.v_target_weight_live
      WHERE prereg_key = ${TARGET_WEIGHT_LIVE_PREREG_KEY} AND universe = 'core'
        AND target BETWEEN ${target - 1e-9} AND ${target + 1e-9}
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      target: r.target,
      asOf: r.as_of,
      firstRebalanceAt: r.first_rebalance_at,
      nWeeks: r.n_weeks,
      nExcluded: r.n_excluded,
      cumReturn: r.cum_return,
      btcCumReturn: r.btc_cum_return,
      mdd: r.mdd,
      btcMdd: r.btc_mdd,
      vol: r.vol,
      upside: r.upside,
      downside: r.downside,
      worstWeeks: (r.worst_weeks ?? []).map((w) => ({
        rebalanceAt: String(w.rebalance_at),
        strategy: w.strategy ?? null,
        btc: w.btc ?? null,
        exposure: w.exposure ?? null,
      })),
    };
  }

  async volatilityAsOf(): Promise<Date | null> {
    const rows = await prisma.$queryRaw<{ as_of: Date | null }[]>`
      SELECT max(as_of) AS as_of FROM forecast.v_realized_vol
    `;
    return rows[0]?.as_of ?? null;
  }

  async realizedVolatility(symbol: string): Promise<RealizedVolatility | null> {
    const rows = await prisma.$queryRaw<{ annualized: number | null; as_of: Date }[]>`
      SELECT annualized, as_of FROM forecast.v_realized_vol
      WHERE symbol = ${`KRW-${symbol}`} AND as_of >= now() - interval '3 days'
    `;
    const row = rows[0];
    if (!row || row.annualized === null || !(row.annualized > 0)) return null;
    return { annualized: new Decimal(row.annualized.toString()), asOf: row.as_of };
  }
}
