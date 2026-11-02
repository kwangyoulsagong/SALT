/**
 * 주요 사건(거시 일정) — F008 `SRV-REQ-037` FR-10 · `FC-REQ-005` · FEATURE-008 FR-29~31.
 *
 * 숫자는 전부 `salt-forecast` 가 워크포워드로 만든 것이다. 여기서는 **막을 수만** 있다 — 3종(표본 · 분포와 평소 분포 ·
 * 빗나간 때) 중 하나라도 없으면 분포를 싣지 않는다. "호재 · 악재"는 판정하지 않는다(서프라이즈 데이터가 없다).
 */

import { claimBaseline, claimMisses, claimPeriod, type PerformanceClaim } from "./performanceClaim";

export type MacroEventKind = "fomc" | "cpi" | "jobs" | "kr_bok_rate" | "kr_cpi" | "kr_trade" | "kr_quad_expiry";
export type EventRegion = "us" | "kr";
/** 시장 일정(모든 종목) · 종목 사건(그 종목만 — 2단계 `kr_earnings` · `kr_ir`) */
export type EventScope = "market" | "symbol";

/**
 * 종류 → 지역 · 범위. **이 표 한 곳**이 정한다(`SRV-REQ-041` FR-1). 모르는 종류는 버린다 — 예측이 먼저 늘려도
 * 화면에 이름 없는 행이 나가지 않는다
 */
export const EVENT_KIND_META: Readonly<Record<MacroEventKind, { region: EventRegion; scope: EventScope }>> = {
  fomc: { region: "us", scope: "market" },
  cpi: { region: "us", scope: "market" },
  jobs: { region: "us", scope: "market" },
  kr_bok_rate: { region: "kr", scope: "market" },
  kr_cpi: { region: "kr", scope: "market" },
  kr_trade: { region: "kr", scope: "market" },
  kr_quad_expiry: { region: "kr", scope: "market" },
};
export const MACRO_EVENT_KINDS = Object.keys(EVENT_KIND_META) as readonly MacroEventKind[];

/** 코인엔 미국 거시만, 국내 종목엔 국내 + 미국(`FC-REQ-021` FR-8) */
const REGIONS_FOR: Readonly<Record<"crypto" | "kr_stock", readonly EventRegion[]>> = {
  crypto: ["us"],
  kr_stock: ["kr", "us"],
};
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
  /** 표본 사건의 첫 · 마지막 시각, 빗나간 수 전체와 판정 대상 수(F009 FR-33). 열이 생기기 전 행은 `null` */
  windowFrom: Date | null;
  windowTo: Date | null;
  missCount: number | null;
  missJudged: number | null;
  /** 사건의 종목 — 시장 일정 `''` · 종목 사건은 그 종목(`DB-REQ-034` FR-3) */
  eventSymbol: string;
  /** 반응을 잰 종목의 자산군 — 걸린 전망 키로 안다(`forecastSymbol.ts`) */
  assetClass: "crypto" | "kr_stock";
}

/** 반응 통계 한 행 — 일정 칸을 뺀 것. 쏠림 신호(`positioning.ts`)도 같은 게이트를 쓴다 */
export type ReactionStatsRow = Omit<
  EventCardRow,
  "kind" | "eventAt" | "announcedAt" | "source" | "eventSymbol" | "assetClass"
>;

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
      /** 기간 · 표본 · 기준(평소 날) · 빗나간 수(F009 FR-33). 빗나간 수는 `outOf`(앞 사건 10건 이상인 사건) 중에서 */
      claim: PerformanceClaim;
    }
  | { horizonDays: number; renderable: false; blockedReason: string };

export interface MacroEventView {
  kind: MacroEventKind;
  scope: EventScope;
  region: EventRegion;
  eventAt: string;
  announcedAt: string;
  source: string;
  horizons: EventHorizonView[];
}

const isNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);

export const toEventHorizon = (row: ReactionStatsRow): EventHorizonView => {
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
    claim: {
      period: claimPeriod(row.sample, row.windowFrom, row.windowTo),
      sample: row.sample,
      baseline: claimBaseline(row.sample, "ordinary_days", "not_recorded"),
      misses: claimMisses(row.sample, row.missCount, "not_recorded", row.missJudged),
    },
  };
};

const isKnownKind = (kind: string): kind is MacroEventKind => Object.hasOwn(EVENT_KIND_META, kind);

/**
 * 뷰 행(일정 × 기간)을 일정 하나씩으로 묶는다. 모르는 종류 · 자산군에 안 맞는 지역은 버리고, 빠진 기간은 막힌 기간으로 채운다.
 * 순서는 종목 사건 → 시장 일정, 같은 범위 안은 시각 순(`FE-REQ-046` FR-2)
 */
export const toMacroEvents = (rows: EventCardRow[]): MacroEventView[] => {
  const byEvent = new Map<string, EventCardRow[]>();
  for (const row of rows) {
    if (!isKnownKind(row.kind)) continue;
    const meta = EVENT_KIND_META[row.kind];
    if (!REGIONS_FOR[row.assetClass].includes(meta.region)) continue;
    // 종목 사건이 시장 일정으로 표시된 행(또는 그 반대)은 계약 위반 — 버린다
    if ((meta.scope === "symbol") !== (row.eventSymbol !== "")) continue;
    const key = `${row.kind}|${row.eventAt.toISOString()}|${row.eventSymbol}`;
    byEvent.set(key, [...(byEvent.get(key) ?? []), row]);
  }
  const scopeOrder: Record<EventScope, number> = { symbol: 0, market: 1 };
  return [...byEvent.values()]
    .map((group) => {
      const first = group[0]!;
      const kind = first.kind as MacroEventKind;
      return {
        kind,
        scope: EVENT_KIND_META[kind].scope,
        region: EVENT_KIND_META[kind].region,
        eventAt: first.eventAt.toISOString(),
        announcedAt: first.announcedAt.toISOString(),
        source: first.source,
        horizons: EVENT_HORIZON_DAYS.map((h) => {
          const row = group.find((r) => r.horizonDays === h);
          return row ? toEventHorizon(row) : { horizonDays: h, renderable: false as const, blockedReason: "not_generated" };
        }),
      };
    })
    .sort((a, b) => scopeOrder[a.scope] - scopeOrder[b.scope] || a.eventAt.localeCompare(b.eventAt));
};
