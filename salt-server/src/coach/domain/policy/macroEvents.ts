/**
 * 주요 사건(거시 일정) — F008 `SRV-REQ-037` FR-10 · `FC-REQ-005` · FEATURE-008 FR-29~31.
 *
 * 숫자는 전부 `salt-forecast` 가 워크포워드로 만든 것이다. 여기서는 **막을 수만** 있다 — 3종(표본 · 분포와 평소 분포 ·
 * 빗나간 때) 중 하나라도 없으면 분포를 싣지 않는다. "호재 · 악재"는 판정하지 않는다(서프라이즈 데이터가 없다).
 */

export type MacroEventKind = "fomc" | "cpi" | "jobs";
export const MACRO_EVENT_KINDS: readonly MacroEventKind[] = ["fomc", "cpi", "jobs"];
export const EVENT_HORIZON_DAYS = [1, 5, 20] as const;
/** `FC-REQ-005` FR-6 과 같은 값 — 서버도 한 번 더 막는다 */
const MIN_SAMPLE = 10;

export interface EventCardRow {
  kind: string;
  eventAt: Date;
  announcedAt: Date;
  source: string;
  horizonDays: number;
  asOf: Date;
  sample: number;
  q05: number | null;
  q25: number | null;
  q50: number | null;
  q75: number | null;
  q95: number | null;
  upRate: number | null;
  baselineQ05: number | null;
  baselineQ50: number | null;
  baselineQ95: number | null;
  moveRatio: number | null;
  preReturn5dMedian: number | null;
  recentMisses: { eventAt: string; realized: number; low: number; high: number }[] | null;
  recentEvents: { eventAt: string; realized: number; preReturn5d: number | null }[] | null;
  renderable: boolean;
  blockedReason: string | null;
}

export type EventHorizonView =
  | {
      horizonDays: number;
      renderable: true;
      asOf: string;
      sample: number;
      /** 사건 뒤 h 일 수익률 분위수(비율, 0.012 = +1.2%) */
      range: { q05: number; q25: number; q50: number; q75: number; q95: number };
      upRate: number;
      /** 같은 기간 **평소 날**의 h 일 수익률 — 사건이 특별한지 비교하는 기준 */
      baseline: { q05: number; q50: number; q95: number };
      /** 움직임 크기 비 = 사건 |r| 중앙값 / 평소 |r| 중앙값 */
      moveRatio: number;
      preReturn5dMedian: number | null;
      misses: { eventAt: string; realized: number; low: number; high: number }[];
      recent: { eventAt: string; realized: number }[];
    }
  | { horizonDays: number; renderable: false; blockedReason: string };

export interface MacroEventView {
  kind: MacroEventKind;
  eventAt: string;
  announcedAt: string;
  source: string;
  horizons: EventHorizonView[];
}

const isNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);

export const toEventHorizon = (row: EventCardRow): EventHorizonView => {
  const blocked = (reason: string): EventHorizonView => ({
    horizonDays: row.horizonDays,
    renderable: false,
    blockedReason: reason,
  });
  if (!row.renderable) return blocked(row.blockedReason ?? "insufficient_sample");
  if (row.sample < MIN_SAMPLE) return blocked("insufficient_sample");
  const quantiles = [row.q05, row.q25, row.q50, row.q75, row.q95];
  const base = [row.baselineQ05, row.baselineQ50, row.baselineQ95];
  if (!quantiles.every(isNum) || !base.every(isNum) || !isNum(row.upRate) || !isNum(row.moveRatio)) {
    return blocked("contract_incomplete");
  }
  const misses = row.recentMisses ?? [];
  if (misses.length === 0) return blocked("failure_cases_missing");
  const [q05, q25, q50, q75, q95] = quantiles as number[];
  const [b05, b50, b95] = base as number[];
  return {
    horizonDays: row.horizonDays,
    renderable: true,
    asOf: row.asOf.toISOString(),
    sample: row.sample,
    range: { q05: q05!, q25: q25!, q50: q50!, q75: q75!, q95: q95! },
    upRate: row.upRate as number,
    baseline: { q05: b05!, q50: b50!, q95: b95! },
    moveRatio: row.moveRatio as number,
    preReturn5dMedian: row.preReturn5dMedian,
    misses,
    recent: (row.recentEvents ?? []).map(({ eventAt, realized }) => ({ eventAt, realized })),
  };
};

/** 뷰 행(일정 × 기간)을 일정 하나씩으로 묶는다. 모르는 종류 · 빠진 기간은 막힌 기간으로 채운다 */
export const toMacroEvents = (rows: EventCardRow[]): MacroEventView[] => {
  const byEvent = new Map<string, EventCardRow[]>();
  for (const row of rows) {
    if (!MACRO_EVENT_KINDS.includes(row.kind as MacroEventKind)) continue;
    const key = `${row.kind}|${row.eventAt.toISOString()}`;
    byEvent.set(key, [...(byEvent.get(key) ?? []), row]);
  }
  return [...byEvent.values()]
    .map((group) => {
      const first = group[0]!;
      return {
        kind: first.kind as MacroEventKind,
        eventAt: first.eventAt.toISOString(),
        announcedAt: first.announcedAt.toISOString(),
        source: first.source,
        horizons: EVENT_HORIZON_DAYS.map((h) => {
          const row = group.find((r) => r.horizonDays === h);
          return row ? toEventHorizon(row) : { horizonDays: h, renderable: false as const, blockedReason: "not_generated" };
        }),
      };
    })
    .sort((a, b) => a.eventAt.localeCompare(b.eventAt));
};
