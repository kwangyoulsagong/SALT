import { assertAllocation, type BandReader, type ExecutionStore, type PlanConfig, type PlanSettingsStore } from "../../domain";
import { CompleteWeeklyPlan } from "../CompleteWeeklyPlan";
import { GetMonthlySummary } from "../GetMonthlySummary";
import { GetPlanSettings } from "../GetPlanSettings";
import { GetWeeklyPlan } from "../GetWeeklyPlan";
import { UpdatePlanSettings, type PlanTransaction } from "../UpdatePlanSettings";

export type * from "./views";
export type { CompleteWeeklyPlanCommand } from "../CompleteWeeklyPlan";

export interface PlanDeps {
  settings: PlanSettingsStore;
  executions: ExecutionStore;
  bands: BandReader;
  tx: PlanTransaction;
  config: PlanConfig;
  now?: () => Date;
}

/**
 * `plan` 조립(F003 v2 · `SRV-REQ-020`~`022` 개정 2026-11-19). portfolio 서비스의 컨텍스트(`ADR-006` §1, S4 전이라 Express).
 * 밖에 여는 공개 API 는 아직 없다 — 홈 요약(순서 3)은 BFF 가 이 경로를 읽는다.
 */
export const createPlanApplication = (deps: PlanDeps) => {
  assertAllocation(deps.config.allocation);
  const read = { ...deps, now: deps.now ?? (() => new Date()) };
  return {
    useCases: {
      getWeeklyPlan: new GetWeeklyPlan(read),
      completeWeeklyPlan: new CompleteWeeklyPlan({ ...read, executionCapMultiple: deps.config.executionCapMultiple }),
      getPlanSettings: new GetPlanSettings(read),
      updatePlanSettings: new UpdatePlanSettings(read),
      getMonthlySummary: new GetMonthlySummary(read),
    },
  };
};

export type PlanUseCases = ReturnType<typeof createPlanApplication>["useCases"];
