import { kstDate, monthlyForWeek, monthlySummary, monthOf, PlanMonthInFutureError, weekOfKst } from "../domain";
import type { MonthlySummaryView } from "./api/views";
import type { PlanReadDeps } from "./GetWeeklyPlan";
import { syncWeeks } from "./lib/syncWeeks";

/** 이번 달 적립 합계(`SRV-REQ-020` FR-80~83 · B20) — 달을 안 주면 이번 달(KST) */
export class GetMonthlySummary {
  constructor(private readonly deps: PlanReadDeps) {}

  async execute(userId: string, month?: string): Promise<MonthlySummaryView> {
    const now = this.deps.now();
    const currentWeek = weekOfKst(now);
    const today = kstDate(now);
    // 오지 않은 달은 묻지 않는다(`SRV-REQ-021` FR-29) — `YYYY-MM` 문자열은 사전순 = 시간순. 읽기 전에 거절
    if (month && month > monthOf(today)) throw new PlanMonthInFutureError(monthOf(today));
    const settings = await this.deps.settings.get(userId);
    const rows = settings ? await syncWeeks(this.deps, userId, settings, currentWeek) : [];
    const summary = monthlySummary({ month: month ?? monthOf(today), today, startedWeek: settings?.startedWeek ?? null, rows });
    return { ...summary, monthlyBaseKrw: settings ? monthlyForWeek(settings, currentWeek) : null };
  }
}
