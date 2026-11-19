import {
  addWeeks,
  bandWeekKey,
  missingWeeks,
  type BandReader,
  type BandWeekRow,
  type ExecutionRecord,
  type ExecutionStore,
  type PlanConfig,
  type PlanSettingsRecord,
} from "../../domain";

export interface SyncDeps {
  executions: ExecutionStore;
  bands: BandReader;
  config: PlanConfig;
}

/**
 * 시작 주부터 이번 주까지 행을 맞춘다 — 월요일 cron 대신 **읽을 때 멱등하게**(`SRV-REQ-020` FR-32).
 * 이 맥은 평일 업무 시간에만 켜져 월요일 07:00 회차를 자주 놓친다 — 읽는 순간 채우면 놓친 회차가 없다.
 * 빠진 주가 없으면 쓰기 0(대부분의 요청). 쓰기는 한 문장씩(넣기 · 마감).
 */
export const syncWeeks = async (
  deps: SyncDeps,
  userId: string,
  settings: PlanSettingsRecord,
  currentWeek: string
): Promise<ExecutionRecord[]> => {
  const rows = await deps.executions.list(userId, settings.startedWeek, currentWeek);
  const assets = deps.config.allocation.map((a) => a.asset);
  const have = new Set(rows.map((r) => bandWeekKey(r.weekOf, r.asset)));

  let firstMissing: string | null = null;
  for (let w = settings.startedWeek; w <= currentWeek && firstMissing === null; w = addWeeks(w, 1)) {
    if (assets.some((a) => !have.has(bandWeekKey(w, a)))) firstMissing = w;
  }
  const stalePlanned = rows.some((r) => r.status === "planned" && r.weekOf < currentWeek);
  if (firstMissing === null && !stalePlanned) return rows;

  let inserted = 0;
  if (firstMissing !== null) {
    const bandRows = await deps.bands.weeks(firstMissing, currentWeek);
    const bandsByWeek = new Map<string, BandWeekRow>(bandRows.map((b) => [bandWeekKey(b.planWeek, b.asset), b]));
    const add = missingWeeks({ settings, currentWeek, existing: rows, bandsByWeek, allocation: deps.config.allocation });
    await deps.executions.insertMissing(userId, add);
    inserted = add.length;
  }
  if (stalePlanned) await deps.executions.closeBefore(userId, currentWeek);
  return inserted > 0 || stalePlanned ? deps.executions.list(userId, settings.startedWeek, currentWeek) : rows;
};
