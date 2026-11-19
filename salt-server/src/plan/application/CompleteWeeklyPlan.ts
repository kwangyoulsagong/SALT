import {
  bandWeekKey,
  executedAmount,
  PlanNotConfiguredError,
  PlanWeekNotCurrentError,
  snapshotWeek,
  streakOf,
  weekOfKst,
  type PlanAsset,
} from "../domain";
import type { CompleteWeeklyPlanView } from "./api/views";
import type { PlanReadDeps } from "./GetWeeklyPlan";
import { syncWeeks } from "./lib/syncWeeks";

export interface CompleteWeeklyPlanCommand {
  userId: string;
  weekOf: string;
  executions: ReadonlyArray<{ asset: PlanAsset; amountKrw?: number }>;
}

/**
 * [이번 주 적립 완료] 수동 체크(`SRV-REQ-020` FR-40~45 · ADR-002) — 원장 · 보유 거래를 보지 않는다.
 * 이번 주만 받는다(지난 주는 마감된 사실). 금액을 생략하면 계획액, 다시 보내면 금액을 고친다.
 * 예측 회차 전이라 이번 주 행이 없으면 그때 정액으로 굳힌다 — 체크한 금액의 근거가 남아야 한다(FR-23).
 */
export class CompleteWeeklyPlan {
  constructor(private readonly deps: PlanReadDeps & { executionCapMultiple: number }) {}

  async execute(cmd: CompleteWeeklyPlanCommand): Promise<CompleteWeeklyPlanView> {
    const now = this.deps.now();
    const currentWeek = weekOfKst(now);
    if (cmd.weekOf !== currentWeek) throw new PlanWeekNotCurrentError(currentWeek);
    const settings = await this.deps.settings.get(cmd.userId);
    if (!settings) throw new PlanNotConfiguredError();

    let rows = await syncWeeks(this.deps, cmd.userId, settings, currentWeek);
    const have = new Set(rows.map((r) => bandWeekKey(r.weekOf, r.asset)));
    const lacking = cmd.executions.filter((e) => !have.has(bandWeekKey(currentWeek, e.asset)));
    if (lacking.length > 0) {
      await this.deps.executions.insertMissing(
        cmd.userId,
        lacking.map((e) =>
          snapshotWeek({ settings, weekOf: currentWeek, asset: e.asset, band: null, status: "planned", allocation: this.deps.config.allocation })
        )
      );
      rows = await this.deps.executions.list(cmd.userId, settings.startedWeek, currentWeek);
    }

    const thisWeek = new Map(rows.filter((r) => r.weekOf === currentWeek).map((r) => [r.asset, r]));
    const items = cmd.executions.map((e) => {
      const row = thisWeek.get(e.asset);
      if (!row) throw new Error(`이번 주 행을 만들지 못했다: ${e.asset}`);
      return { asset: e.asset, executedKrw: executedAmount(row, e.amountKrw, this.deps.executionCapMultiple) };
    });
    await this.deps.executions.markExecuted(cmd.userId, currentWeek, items, now);

    const after = rows.map((r) => {
      const hit = items.find((i) => i.asset === r.asset && r.weekOf === currentWeek);
      return hit ? { ...r, status: "executed" as const, executedKrw: hit.executedKrw } : r;
    });
    const streak = streakOf(after, currentWeek);
    return { weekOf: currentWeek, streakWeeks: streak.weeks, cumulativeKrw: streak.cumulativeKrw };
  }
}
