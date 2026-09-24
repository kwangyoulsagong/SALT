import Decimal from "decimal.js";
import prisma from "../../shared/infrastructure/prisma";
import type { EventCardRow, ForecastCardRow, ForecastReader, RealizedVolatility } from "../domain";

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
    }));
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
