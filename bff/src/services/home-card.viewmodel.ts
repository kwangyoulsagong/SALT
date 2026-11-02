/**
 * 홈 요약 카드 계약 (`BFF-REQ-046` FR-1 · FR-2, `ADR-005` §2).
 *
 * 셸은 도메인 코드를 모른다 — 홈은 도메인마다 **카드 한 장**을 받아 그린다. 값은 표시 문자열이고
 * 프론트는 계산하지 않는다(BFF 도 더하거나 나누지 않는다 — 서버 숫자의 표시 포맷만).
 *
 * ## 정의가 두 벌이다 — 한 벌로 맞춰 둔다
 *
 * `bff` 는 pnpm workspace 밖이라 `@repo/core` 를 import 하지 못한다. 그래서 같은 정의를
 * `salt-microFe/packages/core/src/home/homeSummaryCard.ts` 에도 두고, 아래 `CONTRACT` 블록을
 * `__tests__/home-card-contract.test.ts` 가 글자 그대로 대조한다(한쪽만 고치면 테스트가 깨진다).
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
}

export interface AppHomeVM {
  cards: HomeSummaryCard[];
  order: HomeDomain[];
  hidden: HomeDomain[];
}
// CONTRACT:END HomeSummaryCard

/** 기본 순서 — 저축 → 가계부 → 투자 → 팁 (`FEATURE-015` FR-2). 사용자 순서 저장은 서버 identity(S3) 뒤 */
export const DEFAULT_HOME_ORDER: HomeDomain[] = ["savings", "household", "invest", "tips"];

/** 카드 하나의 상한 — 넘으면 그 카드만 `degraded` (`BFF-REQ-046` FR-3) */
export const HOME_CARD_TIMEOUT_MS = 800;

/** 원 단위 표시. 서버 숫자를 **포맷만** 한다 */
export const formatKrw = (value: number): string => `${Math.round(value).toLocaleString("ko-KR")}원`;

/** 퍼센트 표시 — 부호를 글자로 붙인다(색만으로 방향을 전하지 않는다). 서버 숫자를 **포맷만** 한다 */
export const formatRate = (value: number): string => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

/** 카드 문구 — 화면 문구는 BFF 가 소유한 계약이다(카드 `title` · `label`). 칭찬 · 재촉 · 연동 문구 0 */
export const HOME_CARD_TEXT = {
  savings: {
    title: "저축 목표",
    saved: "모은 돈",
    active: "진행 중인 목표",
    emptyLabel: "목표",
    emptyValue: "아직 없어요",
  },
  invest: {
    title: "투자",
    total: "보유 평가",
    holdings: "보유 종목",
    profitRate: "손익률",
    emptyLabel: "보유",
    emptyValue: "기록이 없어요",
  },
  count: (n: number) => `${n}개`,
} as const;

/** 서버 `GET /goals/statistics` (`salt-server` goal) */
export interface ServerGoalStatistics {
  totalGoals?: number;
  activeGoals?: number;
  completedGoals?: number;
  totalSaved?: number;
}

/** 서버 `GET /portfolio/summary` 를 BFF 가 옮긴 것 중 카드가 쓰는 것 */
export interface PortfolioCardSource {
  items: unknown[];
  totalKrw: number;
}

/**
 * 저축 카드. 진입은 아직 셸 `/goals/addgoals` 하나다 — `/goals` 목록 화면은 저축 zone 이 생길 때(`FE-REQ-056`).
 */
export const toSavingsCard = (stats: ServerGoalStatistics, now: string): HomeSummaryCard => {
  const total = stats.totalGoals ?? 0;
  const base = { domain: "savings" as const, title: HOME_CARD_TEXT.savings.title, href: "/goals/addgoals", updatedAt: now };
  if (total === 0) {
    return {
      ...base,
      primary: { label: HOME_CARD_TEXT.savings.emptyLabel, value: HOME_CARD_TEXT.savings.emptyValue },
      secondary: null,
      state: "empty",
    };
  }
  return {
    ...base,
    primary: { label: HOME_CARD_TEXT.savings.saved, value: formatKrw(stats.totalSaved ?? 0) },
    secondary: { label: HOME_CARD_TEXT.savings.active, value: HOME_CARD_TEXT.count(stats.activeGoals ?? 0) },
    state: "ok",
  };
};

/**
 * 투자 카드 — 보유 평가 한 줄 + (손익률 | 보유 종목 수).
 *
 * **손익률은 매입가 숨김(F009 FR-27)을 끈 사람에게만 싣는다.** 전에 홈 보유 요약이 그랬고, 설정 화면의 문구
 * ("켜면 홈 보유 요약에서 손익률이 빠져요")가 그 약속이다. `profitRate` 는 서버 `/portfolio/stats` 의 총 손익률
 * (서버 계산) — 숨김이거나 설정 · 통계를 못 받았으면 `null` 이 오고 종목 수를 싣는다(숨김을 깨는 쪽으로 넘어지지 않는다).
 * 코치 한 줄은 싣지 않는다 — 판단은 근거 · 적중률 · 실패사례 3종이 같이 있어야 렌더한다(제품 공통 수용 기준 1).
 * 적립(F003)은 아직 없다.
 */
export const toInvestCard = (
  summary: PortfolioCardSource,
  now: string,
  profitRate: number | null = null,
): HomeSummaryCard => {
  const base = { domain: "invest" as const, title: HOME_CARD_TEXT.invest.title, href: "/investments", updatedAt: now };
  if (summary.items.length === 0) {
    return {
      ...base,
      primary: { label: HOME_CARD_TEXT.invest.emptyLabel, value: HOME_CARD_TEXT.invest.emptyValue },
      secondary: null,
      state: "empty",
    };
  }
  return {
    ...base,
    primary: { label: HOME_CARD_TEXT.invest.total, value: formatKrw(summary.totalKrw) },
    secondary:
      profitRate === null
        ? { label: HOME_CARD_TEXT.invest.holdings, value: HOME_CARD_TEXT.count(summary.items.length) }
        : { label: HOME_CARD_TEXT.invest.profitRate, value: formatRate(profitRate) },
    state: "ok",
  };
};

/** 받지 못한 카드 — 값 0 을 내려보내지 않는다(0 은 "0원"으로 읽힌다, `bff-architecture.md` §5) */
export const degradedCard = (domain: HomeDomain, title: string, href: string, now: string): HomeSummaryCard => ({
  domain,
  title,
  primary: null,
  secondary: null,
  href,
  state: "degraded",
  updatedAt: now,
});
