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
/** 홈 시장 칸 한 줄(`BFF-REQ-046` FR-14, 2026-11-26) — 무엇을 보일지는 BFF 가 고른다(국내 지수 둘 · 코인 대표 둘). 값은 서버 그대로 */
export interface HomeMarketItem {
  symbol: string;
  name: string;
  kind: "index" | "coin";
  /** 지수는 로고가 없다 */
  logoUrl: string | null;
  currentPrice: number;
  /** 전일 대비 등락률(%, 부호 포함) — 서버 값 */
  changeRate: number;
  /** 흐름 — 못 받았으면 null */
  sparkline: number[] | null;
  /** 상세 주소 — 지수는 상세가 없어 null */
  href: string | null;
}

/** 다가오는 증시 일정 한 줄 — 국내 공개 일정. 이름표는 `@repo/core/coach` `EVENT_KIND_LABELS` */
export interface HomeMarketEvent {
  kind: "kr_bok_rate" | "kr_cpi" | "kr_trade" | "kr_quad_expiry";
  eventAt: string;
  daysUntil: number;
}

/** `GET /api/app/home/market` — 개인 기록이 없어도 늘 차는 홈 블록 */
export interface HomeMarketVM {
  items: HomeMarketItem[];
  events: HomeMarketEvent[];
  /** 국내 · 코인 중 하나라도 못 받았으면 true — 받은 것만 그린다 */
  degraded: boolean;
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
    /** 비었을 때 카드가 가는 곳 · 이름 — 목표 만들기(템플릿 고르기) */
    emptyAction: "첫 목표 만들기",
    /** 진척이 가장 큰 진행 중 목표 — 사실만(칭찬 · 재촉 0). 퍼센트는 서버 값(소수 한 자리 내림) 그대로 */
    nearest: (title: string, percent: number) => `${title} ${percent.toFixed(1)}%`,
    /** 미리보기 — 진행 중 목표의 진척(서버 순서 그대로 앞에서 몇 개) */
    previewLabel: "진행 중인 목표 진척",
    percent: (percent: number) => `${percent.toFixed(1)}%`,
  },
  household: {
    title: "가계부",
    spent: "이번 달 지출",
    remaining: "예산 남은 금액",
    landing: "월말 예상",
    emptyLabel: "이번 달",
    emptyValue: "기록이 없어요",
    emptyAction: "첫 지출 적기",
    /** 착지 구간 — 한 점이 아니라 범위(서버 10 · 90% 구간 그대로) */
    range: (low: string, high: string) => `${low} ~ ${high}`,
    /** 미리보기 — 이번 달 날마다 쓴 돈(달력 칸 그대로) */
    previewLabel: "이번 달 날마다 쓴 돈",
    previewCaption: (month: number) => `${month}월 날마다 쓴 돈`,
  },
  invest: {
    title: "투자",
    total: "보유 평가",
    holdings: "보유 종목",
    profitRate: "손익률",
    emptyLabel: "보유",
    emptyValue: "기록이 없어요",
    emptyAction: "보유 기록하러 가기",
    /** 매입가 숨김을 켠 사람에게 — 산 값 대신 지금 값으로 보게 하는 질문(F009 FR-27, 전에 홈 보유 요약 아래 있던 줄) */
    firstLookQuestion: "오늘 처음 본다면, 지금 값으로 이만큼 담을까요?",
    /** 밴드 적립 이번 주 계획(F003 v2 · `BFF-REQ-019` 개정) — 금액은 서버 값, 계획이라는 사실만(지시형 0) */
    weeklyPlan: (amount: string) => `이번 주 적립 계획 ${amount}`,
    /** 미리보기 — 보유 평가금 흐름(그날 실제 수량 × 일봉, 서버 계산) */
    previewLabel: "최근 1개월 보유 평가 흐름",
    previewCaption: "최근 1개월",
    previewCaptionWithRate: (rate: string) => `최근 1개월 ${rate}`,
  },
  count: (n: number) => `${n}개`,
} as const;

/** 홈 미리보기 칸 수 — 카드 한 장 높이 안에 들어가는 만큼(표시 상한, 고르는 규칙은 서버 순서) */
export const HOME_PREVIEW_GOALS = 3;

/** 서버 `GET /savings/goals` 중 미리보기가 쓰는 것 — 서버가 진행 중 → 멈춤 → 끝남, 만든 순으로 준다 */
export interface SavingsGoalPreviewSource {
  title: string;
  status: string;
  progressPercent: number;
  progressRatio: number;
}

/** 진행 중 목표 앞에서 몇 개 — 순서 · 진척은 서버 값. 진행 중이 없으면 null */
export const toSavingsPreview = (goals: SavingsGoalPreviewSource[]): HomeCardProgress | null => {
  const t = HOME_CARD_TEXT.savings;
  // 모양이 틀리면 미리보기만 없다 — 카드 값을 버리지 않는다(`bff-architecture.md` §5)
  if (!Array.isArray(goals)) return null;
  const items = goals
    .filter((goal) => goal?.status === "active" && typeof goal.title === "string" && Number.isFinite(goal.progressRatio))
    .slice(0, HOME_PREVIEW_GOALS)
    .map((goal) => ({ label: goal.title, ratio: goal.progressRatio, value: t.percent(goal.progressPercent) }));
  return items.length === 0 ? null : { kind: "progress", label: t.previewLabel, items };
};

/** 서버 `GET /household/month/{ym}` 달력 중 미리보기가 쓰는 것 — 칸 상태는 서버가 정한다(future · spent · no_spend · blank) */
export interface HouseholdCalendarPreviewSource {
  month: string;
  calendar: { days: Array<{ state: string; spent: number }> };
}

