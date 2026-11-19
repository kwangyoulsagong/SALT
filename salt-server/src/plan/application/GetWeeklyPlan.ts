import {
  bandCardGate,
  daysBetween,
  kimchiView,
  kstDate,
  plannedKrw,
  resolveMultiplier,
  streakOf,
  weekOfKst,
  weeklyBaseFor,
  type BandReader,
  type BandWeekRow,
  type ExecutionRecord,
  type PlanAsset,
  type PlanSettingsStore,
} from "../domain";
import type { WeeklyPlanItemView, WeeklyPlanView, WeeklyReasonCode } from "./api/views";
import { syncWeeks, type SyncDeps } from "./lib/syncWeeks";

export interface PlanReadDeps extends SyncDeps {
  settings: PlanSettingsStore;
  bands: BandReader;
  now: () => Date;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

const reasonOf = (row: ExecutionRecord | undefined, latest: BandWeekRow | null, currentWeek: string): WeeklyReasonCode => {
  if (row) return row.fallback ? "band_unavailable" : row.gatePassed ? "band_applied" : "gate_not_passed";
  if (latest && latest.planWeek === currentWeek) return latest.gatePassed ? "band_applied" : "gate_not_passed";
  return latest ? "band_pending" : "band_unavailable";
};

/**
 * 이번 주 계획(`SRV-REQ-020` · `SRV-REQ-021` `GET /api/plan/weekly`) — 금액 = 기본액 × 예측 배수, 1,000원 단위.
 * 지표 · 성적 · 실패 사례 · 김프는 예측 뷰 그대로, 금액 · 연속 · 미실행만 여기서. 예측이 비어도 기본액은 늘 보인다(FR-22).
 */
export class GetWeeklyPlan {
  constructor(private readonly deps: PlanReadDeps) {}

  async execute(userId: string): Promise<WeeklyPlanView> {
    const now = this.deps.now();
    const currentWeek = weekOfKst(now);
    const [settings, latestRows] = await Promise.all([this.deps.settings.get(userId), this.deps.bands.latest()]);
    const latest = new Map<PlanAsset, BandWeekRow>(latestRows.map((b) => [b.asset, b]));
    const rows = settings ? await syncWeeks(this.deps, userId, settings, currentWeek) : [];
    const thisWeek = new Map(rows.filter((r) => r.weekOf === currentWeek).map((r) => [r.asset, r]));
    const today = kstDate(now);

    const items: WeeklyPlanItemView[] = this.deps.config.allocation.map(({ asset }) => {
      const band = latest.get(asset) ?? null;
      const row = thisWeek.get(asset);
      // 행이 없으면(설정 전 · 예측 회차 전) 지금 기준 잠정 — 이번 주 예측이면 그 배수, 아니면 정액
      const provisional = resolveMultiplier(band && band.planWeek === currentWeek ? band : null);
      const base = row?.weeklyBaseKrw ?? (settings ? weeklyBaseFor(settings, currentWeek, asset, this.deps.config.allocation) : null);
      const multiplier = row?.multiplier ?? provisional.multiplier;
      const gate = bandCardGate(band);
      return {
        asset,
        indicator: band?.indicator ?? null,
        weeklyBaseKrw: base,
        multiplier,
        amountKrw: row?.plannedKrw ?? (base === null ? null : plannedKrw(base, multiplier)),
        status: row?.status ?? null,
        executedKrw: row?.executedKrw ?? null,
        fixed: row !== undefined,
        fallback: row?.fallback ?? provisional.fallback,
        reasonCode: reasonOf(row, band, currentWeek),
        basis: band
          ? {
              planWeek: band.planWeek,
              value: band.indicatorValue,
              percentile: band.percentile,
              estimated: band.estimated,
              basisObserved: iso(band.basisObserved),
              secondaryValue: band.secondaryValue,
              bandKey: band.bandKey,
              bandMultiplier: band.bandMultiplier,
              bands: band.bands,
              staleDays: Math.max(0, daysBetween(band.planWeek, today)),
              computedAt: band.computedAt.toISOString(),
            }
          : null,
        trackRecord: band
          ? {
              preregKey: band.preregKey,
              gatePassed: band.gatePassed,
              gateBlockedReason: band.blockedReason,
              closedWeeks: band.closedWeeks,
              excess: band.excess,
              ciLow: band.ciLow,
              ciHigh: band.ciHigh,
              yearsTotal: band.yearsTotal,
              yearsPositive: band.yearsPositive,
              windowFrom: iso(band.windowFrom),
              windowTo: iso(band.windowTo),
            }
          : null,
        failureCases: band ? { count: band.failureCount, items: band.failureCases } : null,
        renderable: gate.renderable,
        blockedReason: gate.blockedReason,
      };
    });

    const btc = items.find((i) => i.asset === "btc");
    const kimchi = kimchiView(latest.get("btc") ?? null, btc?.amountKrw ?? null, now, this.deps.config);
    const degradedReasons: WeeklyPlanView["degradedReasons"] = [];
    if (items.some((i) => i.reasonCode === "band_pending")) degradedReasons.push("band_pending");
    if (items.some((i) => i.reasonCode === "band_unavailable")) degradedReasons.push("band_unavailable");
    if (btc && kimchi === null) degradedReasons.push("kimchi_unavailable");

    return {
      weekOf: currentWeek,
      configured: settings !== null,
      totalKrw: settings ? items.reduce((s, i) => s + (i.amountKrw ?? 0), 0) : null,
      items,
      kimchiPremium: kimchi,
      streak: streakOf(rows, currentWeek),
      degraded: degradedReasons.length > 0,
      degradedReasons,
    };
  }
}
