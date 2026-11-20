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

/**
 * 카드 미리보기 — 값을 다시 읽지 않고 **모양**으로 보이는 칸(`FE-REQ-048` FR-12 · `BFF-REQ-046` FR-12).
 * 숫자는 서버 값 그대로다(더하기 · 나누기 0). 화면은 그리기 위해 칸 높이로만 늘이고 줄인다 — 숫자를 새로 쓰지 않는다.
 * `label` 은 스크린 리더가 읽는 이름, `caption` 은 미리보기 아래 한 줄(없으면 null).
 */
export interface HomeCardTrend {
  kind: "trend";
  label: string;
  /** 시간순 값(원) — 2개 이상 */
  points: number[];
  caption: string | null;
}

export interface HomeCardBars {
  kind: "bars";
  label: string;
  /** 칸마다 값(원). null = 아직 오지 않은 칸(이번 달의 남은 날) */
  values: Array<number | null>;
  caption: string | null;
}

export interface HomeCardProgressItem {
  label: string;
  /** 0~1 — 서버 값(화면이 나누지 않는다) */
  ratio: number;
  value: string;
}

export interface HomeCardProgress {
  kind: "progress";
  label: string;
  items: HomeCardProgressItem[];
}

export type HomeCardPreview = HomeCardTrend | HomeCardBars | HomeCardProgress;

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
  /** 미리보기 — 못 받았거나 보일 것이 없으면 null(카드는 그대로) */
  preview: HomeCardPreview | null;
  /** 비어 있는 카드(`empty`)의 첫 행동 이름 — 카드 전체가 그 행동(`href`)으로 간다. 그 밖엔 null */
  action: string | null;
}

/** 최근 기록 한 줄(`FE-REQ-048` FR-13) — 지출 · 저축에 넣음 · 거래. 금액은 표시 문자열(부호 글자 포함) */
export interface HomeRecentItem {
  domain: HomeDomain;
  /** 무엇 — 지출은 쓴 곳(없으면 null — 화면이 분류 이름표로), 저축은 목표 이름, 투자는 종목 이름 */
  title: string | null;
  /** 지출 분류 키(이름표는 `@repo/core/labels`) — 지출이 아니면 null */
  category: string | null;
  detail: string;
  amount: string;
  /** "2026-11-20" — 한국 날짜 */
  date: string;
  href: string;
}

/** 다가오는 일 한 줄 — 매달 나가는 돈 예정 · 목표 기한 */
export interface HomeUpcomingItem {
  domain: HomeDomain;
  title: string;
  detail: string;
  amount: string | null;
  /** "2026-11-25" — 한국 날짜 */
  date: string;
  href: string;
}

export interface AppHomeVM {
  cards: HomeSummaryCard[];
  order: HomeDomain[];
  hidden: HomeDomain[];
  /** 최근 기록 — 원천을 하나도 못 받았으면 null(빈 배열 = 정말 없음) */
  recent: HomeRecentItem[] | null;
  /** 다가오는 일 — 원천을 하나도 못 받았으면 null */
  upcoming: HomeUpcomingItem[] | null;
}
// CONTRACT:END HomeSummaryCard
