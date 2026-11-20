import { logger } from "../config/logger";
import { appAICoachService } from "./app-ai-coach.service";
import { appPlanService } from "./app-plan.service";
import { appPortfolioService } from "./app-portfolio.service";
import { appHouseholdService } from "./app-household.service";
import { appSavingsService } from "./app-savings.service";
import { backendApi } from "./backend-api.service";
import type { HouseholdMonthVM } from "./app-household.service";
import type { SavingsGoalVM } from "./app-savings.service";
import { kstDate, toRecentFeed, toUpcomingFeed, type DepositFeedSource } from "./home-feed.viewmodel";
import {
  DEFAULT_HOME_ORDER,
  HOME_CARD_TEXT,
  HOME_CARD_TIMEOUT_MS,
  degradedCard,
  toInvestCard,
  toSavingsCard,
  toHouseholdCard,
  toHouseholdPreview,
  toInvestPreview,
  toSavingsPreview,
  HOUSEHOLD_HREF,
  SAVINGS_HREF,
  type AppHomeVM,
  type HomeDomain,
  type HomeSummaryCard,
} from "./home-card.viewmodel";

export type { AppHomeVM, HomeSummaryCard } from "./home-card.viewmodel";

/** 홈 투자 카드의 적립 한 줄 — 카드 예산(800ms) 안에서 끝나야 한다. 넘으면 그 줄만 빠진다 */
const HOME_PLAN_LINE_TIMEOUT_MS = 600;

/**
 * 카드 미리보기의 예산 — 카드 예산(800ms) 안에서 끝나야 한다. 넘거나 실패하면 **미리보기만** 빠진다(카드 값은 그대로).
 * 카드 값과 나란히 부르므로 카드 하나가 늦어지는 폭은 이 값까지다(`BFF-REQ-046` FR-12)
 */
export const HOME_PREVIEW_TIMEOUT_MS = 600;

/** 한국 시간 이번 달 "YYYY-MM" — 가계부 달력을 부를 달(서버 home-card 와 같은 달력 기준) */
export const kstMonth = (now: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
};

/** 미리보기 한 칸 — 실패 · 예산 초과는 null 로 접고 사유만 남긴다(금액 0) */
const previewOrNull = async <T, R>(domain: HomeDomain, work: Promise<T>, build: (value: T) => R | null): Promise<R | null> => {
  try {
    return build(await withinBudget(work, HOME_PREVIEW_TIMEOUT_MS));
  } catch (error) {
    if (isUnauthenticated(error)) throw error;
    logger.warn("홈 카드 미리보기를 받지 못했다", { domain, reason: (error as Error | undefined)?.message });
    return null;
  }
};

/** 정해진 시간 안에 오지 않으면 실패로 본다 — 그 카드만 `degraded` (`BFF-REQ-046` FR-3) */
const withinBudget = <T>(work: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`home card timeout ${ms}ms`)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

/**
 * 손익률을 보여도 되는 경우만 숫자를 준다 — 매입가 숨김을 **확인하고 꺼져 있을 때**(F009 FR-27).
 * 설정을 못 받았으면 보이지 않는 쪽으로(숨김을 켠 사람에게 한 번 보였다 사라지면 숨김이 아니다).
 */
const visibleProfitRate = (
  profile: PromiseSettledResult<{ hidePurchasePrice: boolean }>,
  stats: PromiseSettledResult<{ data?: { data?: { profitRate?: unknown } } }>,
): number | null => {
  if (profile.status !== "fulfilled" || profile.value.hidePurchasePrice) return null;
  if (stats.status !== "fulfilled") return null;
  const rate = stats.value.data?.data?.profitRate;
  return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
};

/**
 * 인증이 거절됐는지 — 카드 하나의 실패가 아니라 **사용자 전체의 상태**다. 그대로 올려 홈이 401 이 되게 한다
 * (오류 미들웨어가 서버 4xx 를 그대로 옮긴다). 카드 `degraded` 로 덮으면 프론트가 토큰 갱신 · 로그인 이동을 못 한다
 * — 만료 토큰으로 홈이 "불러오지 못했어요" 두 장으로 남았다(2026-11-02 실측).
 */
const isUnauthenticated = (reason: unknown): boolean =>
  (reason as { response?: { status?: number } } | undefined)?.response?.status === 401;

