/**
 * 홈 요약 카드 — 계약은 BFF 가 소유하고 `@repo/core/home` 이 같은 정의를 갖는다(`BFF-REQ-046` FR-2).
 * 프론트가 다시 정의하지 않는다(`layered-architecture.md` §6).
 */
export type {
  AppHomeVM,
  HomeCardBars,
  HomeCardPreview,
  HomeCardProgress,
  HomeCardProgressItem,
  HomeCardState,
  HomeCardTrend,
  HomeRecentItem,
  HomeUpcomingItem,
  HomeCardValue,
  HomeDomain,
  HomeSummaryCard,
  HomeMarketEvent,
  HomeMarketItem,
  HomeMarketVM,
} from "@repo/core/home";

/** 홈 대시보드가 같이 읽는 블록(2026-11-26) — 코치 브리핑 · 이번 주 적립. 계약은 BFF 가 소유하고 `@repo/core` 가 같은 정의를 갖는다 */
export type { CoachBriefing } from "@repo/core/coach";
export type { WeeklyPlanVM } from "@repo/core/plan";
