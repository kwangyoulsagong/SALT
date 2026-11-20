/**
 * 홈 둘째 줄 — 최근 기록 · 다가오는 일 (`FE-REQ-048` FR-13 · `BFF-REQ-046` FR-13, 2026-11-20).
 *
 * 카드 셋만 있던 홈은 카드 아래가 비었다(사용자 "빈게 많구"). 도메인 서비스가 이미 주는 것만 모은다 —
 * 이번 달 지출(가계부 월) · 진행 중 목표의 넣은 기록(목표 상세, 앞에서 몇 개) · 거래 첫 쪽(포트폴리오). 다가오는 일은
 * 매달 나가는 돈 예정(`upcoming` · `ask`) · 목표 기한. 금액은 서버 숫자의 표시 포맷만(더하기 · 나누기 0).
 * 정의는 `home-card.viewmodel.ts` CONTRACT 블록(= `@repo/core/home`)에 있다.
 */
import { formatKrw, type HomeDomain, type HomeRecentItem, type HomeUpcomingItem } from "./home-card.viewmodel";

/** 홈에 보이는 줄 수 — 카드 한 줄 높이와 맞춘 표시 상한(고르는 규칙은 날짜 순) */
export const HOME_RECENT_LIMIT = 6;
export const HOME_UPCOMING_LIMIT = 5;

export const HOME_FEED_TEXT = {
  expense: "지출",
  deposit: "저축에 넣음",
  buy: "샀어요",
  sell: "팔았어요",
  recurring: "매달 나가는 돈",
  goalDue: "목표 기한",
  remaining: (amount: string) => `남은 ${amount}`,
} as const;

/** 서버 지출 행 중 쓰는 것 */
export interface ExpenseFeedSource {
  amount: number;
  spentOn: string;
  category: string;
  merchant: string | null;
}

export interface DepositFeedSource {
  goalId: string;
  goalTitle: string;
  amount: number;
  depositedOn: string;
}

export interface TradeFeedSource {
  name: string;
  side: string;
  totalAmount: number;
  transactionDate: string;
}

export interface OccurrenceFeedSource {
  name: string;
  amount: number;
  dueOn: string;
  stage: string;
}

export interface GoalDueFeedSource {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  remaining: number;
}

/** ISO 시각 → 한국 날짜 "YYYY-MM-DD" */
export const kstDate = (iso: string): string | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

const isDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isAmount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * 최근 기록 — 세 원천을 날짜 내림차순으로 섞어 앞에서 몇 줄. 같은 날이면 지출 → 저축 → 거래(원천 순서 그대로).
 * 원천 하나를 못 받았으면(null) 그 원천만 빠진다 · 모양이 틀린 행은 버린다
 */
export const toRecentFeed = (
  expenses: ExpenseFeedSource[] | null,
  deposits: DepositFeedSource[] | null,
  trades: TradeFeedSource[] | null,
  hidden: ReadonlySet<HomeDomain>,
): HomeRecentItem[] => {
  const rows: HomeRecentItem[] = [];
  if (!hidden.has("household")) {
    for (const e of Array.isArray(expenses) ? expenses : []) {
      if (!isAmount(e?.amount) || !isDay(e.spentOn) || typeof e.category !== "string") continue;
      rows.push({
        domain: "household",
        title: e.merchant ?? null,
        category: e.category,
        detail: HOME_FEED_TEXT.expense,
        amount: `-${formatKrw(e.amount)}`,
        date: e.spentOn,
        href: "/household",
      });
    }
  }
  if (!hidden.has("savings")) {
    for (const d of Array.isArray(deposits) ? deposits : []) {
      if (!isAmount(d?.amount) || !isDay(d.depositedOn) || typeof d.goalTitle !== "string") continue;
      rows.push({
        domain: "savings",
        title: d.goalTitle,
        category: null,
        detail: HOME_FEED_TEXT.deposit,
        amount: `+${formatKrw(d.amount)}`,
        date: d.depositedOn,
        href: `/goals/${encodeURIComponent(d.goalId)}`,
      });
    }
  }
  if (!hidden.has("invest")) {
    for (const t of Array.isArray(trades) ? trades : []) {
      const date = typeof t?.transactionDate === "string" ? kstDate(t.transactionDate) : null;
      if (!isAmount(t?.totalAmount) || date === null || typeof t.name !== "string") continue;
      rows.push({
        domain: "invest",
        title: t.name,
        category: null,
        detail: t.side === "sell" ? HOME_FEED_TEXT.sell : HOME_FEED_TEXT.buy,
        amount: formatKrw(t.totalAmount),
        date,
        href: "/portfolio/transactions",
      });
    }
  }
  // 안정 정렬 — 같은 날이면 넣은 순서(지출 → 저축 → 거래)
  return rows.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)).slice(0, HOME_RECENT_LIMIT);
};

/**
 * 다가오는 일 — 오늘(한국) 이후의 매달 나가는 돈 예정과 진행 중 목표 기한, 날짜 오름차순 앞에서 몇 줄.
 * 이미 지나간 날 · 처리한 예정(confirmed · skipped)은 넣지 않는다
 */
export const toUpcomingFeed = (
  occurrences: OccurrenceFeedSource[] | null,
  goals: GoalDueFeedSource[] | null,
  today: string,
  hidden: ReadonlySet<HomeDomain>,
): HomeUpcomingItem[] => {
  const rows: HomeUpcomingItem[] = [];
  if (!hidden.has("household")) {
    for (const o of Array.isArray(occurrences) ? occurrences : []) {
      if (!isDay(o?.dueOn) || o.dueOn < today || (o.stage !== "upcoming" && o.stage !== "ask") || !isAmount(o.amount)) continue;
      rows.push({
        domain: "household",
        title: o.name,
        detail: HOME_FEED_TEXT.recurring,
        amount: formatKrw(o.amount),
        date: o.dueOn,
        href: "/household/templates",
      });
    }
  }
  if (!hidden.has("savings")) {
    for (const g of Array.isArray(goals) ? goals : []) {
      if (g?.status !== "active" || !isDay(g.targetDate) || g.targetDate < today) continue;
      rows.push({
        domain: "savings",
        title: g.title,
        detail: HOME_FEED_TEXT.goalDue,
        amount: isAmount(g.remaining) ? HOME_FEED_TEXT.remaining(formatKrw(g.remaining)) : null,
        date: g.targetDate,
        href: `/goals/${encodeURIComponent(g.id)}`,
      });
    }
  }
  return rows.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1)).slice(0, HOME_UPCOMING_LIMIT);
};