/**
 * 카드 미리보기와 홈 둘째 줄이 같이 쓰는 원천 — 요청 한 번에 한 번씩만 부른다(목표 목록 · 이번 달 가계부).
 * 실패는 쓰는 쪽이 각자 null 로 접는다(처리 안 된 거절이 남지 않게 여기서 한 번 받아 둔다)
 */
interface HomeSources {
  goals: Promise<SavingsGoalVM[]>;
  month: Promise<HouseholdMonthVM>;
}

const startSources = (token: string, now: string): HomeSources => {
  const goals = appSavingsService.goals(token, HOME_PREVIEW_TIMEOUT_MS);
  const month = appHouseholdService.month(token, kstMonth(new Date(now)), HOME_PREVIEW_TIMEOUT_MS);
  goals.catch(() => undefined);
  month.catch(() => undefined);
  return { goals, month };
};

interface CardSource {
  domain: HomeDomain;
  title: string;
  href: string;
  load: (token: string, now: string, sources: HomeSources) => Promise<HomeSummaryCard>;
}

/**
 * 카드를 내는 도메인. **서비스가 없는 도메인(팁)은 카드를 내지 않는다** — 빈 카드나 `degraded` 로
 * "있는데 실패한 것"처럼 보이지 않게. 서버 서비스가 생기면(`SRV-REQ-046` · `047`) 여기 한 줄씩 붙는다.
 */
const CARD_SOURCES: CardSource[] = [
  {
    domain: "savings",
    title: HOME_CARD_TEXT.savings.title,
    href: SAVINGS_HREF,
    // Kotlin savings 서비스(라우팅 표 `/savings` → platform). 옛 `/goals/statistics` 는 은퇴(BFF-REQ-047 FR-7)
    // 카드 값과 진척 미리보기(목표 목록)를 나란히 — 미리보기 실패는 그 칸만 빠진다
    load: async (token, now, sources) => {
      const [card, preview] = await Promise.all([
        appSavingsService.homeCard(token, HOME_CARD_TIMEOUT_MS),
        previewOrNull("savings", sources.goals, toSavingsPreview),
      ]);
      return toSavingsCard(card, now, preview);
    },
  },
  {
    domain: "household",
    title: HOME_CARD_TEXT.household.title,
    href: HOUSEHOLD_HREF,
    // Kotlin household 서비스(라우팅 표 `/household` → platform, `SRV-REQ-046` FR-18)
    // 카드 값과 이번 달 달력(날마다 쓴 돈)을 나란히
    load: async (token, now, sources) => {
      const [card, preview] = await Promise.all([
        appHouseholdService.homeCard(token, HOME_CARD_TIMEOUT_MS),
        previewOrNull("household", sources.month, toHouseholdPreview),
      ]);
      return toHouseholdCard(card, now, preview);
    },
  },
  {
    domain: "invest",
    title: HOME_CARD_TEXT.invest.title,
    href: "/investments",
    load: async (token, now) => {
      // 다섯을 같이 부른다. 보유 요약이 실패하면 카드가 degraded, 설정 · 통계가 실패하면 손익률만, 적립 계획이 실패하면 그 줄만,
      // 평가금 흐름이 실패하면 미리보기만 뺀다
      const [summary, profile, stats, plan, flow] = await Promise.allSettled([
        appPortfolioService.getSummary(token),
        appAICoachService.getProfile(token),
        backendApi.proxyAuthRequest("GET", "/portfolio/stats", token, undefined, { timeout: HOME_CARD_TIMEOUT_MS }),
        // 카드 예산보다 짧게 — 적립 줄이 늦어 카드 전체가 degraded 가 되지 않게
        appPlanService.getWeekly(token, HOME_PLAN_LINE_TIMEOUT_MS, false),
        withinBudget(appPortfolioService.getPositionFlow(token, "1m", HOME_PREVIEW_TIMEOUT_MS), HOME_PREVIEW_TIMEOUT_MS),
      ]);
      if (summary.status === "rejected") throw summary.reason;
      const hidden = profile.status === "fulfilled" && profile.value.hidePurchasePrice;
      const planKrw = plan.status === "fulfilled" && plan.value.configured ? plan.value.totalKrw : null;
      const profitRate = visibleProfitRate(profile, stats);
      if (flow.status === "rejected") logger.warn("홈 카드 미리보기를 받지 못했다", { domain: "invest", reason: flow.reason?.message });
      // 기간 수익률은 손익률과 같은 판정(숨김을 확인하고 꺼져 있을 때만)
      const showRate = profile.status === "fulfilled" && !profile.value.hidePurchasePrice;
      const preview = flow.status === "fulfilled" ? toInvestPreview(flow.value, showRate) : null;
      return toInvestCard(summary.value, now, profitRate, hidden, planKrw, preview);
    },
  },
];

