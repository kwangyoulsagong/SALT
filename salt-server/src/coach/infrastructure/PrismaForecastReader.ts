import prisma from "../../shared/infrastructure/prisma";
import type { ForecastCardRow, ForecastReader } from "../domain";

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
export class PrismaForecastReader implements ForecastReader {
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
}
