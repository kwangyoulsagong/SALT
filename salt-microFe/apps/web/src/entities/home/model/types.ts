/**
 * 홈 요약 카드 — 계약은 BFF 가 소유하고 `@repo/core/home` 이 같은 정의를 갖는다(`BFF-REQ-046` FR-2).
 * 프론트가 다시 정의하지 않는다(`layered-architecture.md` §6).
 */
export type {
  AppHomeVM,
  HomeCardState,
  HomeCardValue,
  HomeDomain,
  HomeSummaryCard,
} from "@repo/core/home";