/** 최근 기록에 넣은 기록을 읽을 진행 중 목표 수 — 목표 상세를 이만큼 나란히 부른다(서버 순서 앞에서) */
export const HOME_FEED_GOALS = 3;

/** 둘째 줄 원천 예산 — 카드 예산 안. 넘은 원천은 그 줄에서만 빠진다 */
export const HOME_FEED_TIMEOUT_MS = 700;

const settle = async <T>(work: Promise<T>): Promise<T | null> => {
  try {
    return await withinBudget(work, HOME_FEED_TIMEOUT_MS);
  } catch (error) {
    if (isUnauthenticated(error)) throw error;
    logger.warn("홈 둘째 줄 원천을 받지 못했다", { reason: (error as Error | undefined)?.message });
    return null;
  }
};

/** 진행 중 목표 앞에서 몇 개의 넣은 기록 — 목표 목록 → 상세(나란히). 상세 하나가 실패하면 그 목표만 빠진다 */
const loadDeposits = async (token: string, goals: Promise<SavingsGoalVM[]>): Promise<DepositFeedSource[]> => {
  const list = await goals;
  const active = (Array.isArray(list) ? list : []).filter((g) => g?.status === "active").slice(0, HOME_FEED_GOALS);
  const details = await Promise.allSettled(active.map((g) => appSavingsService.goal(token, g.id)));
  return details.flatMap((d, i) =>
    d.status === "fulfilled" && Array.isArray(d.value?.deposits)
      ? d.value.deposits.map((dep) => ({ goalId: active[i].id, goalTitle: active[i].title, amount: dep.amount, depositedOn: dep.depositedOn }))
      : [],
  );
};

/** 서버(identity)가 정한 홈 배치 — 저장 전이면 서버 기본값(고르지 않은 도메인 숨김). 모르는 키는 버린다 */
export interface HomeLayoutVM {
  order: HomeDomain[];
  hidden: HomeDomain[];
}

const isHomeDomain = (v: unknown): v is HomeDomain => typeof v === "string" && (DEFAULT_HOME_ORDER as string[]).includes(v);

export const toHomeLayout = (layout: { order?: unknown; hidden?: unknown } | undefined): HomeLayoutVM | null => {
  const order = Array.isArray(layout?.order) ? layout.order.filter(isHomeDomain) : [];
  if (order.length === 0) return null;
  // 서버가 카드를 늘렸는데 BFF 가 모르면 그 카드는 빠지고, BFF 가 아는데 서버 순서에 없으면 기본 순서로 뒤에 붙인다
  const full = [...order, ...DEFAULT_HOME_ORDER.filter((d) => !order.includes(d))];
  const hidden = Array.isArray(layout?.hidden) ? layout.hidden.filter(isHomeDomain) : [];
  return { order: full, hidden };
};

/** identity 셸 설정 읽기 — 카드 원천과 같은 예산. 못 받으면 null(기본 순서 · 숨김 0 — 지금까지의 홈) */
const readLayout = async (token: string): Promise<HomeLayoutVM | null> => {
  const { data } = await backendApi.proxyAuthRequest("GET", "/identity/shell", token, undefined, { timeout: HOME_CARD_TIMEOUT_MS });
  return toHomeLayout(data?.data?.layout);
};

/**
 * 셸 홈 — 도메인 요약 카드 (`BFF-REQ-046` FR-1~4, `FEATURE-015` FR-2).
 *
 * 전에는 coach · portfolio 블록을 직접 조립했다(`BFF-REQ-007` B절). 셸이 도메인을 모르게(`ADR-005` §2)
 * **도메인마다 카드 한 장**으로 바꿨다 — 계약 변경(`FE-REQ-055` 와 같은 PR). 도메인을 `allSettled` 로 병렬로
 * 부르고, 실패하거나 800ms 를 넘긴 카드만 `degraded` 다. 홈은 언제나 200 이다.
 *
 * 순서 · 숨김은 서버 identity 가 갖는다(FR-5, 서버 S3a 2026-11-06) — 저장 전이면 서버 기본값(고르지 않은 도메인 숨김 — FR-4).
 * 응답 `order` · `hidden` 은 카드가 있는 도메인만(팁 카드는 아직 없다).
 */
