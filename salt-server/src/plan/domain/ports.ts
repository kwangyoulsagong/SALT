import type { BandWeekRow, ExecutionRecord, PlanAsset, PlanSettingsRecord } from "./types";

/** 사람 설정 — 사람마다 한 행(`plan_settings`) */
export interface PlanSettingsStore {
  get(userId: string): Promise<PlanSettingsRecord | null>;
  /** 그 사람 설정 쓰기를 줄 세운다 — 트랜잭션 안에서만(끝나면 풀린다) */
  lock(userId: string): Promise<void>;
  /** 덮어쓰기(사람마다 한 행) */
  save(userId: string, record: PlanSettingsRecord): Promise<void>;
}

/** 주 × 자산 스냅샷(`weekly_plan_executions`) — 쓰기는 전부 한 문장(행마다 흩지 않는다) */
export interface ExecutionStore {
  /** from 이상 to 이하, 주 오름차순 */
  list(userId: string, fromWeek: string, toWeek: string): Promise<ExecutionRecord[]>;
  /** 없으면 넣기(같은 주 · 자산이 있으면 그대로 — 처음 만든 스냅샷을 지킨다) */
  insertMissing(userId: string, rows: readonly ExecutionRecord[]): Promise<void>;
  /** beforeWeek 전 `planned` → `skipped`(미실행 마감) */
  closeBefore(userId: string, beforeWeek: string): Promise<void>;
  /** 그 주 자산들을 실행으로(덮어쓰기 — 금액 고침 허용) */
  markExecuted(userId: string, weekOf: string, items: ReadonlyArray<{ asset: PlanAsset; executedKrw: number }>, at: Date): Promise<void>;
}

/** 예측 밴드 뷰(`forecast.v_accumulation_band` · `_week`) — 서버는 뷰로만 읽는다 */
export interface BandReader {
  /** 자산마다 가장 최근 결정 주 한 행 */
  latest(): Promise<BandWeekRow[]>;
  /** 결정 주 from 이상 to 이하(KST 월요일 날짜) */
  weeks(fromWeek: string, toWeek: string): Promise<BandWeekRow[]>;
}
