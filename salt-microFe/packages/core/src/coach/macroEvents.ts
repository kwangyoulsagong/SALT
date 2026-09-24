/**
 * 주요 사건(거시 일정) — BFF `GET /api/app/coach/events` 응답 (F008 `BFF-REQ-037` FR-8 · `FC-REQ-005`).
 *
 * 수익률은 비율(0.012 = +1.2%). 금액은 없다. "호재 · 악재" 필드는 없다 — 판정하지 않는다(FEATURE-008 FR-31).
 * 막힌 기간에는 분포 필드가 **없다**(판별 union).
 */
export type MacroEventKind = "fomc" | "cpi" | "jobs";

export type EventHorizonView =
  | {
      horizonDays: number;
      renderable: true;
      asOf: string;
      sample: number;
      /** 과거 같은 일정 뒤 h 일 수익률 분위수 */
      range: { q05: number; q25: number; q50: number; q75: number; q95: number };
      upRate: number;
      /** 같은 기간 평소 날의 h 일 수익률 — 비교 기준 */
      baseline: { q05: number; q50: number; q95: number };
      /** 움직임 크기 비(사건 |r| 중앙값 / 평소 |r| 중앙값) */
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
  horizons: EventHorizonView[];
}

export type SymbolEventsResult =
  | { status: "ok"; symbol: string; label: string; disclaimer: string; events: MacroEventView[] }
  | { status: "unavailable" };
