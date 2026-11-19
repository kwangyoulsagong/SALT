import prisma from "../../shared/infrastructure/prisma";
import { PLAN_ASSETS, type BandReader, type BandRule, type BandWeekRow, type FailureCase, type PlanAsset } from "../domain";

interface Row {
  asset: string;
  plan_week: Date;
  prereg_key: string;
  indicator: BandWeekRow["indicator"];
  indicator_value: number | null;
  percentile: number | null;
  estimated: boolean;
  basis_observed: Date | null;
  secondary_value: number | null;
  band_key: string | null;
  band_multiplier: number | null;
  gate_passed: boolean;
  blocked_reason: BandWeekRow["blockedReason"];
  multiplier: number;
  closed_weeks: number;
  excess: number | null;
  ci_low: number | null;
  ci_high: number | null;
  years_total: number;
  years_positive: number;
  window_from: Date | null;
  window_to: Date | null;
  failure_cases: unknown;
  failure_count: number;
  kimchi_premium: number | null;
  kimchi_as_of: Date | null;
  computed_at: Date;
  bands: unknown;
}

const isAsset = (a: string): a is PlanAsset => (PLAN_ASSETS as readonly string[]).includes(a);

/** jsonb 는 모양을 믿지 않는다 — 빠진 칸이 있는 줄은 버린다(빈 실패 사례 = 게이트가 막는다) */
const failureCases = (v: unknown): FailureCase[] =>
  Array.isArray(v)
    ? v.filter(
        (c): c is FailureCase =>
          typeof c === "object" &&
          c !== null &&
          typeof c.decidedAt === "string" &&
          typeof c.kind === "string" &&
          typeof c.band === "string" &&
          typeof c.multiplier === "number" &&
          typeof c.return52w === "number"
      )
    : [];
const bandRules = (v: unknown): BandRule[] =>
  Array.isArray(v)
    ? v.filter(
        (b): b is BandRule =>
          typeof b === "object" &&
          b !== null &&
          typeof b.key === "string" &&
          (b.below === null || typeof b.below === "number") &&
          typeof b.multiplier === "number"
      )
    : [];

const toRow = (r: Row): BandWeekRow | null =>
  isAsset(r.asset)
    ? {
        asset: r.asset,
        // 결정 시각은 월요일 00:00 UTC — 날짜가 곧 KST 월요일
        planWeek: r.plan_week.toISOString().slice(0, 10),
        preregKey: r.prereg_key,
        indicator: r.indicator,
        indicatorValue: r.indicator_value,
        percentile: r.percentile,
        estimated: r.estimated,
        basisObserved: r.basis_observed,
        secondaryValue: r.secondary_value,
        bandKey: r.band_key,
        bandMultiplier: r.band_multiplier,
        gatePassed: r.gate_passed,
        blockedReason: r.blocked_reason,
        multiplier: r.multiplier,
        closedWeeks: r.closed_weeks,
        excess: r.excess,
        ciLow: r.ci_low,
        ciHigh: r.ci_high,
        yearsTotal: r.years_total,
        yearsPositive: r.years_positive,
        windowFrom: r.window_from,
        windowTo: r.window_to,
        failureCases: failureCases(r.failure_cases),
        failureCount: r.failure_count,
        kimchiPremium: r.kimchi_premium,
        kimchiAsOf: r.kimchi_as_of,
        computedAt: r.computed_at,
        bands: bandRules(r.bands),
      }
    : null;

const COLUMNS = `asset, plan_week, prereg_key, indicator, indicator_value, percentile, estimated, basis_observed, secondary_value,
  band_key, band_multiplier, gate_passed, blocked_reason, multiplier, closed_weeks, excess, ci_low, ci_high, years_total,
  years_positive, window_from, window_to, failure_cases, failure_count, kimchi_premium, kimchi_as_of, computed_at, bands`;

/**
 * 밴드 적립 예측 뷰(`FC-REQ-029` · `DB-REQ-013`) — 서버는 `forecast` 를 **뷰로만** 읽는다(salt-forecast `db-contract.md` §2).
 * 자산 둘 × 주 몇 개라 행이 작다. 숫자 계산 0 — 금액은 도메인 정책이 한다.
 */
export class PrismaBandReader implements BandReader {
  async latest(): Promise<BandWeekRow[]> {
    const rows = await prisma.$queryRawUnsafe<Row[]>(`SELECT ${COLUMNS} FROM forecast.v_accumulation_band`);
    return rows.map(toRow).filter((r): r is BandWeekRow => r !== null);
  }

  async weeks(fromWeek: string, toWeek: string): Promise<BandWeekRow[]> {
    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT ${COLUMNS} FROM forecast.v_accumulation_band_week
       WHERE plan_week >= ($1::date)::timestamp AT TIME ZONE 'UTC'
         AND plan_week < ($2::date + 1)::timestamp AT TIME ZONE 'UTC'`, // 결정 시각 = 월요일 00:00 UTC — 세션 시간대와 무관하게
      fromWeek,
      toWeek
    );
    return rows.map(toRow).filter((r): r is BandWeekRow => r !== null);
  }
}
