import {
  monthlyForWeek,
  weekOfKst,
  weeklyBaseFor,
  type BandWeekRow,
  type PlanConfig,
  type PlanSettingsRecord,
} from "../domain";
import type { PlanSettingsView } from "./api/views";
import type { PlanReadDeps } from "./GetWeeklyPlan";

const UNIT_KRW = 1000;

/** 설정 응답 조립 — 저장 응답과 같은 모양(`SRV-REQ-020` FR-74 — 밴드 · 배분은 읽기 전용) */
export const settingsView = (
  settings: PlanSettingsRecord | null,
  latest: readonly BandWeekRow[],
  currentWeek: string,
  config: PlanConfig
): PlanSettingsView => ({
  configured: settings !== null,
  monthlyBaseKrw: settings?.monthlyBaseKrw ?? null,
  currentMonthlyBaseKrw: settings ? monthlyForWeek(settings, currentWeek) : null,
  pending:
    settings && settings.effectiveWeek > currentWeek
      ? { monthlyBaseKrw: settings.monthlyBaseKrw, effectiveWeek: settings.effectiveWeek }
      : null,
  startedWeek: settings?.startedWeek ?? null,
  allocation: config.allocation.map(({ asset, pct }) => ({
    asset,
    pct,
    weeklyBaseKrw: settings ? weeklyBaseFor(settings, currentWeek, asset, config.allocation) : null,
    editable: false,
  })),
  bands: config.allocation.map(({ asset }) => {
    const band = latest.find((b) => b.asset === asset);
    return {
      asset,
      indicator: band?.indicator ?? null,
      rules: band?.bands ?? [],
      currentBandKey: band?.bandKey ?? null,
      editable: false,
      reasonCode: "hit_rate_on_default_band",
    };
  }),
  limits: { minKrw: config.monthlyMinKrw, maxKrw: config.monthlyMaxKrw, unitKrw: UNIT_KRW },
});

/** 설정 읽기 — 없으면 200 `configured: false`(FR-18 · B12) */
export class GetPlanSettings {
  constructor(private readonly deps: PlanReadDeps) {}

  async execute(userId: string): Promise<PlanSettingsView> {
    const [settings, latest] = await Promise.all([this.deps.settings.get(userId), this.deps.bands.latest()]);
    return settingsView(settings, latest, weekOfKst(this.deps.now()), this.deps.config);
  }
}
