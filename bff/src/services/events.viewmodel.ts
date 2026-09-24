/**
 * 주요 사건(거시 일정) 뷰모델 — **순수 함수** (F008 `BFF-REQ-037` FR-8 · `FC-REQ-005`).
 *
 * 서버가 이미 3종 게이트를 본다. BFF 는 **막을 수만** 있다 — 모양이 깨졌거나(분위수 · 평소 분포 · 빗나간 때)
 * 하나라도 비면 그 기간을 `contract_incomplete` 로 막는다. `renderable: true` 를 만드는 경로는 없다.
 * 모르는 사건 종류는 버린다. 금액은 없다(수익률 · 비율뿐).
 */

export type MacroEventKind = "fomc" | "cpi" | "jobs";

export type EventHorizon =
  | {
      horizonDays: number;
      renderable: true;
      asOf: string;
      sample: number;
      range: { q05: number; q25: number; q50: number; q75: number; q95: number };
      upRate: number;
      baseline: { q05: number; q50: number; q95: number };
      moveRatio: number;
      preReturn5dMedian: number | null;
      misses: { eventAt: string; realized: number; low: number; high: number }[];
      recent: { eventAt: string; realized: number }[];
    }
  | { horizonDays: number; renderable: false; blockedReason: string };

export interface MacroEvent {
  kind: MacroEventKind;
  eventAt: string;
  announcedAt: string;
  horizons: EventHorizon[];
}

export type EventsResult =
  | { status: "ok"; symbol: string; label: string; disclaimer: string; events: MacroEvent[] }
  | { status: "unavailable" };

const KINDS: readonly MacroEventKind[] = ["fomc", "cpi", "jobs"];
const HORIZONS = [1, 5, 20];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);
const allNum = (o: Record<string, unknown> | null, keys: string[]) => Boolean(o) && keys.every((k) => isNum(o![k]));

const toHorizon = (h: number, raw: Record<string, unknown> | undefined): EventHorizon => {
  const blocked = (reason: string): EventHorizon => ({ horizonDays: h, renderable: false, blockedReason: reason });
  if (!raw) return blocked("not_generated");
  if (raw.renderable !== true) return blocked(String(raw.blockedReason ?? "insufficient_sample"));

  const range = obj(raw.range);
  const baseline = obj(raw.baseline);
  const misses = Array.isArray(raw.misses) ? (raw.misses as Record<string, unknown>[]) : [];
  const okMisses = misses.filter((m) => typeof m?.eventAt === "string" && allNum(m, ["realized", "low", "high"]));
  if (
    !allNum(range, ["q05", "q25", "q50", "q75", "q95"]) ||
    !allNum(baseline, ["q05", "q50", "q95"]) ||
    !isNum(raw.sample) ||
    raw.sample <= 0 ||
    !isNum(raw.upRate) ||
    !isNum(raw.moveRatio) ||
    typeof raw.asOf !== "string" ||
    okMisses.length === 0
  ) {
    return blocked("contract_incomplete");
  }
  const recent = Array.isArray(raw.recent) ? (raw.recent as Record<string, unknown>[]) : [];
  return {
    horizonDays: h,
    renderable: true,
    asOf: raw.asOf,
    sample: raw.sample,
    range: {
      q05: range!.q05 as number,
      q25: range!.q25 as number,
      q50: range!.q50 as number,
      q75: range!.q75 as number,
      q95: range!.q95 as number,
    },
    upRate: raw.upRate,
    baseline: { q05: baseline!.q05 as number, q50: baseline!.q50 as number, q95: baseline!.q95 as number },
    moveRatio: raw.moveRatio,
    preReturn5dMedian: isNum(raw.preReturn5dMedian) ? raw.preReturn5dMedian : null,
    misses: okMisses.slice(0, 3).map((m) => ({
      eventAt: m.eventAt as string,
      realized: m.realized as number,
      low: m.low as number,
      high: m.high as number,
    })),
    recent: recent
      .filter((r) => typeof r?.eventAt === "string" && isNum(r.realized))
      .slice(-5)
      .map((r) => ({ eventAt: r.eventAt as string, realized: r.realized as number })),
  };
};

export const toEventsViewModel = (data: Record<string, unknown>): EventsResult => {
  // 면책이 없으면 전체를 내보내지 않는다(`BFF-REQ-025` FR-22 — 면책은 정책)
  if (typeof data.disclaimer !== "string" || data.disclaimer === "") return { status: "unavailable" };
  const events = Array.isArray(data.events) ? (data.events as Record<string, unknown>[]) : [];
  return {
    status: "ok",
    symbol: String(data.symbol ?? ""),
    label: String(data.label ?? ""),
    disclaimer: data.disclaimer,
    events: events
      .filter((e) => KINDS.includes(e?.kind as MacroEventKind) && typeof e.eventAt === "string")
      .map((e) => {
        const horizons = Array.isArray(e.horizons) ? (e.horizons as Record<string, unknown>[]) : [];
        return {
          kind: e.kind as MacroEventKind,
          eventAt: e.eventAt as string,
          announcedAt: String(e.announcedAt ?? ""),
          horizons: HORIZONS.map((h) => toHorizon(h, horizons.find((x) => x.horizonDays === h))),
        };
      }),
  };
};
