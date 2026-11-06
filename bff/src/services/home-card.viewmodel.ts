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
  /** 값 아래 한 줄 — 도메인이 카드에 붙이는 문장(예: 매입가 숨김일 때 "오늘 처음 본다면"). 없으면 null */
  note: string | null;
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
    /** 진척이 가장 큰 진행 중 목표 — 사실만(칭찬 · 재촉 0). 퍼센트는 서버 값(소수 한 자리 내림) 그대로 */
    nearest: (title: string, percent: number) => `${title} ${percent.toFixed(1)}%`,
  },
  household: {
    title: "가계부",
    spent: "이번 달 지출",
    remaining: "예산 남은 금액",
    landing: "월말 예상",
    emptyLabel: "이번 달",
    emptyValue: "기록이 없어요",
    /** 착지 구간 — 한 점이 아니라 범위(서버 10 · 90% 구간 그대로) */
    range: (low: string, high: string) => `${low} ~ ${high}`,
  },
  invest: {
    title: "투자",
    total: "보유 평가",
    holdings: "보유 종목",
    profitRate: "손익률",
    emptyLabel: "보유",
    emptyValue: "기록이 없어요",
    /** 매입가 숨김을 켠 사람에게 — 산 값 대신 지금 값으로 보게 하는 질문(F009 FR-27, 전에 홈 보유 요약 아래 있던 줄) */
    firstLookQuestion: "오늘 처음 본다면, 지금 값으로 이만큼 담을까요?",
  },
  count: (n: number) => `${n}개`,
} as const;

/** 서버 `GET /savings/home-card`(Kotlin `savings`, `SRV-REQ-045` FR-15) 중 카드가 쓰는 것 — 숫자만, 문장은 여기서 */
export interface SavingsCardSource {
  totalGoals?: number;
  activeGoals?: number;
  totalSaved?: number | null;
  nearest?: { title: string; progressPercent: number } | null;
}

/** 서버 `GET /portfolio/summary` 를 BFF 가 옮긴 것 중 카드가 쓰는 것 */
export interface PortfolioCardSource {
  items: unknown[];
  totalKrw: number;
}

/**
 * 저축 카드 — 모은 돈 · 진행 중 목표 수 + 진척이 가장 큰 진행 중 목표 한 줄(FEATURE-012 FR-14). 진입은 저축 zone `/goals`(`FE-REQ-056`).
 */
export const SAVINGS_HREF = "/goals";

export const toSavingsCard = (src: SavingsCardSource, now: string): HomeSummaryCard => {
  const total = src.totalGoals ?? 0;
  const base = { domain: "savings" as const, title: HOME_CARD_TEXT.savings.title, href: SAVINGS_HREF, updatedAt: now };
  if (total === 0) {
    return {
      ...base,
      note: null,
      primary: { label: HOME_CARD_TEXT.savings.emptyLabel, value: HOME_CARD_TEXT.savings.emptyValue },
      secondary: null,
      state: "empty",
    };
  }
  return {
    ...base,
    note: src.nearest ? HOME_CARD_TEXT.savings.nearest(src.nearest.title, src.nearest.progressPercent) : null,
    primary: { label: HOME_CARD_TEXT.savings.saved, value: formatKrw(src.totalSaved ?? 0) },
    secondary: { label: HOME_CARD_TEXT.savings.active, value: HOME_CARD_TEXT.count(src.activeGoals ?? 0) },
    state: "ok",
  };
};

/** 서버 `GET /household/home-card`(Kotlin `household`, `SRV-REQ-046` FR-18) 중 카드가 쓰는 것 — 숫자만, 문장은 여기서 */
export interface HouseholdCardSource {
  spent: number;
  count: number;
  remaining: number | null;
  landing: { low: number | null; high: number | null } | null;
}

/** 가계부 카드 진입 — 가계부 zone `/household`(`FE-REQ-057`) */
export const HOUSEHOLD_HREF = "/household";

/**
 * 가계부 카드 — 이번 달 지출 + (예산 남은 금액 | 월말 예상 구간). 남은 금액이 음수여도 숫자만(경고 · 색 0 — FEATURE-013 정책).
 * 예산이 없고 착지 구간도 없으면(기록 14일 전) 두 번째 칸을 비운다.
 */
export const toHouseholdCard = (src: HouseholdCardSource, now: string): HomeSummaryCard => {
  const t = HOME_CARD_TEXT.household;
  const base = { domain: "household" as const, title: t.title, href: HOUSEHOLD_HREF, updatedAt: now, note: null };
  if (src.count === 0) {
    return { ...base, primary: { label: t.emptyLabel, value: t.emptyValue }, secondary: null, state: "empty" };
  }
  const low = src.landing?.low ?? null;
  const high = src.landing?.high ?? null;
  const secondary =
    src.remaining !== null
      ? { label: t.remaining, value: formatKrw(src.remaining) }
      : low !== null && high !== null
        ? { label: t.landing, value: t.range(formatKrw(low), formatKrw(high)) }
        : null;
  return { ...base, primary: { label: t.spent, value: formatKrw(src.spent) }, secondary, state: "ok" };
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
/** 투자 카드 · 첫 입력 진입 — 투자 zone 첫 화면(`FE-REQ-053`) */
export const INVEST_HREF = "/investments";

export const toInvestCard = (
  summary: PortfolioCardSource,
  now: string,
  profitRate: number | null = null,
  /** 매입가 숨김을 켰다고 **확인된** 사람 — "오늘 처음 본다면" 줄을 단다 */
  purchasePriceHidden = false,
): HomeSummaryCard => {
  const base = { domain: "invest" as const, title: HOME_CARD_TEXT.invest.title, href: INVEST_HREF, updatedAt: now, note: null };
  if (summary.items.length === 0) {
    return {
      ...base,
      primary: { label: HOME_CARD_TEXT.invest.emptyLabel, value: HOME_CARD_TEXT.invest.emptyValue },
      secondary: null,
      state: "empty",
      note: null,
    };
  }
  return {
    ...base,
    note: purchasePriceHidden ? HOME_CARD_TEXT.invest.firstLookQuestion : null,
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
  note: null,
});
