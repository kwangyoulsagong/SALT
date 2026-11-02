/**
 * 홈 요약 카드 계약 (`FE-REQ-055` FR-1 · `BFF-REQ-046` FR-2, `ADR-005` §2).
 *
 * **계약의 주인은 BFF 다** — `bff/src/services/home-card.viewmodel.ts`. `bff` 는 pnpm workspace 밖이라 이 파일을
 * import 하지 못해 같은 정의를 둘 둔다. 아래 `CONTRACT` 블록은 BFF 파일과 **글자 그대로 같아야** 하고
 * `bff/src/services/__tests__/home-card-contract.test.ts` 가 대조한다.
 *
 * 셸 홈은 이 카드만 그린다 — 도메인 코드를 모른다. `primary.value` 는 표시 문자열이다(프론트 계산 0).
 * `primary` 가 `null` 이면 `degraded`(값을 못 받았다) — 0 으로 그리지 않는다.
 */

// CONTRACT:BEGIN HomeSummaryCard
export type HomeDomain = "invest" | "savings" | "household" | "tips";

export type HomeCardState = "ok" | "empty" | "degraded";

export interface HomeCardValue {
  label: string;
  value: string;
}

export interface HomeSummaryCard {
  domain: HomeDomain;
  title: string;
  primary: HomeCardValue | null;
  secondary: HomeCardValue | null;
  href: string;
  state: HomeCardState;
  updatedAt: string;
  /** 값 아래 한 줄 — 도메인이 카드에 붙이는 문장(예: 매입가 숨김일 때 "오늘 처음 본다면"). 없으면 null */
  note: string | null;
}

export interface AppHomeVM {
  cards: HomeSummaryCard[];
  order: HomeDomain[];
  hidden: HomeDomain[];
}
// CONTRACT:END HomeSummaryCard