class AppHomeService {
  async getHome(token: string): Promise<AppHomeVM> {
    const now = new Date().toISOString();
    const sources = startSources(token, now);
    // 둘째 줄 원천 — 카드와 나란히(목표 목록 · 이번 달은 카드 미리보기와 같은 요청)
    const feed = Promise.all([
      settle(sources.month),
      settle(sources.goals),
      settle(loadDeposits(token, sources.goals)),
      settle(appPortfolioService.listTransactions(token, 1)),
    ]);
    feed.catch(() => undefined);
    // 배치(identity)와 카드를 나란히 — 배치가 실패해도 카드는 기본 순서로 나온다(배치는 카드 하나의 실패가 아니다)
    const [layoutResult, ...settled] = await Promise.allSettled([
      withinBudget(readLayout(token), HOME_CARD_TIMEOUT_MS),
      ...CARD_SOURCES.map((source) => withinBudget(source.load(token, now, sources), HOME_CARD_TIMEOUT_MS)),
    ]);
    if (layoutResult.status === "rejected" && isUnauthenticated(layoutResult.reason)) throw layoutResult.reason;

    const unauthenticated = settled.find(
      (result): result is PromiseRejectedResult => result.status === "rejected" && isUnauthenticated(result.reason),
    );
    if (unauthenticated) throw unauthenticated.reason;

    const cards = settled.map((result, index) => {
      const source = CARD_SOURCES[index];
      if (result.status === "fulfilled") return result.value;
      logger.warn("홈 카드를 받지 못했다", { domain: source.domain, reason: result.reason?.message });
      return degradedCard(source.domain, source.title, source.href, now);
    });

    if (layoutResult.status === "rejected") logger.warn("홈 배치를 받지 못했다 — 기본 순서", { reason: layoutResult.reason?.message });
    const layout = layoutResult.status === "fulfilled" ? layoutResult.value : null;
    const has = (domain: HomeDomain) => cards.some((card) => card.domain === domain);
    const order = (layout?.order ?? DEFAULT_HOME_ORDER).filter(has);
    const hidden = (layout?.hidden ?? []).filter(has);

    // 둘째 줄 — 숨긴 도메인은 넣지 않는다. 원천을 하나도 못 받았으면 null(빈 배열 = 정말 없음)
    const [month, goals, deposits, trades] = await feed;
    const hiddenSet = new Set(hidden);
    const today = kstDate(now) ?? now.slice(0, 10);
    const recent =
      month === null && deposits === null && trades === null
        ? null
        : toRecentFeed(month?.expenses ?? null, deposits, trades?.items ?? null, hiddenSet);
    const upcoming = month === null && goals === null ? null : toUpcomingFeed(month?.recurring?.items ?? null, goals, today, hiddenSet);
    return { cards, order, hidden, recent, upcoming };
  }

  /**
   * 홈 배치 저장(FR-5). 화면은 **보이는 카드의 순서**만 안다(`GET /home` 의 `order` 가 카드 있는 도메인만이라) —
   * 서버는 카드 넷 전부의 순서를 받는다. 화면이 모르는 칸(카드가 아직 없는 팁)을 기본 순서로 뒤에 붙여 보낸다.
   * 그 밖의 값 검사(모르는 키 · 중복 · 전부 숨김)는 서버 — 배열이 아니면 그대로 넘겨 서버가 400 을 낸다
   */
  async arrangeHome(token: string, order: unknown, hidden: unknown): Promise<HomeLayoutVM> {
    const full = Array.isArray(order) ? [...order, ...DEFAULT_HOME_ORDER.filter((d) => !order.includes(d))] : order;
    const { data } = await backendApi.proxyAuthRequest("PUT", "/identity/shell/layout", token, { order: full, hidden });
    return toHomeLayout(data?.data?.layout) ?? { order: [...DEFAULT_HOME_ORDER], hidden: [] };
  }
}

export const appHomeService = new AppHomeService();
