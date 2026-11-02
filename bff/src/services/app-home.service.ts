import { logger } from "../config/logger";
import { appAICoachService } from "./app-ai-coach.service";
import { appPortfolioService } from "./app-portfolio.service";
import { backendApi } from "./backend-api.service";
import {
  DEFAULT_HOME_ORDER,
  HOME_CARD_TEXT,
  HOME_CARD_TIMEOUT_MS,
  degradedCard,
  toInvestCard,
  toSavingsCard,
  type AppHomeVM,
  type HomeDomain,
  type HomeSummaryCard,
  type ServerGoalStatistics,
} from "./home-card.viewmodel";

export type { AppHomeVM, HomeSummaryCard } from "./home-card.viewmodel";

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

interface CardSource {
  domain: HomeDomain;
  title: string;
  href: string;
  load: (token: string, now: string) => Promise<HomeSummaryCard>;
}

/**
 * 카드를 내는 도메인. **서비스가 없는 도메인(가계부 · 팁)은 카드를 내지 않는다** — 빈 카드나 `degraded` 로
 * "있는데 실패한 것"처럼 보이지 않게. 서버 서비스가 생기면(`SRV-REQ-046` · `047`) 여기 한 줄씩 붙는다.
 */
const CARD_SOURCES: CardSource[] = [
  {
    domain: "savings",
    title: HOME_CARD_TEXT.savings.title,
    href: "/goals/addgoals",
    load: async (token, now) => {
      const response = await backendApi.proxyAuthRequest("GET", "/goals/statistics", token, undefined, {
        timeout: HOME_CARD_TIMEOUT_MS,
      });
      return toSavingsCard((response.data?.data ?? {}) as ServerGoalStatistics, now);
    },
  },
  {
    domain: "invest",
    title: HOME_CARD_TEXT.invest.title,
    href: "/investments",
    load: async (token, now) => {
      // 셋을 같이 부른다. 보유 요약이 실패하면 카드가 degraded, 설정 · 통계가 실패하면 손익률만 뺀다
      const [summary, profile, stats] = await Promise.allSettled([
        appPortfolioService.getSummary(token),
        appAICoachService.getProfile(token),
        backendApi.proxyAuthRequest("GET", "/portfolio/stats", token, undefined, { timeout: HOME_CARD_TIMEOUT_MS }),
      ]);
      if (summary.status === "rejected") throw summary.reason;
      return toInvestCard(summary.value, now, visibleProfitRate(profile, stats));
    },
  },
];

/**
 * 셸 홈 — 도메인 요약 카드 (`BFF-REQ-046` FR-1~4, `FEATURE-015` FR-2).
 *
 * 전에는 coach · portfolio 블록을 직접 조립했다(`BFF-REQ-007` B절). 셸이 도메인을 모르게(`ADR-005` §2)
 * **도메인마다 카드 한 장**으로 바꿨다 — 계약 변경(`FE-REQ-055` 와 같은 PR). 도메인을 `allSettled` 로 병렬로
 * 부르고, 실패하거나 800ms 를 넘긴 카드만 `degraded` 다. 홈은 언제나 200 이다.
 *
 * 순서 · 숨김은 아직 저장하지 않는다(`PUT /api/app/home/layout` 은 서버 identity 뒤, FR-5) — 기본 순서 · 숨김 없음.
 */
class AppHomeService {
  async getHome(token: string): Promise<AppHomeVM> {
    const now = new Date().toISOString();
    const settled = await Promise.allSettled(
      CARD_SOURCES.map((source) => withinBudget(source.load(token, now), HOME_CARD_TIMEOUT_MS)),
    );

    const cards = settled.map((result, index) => {
      const source = CARD_SOURCES[index];
      if (result.status === "fulfilled") return result.value;
      logger.warn("홈 카드를 받지 못했다", { domain: source.domain, reason: result.reason?.message });
      return degradedCard(source.domain, source.title, source.href, now);
    });

    const order = DEFAULT_HOME_ORDER.filter((domain) => cards.some((card) => card.domain === domain));
    return { cards, order, hidden: [] };
  }
}

export const appHomeService = new AppHomeService();
