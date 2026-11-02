/**
 * 주요 사건(거시 · 국내 시장 일정) — BFF `GET /api/app/coach/events` 응답 (F008 `BFF-REQ-037` FR-8 · `FC-REQ-005` ·
 * 국내 `BFF-REQ-043`). 코인엔 미국 거시만, 국내 종목엔 국내 4종 + 미국 거시가 온다(서버가 가른다).
 *
 * 수익률은 비율(0.012 = +1.2%). 금액은 없다. "호재 · 악재" 필드는 없다 — 판정하지 않는다(FEATURE-008 FR-31).
 * 막힌 기간에는 분포 필드가 **없다**(판별 union).
 */

import type { PerformanceClaim } from "./performanceClaim";
export type MacroEventKind = "fomc" | "cpi" | "jobs" | "kr_bok_rate" | "kr_cpi" | "kr_trade" | "kr_quad_expiry";
/** 시장 일정(모든 종목) · 종목 사건(그 종목만 — 2단계 실적 공시) */
export type EventScope = "market" | "symbol";
export type EventRegion = "us" | "kr";

/**
 * 종류 이름 — 주요 사건 카드(코치)와 국내 탭 일정 줄(시장)이 **같은 이름**을 쓰도록 한 곳에 둔다
 * (`FE-REQ-046` FR-2 · FR-5). 서버 · BFF 는 코드만 준다
 */
export const EVENT_KIND_LABELS: Readonly<Record<MacroEventKind, string>> = {
  fomc: "FOMC 금리 결정",
  cpi: "미국 소비자물가(CPI)",
  jobs: "미국 고용보고서",
  kr_bok_rate: "금통위 기준금리 결정",
  kr_cpi: "소비자물가동향",
  kr_trade: "수출입동향",
  kr_quad_expiry: "선물 · 옵션 동시만기",
};

/** 지역 표시(국내 · 미국)를 옆에 붙일 때의 이름 — "미국 미국 고용보고서" 처럼 겹치지 않게 지역 말을 뺐다 */
export const EVENT_KIND_SHORT_LABELS: Readonly<Record<MacroEventKind, string>> = {
  ...EVENT_KIND_LABELS,
  cpi: "소비자물가(CPI)",
  jobs: "고용보고서",
};

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
      /** 기간 · 표본 · 평소 날 기준 · 빗나간 수 / 판정 수(F009 FR-33). 서버가 옛 버전이면 `null` */
      claim: PerformanceClaim | null;
    }
  | { horizonDays: number; renderable: false; blockedReason: string };

export interface MacroEventView {
  kind: MacroEventKind;
  scope: EventScope;
  region: EventRegion;
  eventAt: string;
  announcedAt: string;
  horizons: EventHorizonView[];
}

export type SymbolEventsResult =
  | { status: "ok"; symbol: string; label: string; disclaimer: string; events: MacroEventView[] }
  | { status: "unavailable" };