/** 이번 달 날마다 쓴 돈 — 오지 않은 날(`future`)은 빈 칸(null). 쓴 날이 하루도 없으면 null */
export const toHouseholdPreview = (src: HouseholdCalendarPreviewSource): HomeCardBars | null => {
  const t = HOME_CARD_TEXT.household;
  if (!Array.isArray(src?.calendar?.days) || typeof src.month !== "string") return null;
  const values = src.calendar.days.map((day) => (day.state === "future" || !Number.isFinite(day.spent) ? null : day.spent));
  if (!values.some((value) => value !== null && value > 0)) return null;
  const month = Number(src.month.slice(5, 7));
  return { kind: "bars", label: t.previewLabel, values, caption: Number.isFinite(month) ? t.previewCaption(month) : null };
};

/** 서버 `GET /portfolio/position/flow?range=1m` 중 미리보기가 쓰는 것 */
export interface PositionFlowPreviewSource {
  points: Array<{ valueKrw: number }>;
  periodReturnPct: number | null;
}

/**
 * 최근 1개월 평가금 흐름. 기간 수익률은 **손익률을 보여도 되는 사람에게만**(매입가 숨김 F009 FR-27 — 카드 손익률과 같은 판정).
 * 점이 둘 미만이면 null
 */
export const toInvestPreview = (flow: PositionFlowPreviewSource, showRate: boolean): HomeCardTrend | null => {
  const t = HOME_CARD_TEXT.invest;
  if (!Array.isArray(flow?.points)) return null;
  const points = flow.points.map((point) => point?.valueKrw).filter((value) => Number.isFinite(value));
  if (points.length < 2) return null;
  const rate = showRate && flow.periodReturnPct !== null && Number.isFinite(flow.periodReturnPct) ? flow.periodReturnPct : null;
  return {
    kind: "trend",
    label: t.previewLabel,
    points,
    caption: rate === null ? t.previewCaption : t.previewCaptionWithRate(formatRate(rate)),
  };
};

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
/** 비어 있는 카드의 첫 행동 자리(zone 경로) — 목표 만들기 · 지출 적기 · 포트폴리오(보유 기록 시트) */
export const SAVINGS_EMPTY_HREF = "/goals/new";
export const HOUSEHOLD_EMPTY_HREF = "/household/new";
export const INVEST_EMPTY_HREF = "/portfolio";

export const toSavingsCard = (src: SavingsCardSource, now: string, preview: HomeCardPreview | null = null): HomeSummaryCard => {
  const total = src.totalGoals ?? 0;
  const base = { domain: "savings" as const, title: HOME_CARD_TEXT.savings.title, href: SAVINGS_HREF, updatedAt: now };
  if (total === 0) {
    return {
      ...base,
      href: SAVINGS_EMPTY_HREF,
      action: HOME_CARD_TEXT.savings.emptyAction,
      note: null,
      preview: null,
      primary: { label: HOME_CARD_TEXT.savings.emptyLabel, value: HOME_CARD_TEXT.savings.emptyValue },
      secondary: null,
      state: "empty",
    };
  }
  return {
    ...base,
    // 미리보기가 진척 막대를 보이면 같은 진척 한 줄을 또 쓰지 않는다(같은 숫자 두 번 — `screen-desktop.md` §5)
    action: null,
    note: preview === null && src.nearest ? HOME_CARD_TEXT.savings.nearest(src.nearest.title, src.nearest.progressPercent) : null,
    preview,
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
export const toHouseholdCard = (src: HouseholdCardSource, now: string, preview: HomeCardPreview | null = null): HomeSummaryCard => {
  const t = HOME_CARD_TEXT.household;
  const base = { domain: "household" as const, title: t.title, href: HOUSEHOLD_HREF, updatedAt: now, note: null };
  if (src.count === 0) {
    return {
      ...base,
      href: HOUSEHOLD_EMPTY_HREF,
      action: t.emptyAction,
      primary: { label: t.emptyLabel, value: t.emptyValue },
      secondary: null,
      state: "empty",
      preview: null,
    };
  }
  const low = src.landing?.low ?? null;
  const high = src.landing?.high ?? null;
  const secondary =
    src.remaining !== null
      ? { label: t.remaining, value: formatKrw(src.remaining) }
      : low !== null && high !== null
        ? { label: t.landing, value: t.range(formatKrw(low), formatKrw(high)) }
        : null;
  return { ...base, primary: { label: t.spent, value: formatKrw(src.spent) }, secondary, state: "ok", preview, action: null };
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
  /** 이번 주 적립 계획 총액(서버 값) — 설정 전 · 못 받음이면 null(줄 없음). 숨김 질문이 있으면 그 줄이 먼저다(F009 FR-27 결정 유지) */
  weeklyPlanKrw: number | null = null,
  preview: HomeCardPreview | null = null,
): HomeSummaryCard => {
  const planNote = weeklyPlanKrw === null ? null : HOME_CARD_TEXT.invest.weeklyPlan(formatKrw(weeklyPlanKrw));
  const base = { domain: "invest" as const, title: HOME_CARD_TEXT.invest.title, href: INVEST_HREF, updatedAt: now, note: planNote };
  if (summary.items.length === 0) {
    return {
      ...base,
      primary: { label: HOME_CARD_TEXT.invest.emptyLabel, value: HOME_CARD_TEXT.invest.emptyValue },
      secondary: null,
      state: "empty",
      preview: null,
      href: INVEST_EMPTY_HREF,
      action: HOME_CARD_TEXT.invest.emptyAction,
    };
  }
  return {
    ...base,
    preview,
    action: null,
    note: purchasePriceHidden ? HOME_CARD_TEXT.invest.firstLookQuestion : planNote,
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
  preview: null,
  action: null,
});
