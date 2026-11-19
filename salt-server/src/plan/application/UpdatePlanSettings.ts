import { addWeeks, assertMonthlyBase, weekOfKst, type PlanSettingsRecord } from "../domain";
import type { PlanSettingsView } from "./api/views";
import type { PlanReadDeps } from "./GetWeeklyPlan";
import { settingsView } from "./GetPlanSettings";
import { syncWeeks } from "./lib/syncWeeks";

export interface PlanTransaction {
  run<T>(fn: () => Promise<T>): Promise<T>;
}

/** 다음 설정 — 첫 저장은 이번 주부터, 수정은 다음 주부터(FR-75). 반영 전 다시 고치면 대기값만 바꾼다 */
export const nextSettings = (existing: PlanSettingsRecord | null, monthly: number, currentWeek: string): PlanSettingsRecord | null => {
  if (!existing) return { monthlyBaseKrw: monthly, previousMonthlyBaseKrw: null, effectiveWeek: currentWeek, startedWeek: currentWeek };
  if (existing.effectiveWeek > currentWeek) {
    // 대기 중 — 지금 쓰는 값으로 되돌리면 대기를 거둔다
    const inUse = existing.previousMonthlyBaseKrw ?? existing.monthlyBaseKrw;
    return monthly === inUse
      ? { ...existing, monthlyBaseKrw: monthly, previousMonthlyBaseKrw: null, effectiveWeek: currentWeek }
      : { ...existing, monthlyBaseKrw: monthly };
  }
  if (monthly === existing.monthlyBaseKrw) return null;
  return { ...existing, monthlyBaseKrw: monthly, previousMonthlyBaseKrw: existing.monthlyBaseKrw, effectiveWeek: addWeeks(currentWeek, 1) };
};

/**
 * 월 적립액 저장(`SRV-REQ-020` FR-70~77) — 첫 저장과 수정이 같은 유스케이스(upsert). 밴드 · 배분 키는 presentation 이 422.
 * 같은 사람 저장은 잠금으로 줄 세운다(읽고 → 이전 값 계산 → 쓰기). 첫 저장이면 이번 주 계획을 바로 만든다(FR-18 · B12).
 */
export class UpdatePlanSettings {
  constructor(private readonly deps: PlanReadDeps & { tx: PlanTransaction }) {}

  async execute(userId: string, monthlyBaseKrw: number): Promise<PlanSettingsView> {
    assertMonthlyBase(monthlyBaseKrw, this.deps.config);
    const currentWeek = weekOfKst(this.deps.now());
    const saved = await this.deps.tx.run(async () => {
      await this.deps.settings.lock(userId);
      const existing = await this.deps.settings.get(userId);
      const next = nextSettings(existing, monthlyBaseKrw, currentWeek);
      if (next) await this.deps.settings.save(userId, next);
      return next ?? existing;
    });
    // 트랜잭션 밖 — 예측 뷰 읽기 · 주 채움(첫 저장이면 이번 주 행)
    if (saved) await syncWeeks(this.deps, userId, saved, currentWeek);
    const latest = await this.deps.bands.latest();
    return settingsView(saved, latest, currentWeek, this.deps.config);
  }
}
