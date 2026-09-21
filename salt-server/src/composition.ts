import { createAuthApplication } from "./auth/application/api";
import { BcryptPasswordHasher } from "./auth/infrastructure/BcryptPasswordHasher";
import { JwtTokenIssuer } from "./auth/infrastructure/JwtTokenIssuer";
import { PrismaAccountStore } from "./auth/infrastructure/PrismaAccountStore";
import { PrismaInviteAttemptLog } from "./auth/infrastructure/PrismaInviteAttemptLog";
import { PrismaInviteCodeStore } from "./auth/infrastructure/PrismaInviteCodeStore";
import { PrismaUserCountProbe } from "./auth/infrastructure/PrismaUserCountProbe";
import { createAuthRouter } from "./auth/presentation/auth.routes";
import { createCoachApplication } from "./coach/application/api";
import { ArticleTextAdapter } from "./coach/infrastructure/ArticleTextAdapter";
import { GeminiCoachExplainer } from "./coach/infrastructure/GeminiCoachExplainer";
import { HoldingTradeAdapter } from "./coach/infrastructure/HoldingTradeAdapter";
import { MarketSignalAdapter } from "./coach/infrastructure/MarketSignalAdapter";
import { PrismaCoachInsightStore } from "./coach/infrastructure/PrismaCoachInsightStore";
import { PrismaCoachNotifier } from "./coach/infrastructure/PrismaCoachNotifier";
import { PrismaCoachProfileStore } from "./coach/infrastructure/PrismaCoachProfileStore";
import { PrismaSymbolJudgmentStore } from "./coach/infrastructure/PrismaSymbolJudgmentStore";
import { TrackedAssetAdapter } from "./coach/infrastructure/TrackedAssetAdapter";
import { createAICoachRouter } from "./coach/presentation/aiCoach.routes";
import {
  createBehaviorCoachRouter,
  createProfitPlanRouter,
  createSignalPerformanceRouter,
  createTradePreflightRouter,
} from "./coach/presentation/coachTools.routes";
import { createMarketApplication } from "./market/application/api";
import { FearGreedClient } from "./market/infrastructure/FearGreedClient";
import { PrismaIndicatorRepository } from "./market/infrastructure/PrismaIndicatorRepository";
import { PrismaMarketAssetRepository } from "./market/infrastructure/PrismaMarketAssetRepository";
import { PrismaPriceHistoryRepository } from "./market/infrastructure/PrismaPriceHistoryRepository";
import { PrismaSentimentRepository } from "./market/infrastructure/PrismaSentimentRepository";
import { PrismaWatchlistRepository } from "./market/infrastructure/PrismaWatchlistRepository";
import { PrismaWhaleTransactionRepository } from "./market/infrastructure/PrismaWhaleTransactionRepository";
import { SymbolNewsAdapter } from "./market/infrastructure/SymbolNewsAdapter";
import { UpbitClient } from "./market/infrastructure/UpbitClient";
import { createNewsApplication } from "./news/application/api";
import { createOnboardingApplication } from "./onboarding/application/api";
import { createOnboardingRouter } from "./onboarding/presentation/onboarding.routes";
import { createPortfolioApplication } from "./portfolio/application/api";
import { PriceHistoryAdapter } from "./portfolio/infrastructure/PriceHistoryAdapter";
import { PrismaHoldingRepository } from "./portfolio/infrastructure/PrismaHoldingRepository";
import { PrismaTransactionRepository } from "./portfolio/infrastructure/PrismaTransactionRepository";
import { PrismaArticleRepository } from "./news/infrastructure/PrismaArticleRepository";
import { PrismaBookmarkRepository } from "./news/infrastructure/PrismaBookmarkRepository";
import { RssNewsFeed } from "./news/infrastructure/RssNewsFeed";
import { createNewsRouter } from "./news/presentation/news.routes";
import { createInvestmentRouter } from "./market/presentation/investment.routes";
import { createMarketIntelligenceRouter } from "./market/presentation/marketIntelligence.routes";
import { createPortfolioRouter } from "./portfolio/presentation/portfolio.routes";
import { env } from "./shared/config/env";
import prisma from "./shared/infrastructure/prisma";

/**
 * 조립 지점 — **구현을 아는 유일한 자리**다.
 *
 * ## 왜 진입점인가 (Open Question 7-6 의 답)
 *
 * 레이어 규칙이 자리를 정한다. `application` 은 `infrastructure` 를 import 할 수 없고
 * (의존 역전), `presentation` 도 마찬가지다. 컨텍스트 안 어디에도 "Prisma 리포지토리를
 * 골라 유스케이스에 꽂는" 코드를 둘 자리가 없다 — 그게 의도다.
 *
 * 그래서 그 코드는 **레이어 밖**, 즉 `src/` 최상위 진입 파일에 있다. 훅은 최상위
 * 파일(`area: "entry"`)에 규칙을 걸지 않고, 그 예외가 성립하는 이유가 이것이다.
 *
 * DI 컨테이너를 쓰지 않는다. 여기 있는 것은 생성자 호출뿐이고, **무엇이 무엇에
 * 꽂혔는지 읽어서 알 수 있는 것**이 리플렉션보다 중요하다.
 *
 * > 컨텍스트가 늘면 이 파일이 길어진다. 그때 나누는 기준은 **컨텍스트**이고,
 * > `src/composition/` 디렉터리를 만들지 않는다 — 레지스트리에 없는 컨텍스트로
 * > 잡혀 훅이 막는다. `src/composition.<context>.ts` 로 나눈다.
 */

/**
 * `auth` 는 아무도 읽지 않는다 — 공개 API 가 없고 다른 컨텍스트를 받지도 않는다.
 * 그래서 조립 순서의 맨 앞이다.
 *
 * 상한은 **여기서 주입한다**. 유스케이스가 `env` 를 읽으면 그 값이 테스트에서
 * 바뀌지 않는다 (FR-6).
 */
const auth = createAuthApplication({
  invites: new PrismaInviteCodeStore(),
  accounts: new PrismaAccountStore(),
  userCount: new PrismaUserCountProbe(),
  hasher: new BcryptPasswordHasher(),
  tokens: new JwtTokenIssuer(),
  attempts: new PrismaInviteAttemptLog(),
  maxAccounts: env.INVITE_MAX_ACCOUNTS,
});

const news = createNewsApplication({
  articles: new PrismaArticleRepository(),
  bookmarks: new PrismaBookmarkRepository(),
  feed: new RssNewsFeed(),
});

/**
 * `market` 은 `news` 의 공개 API 를 받는다 — **조립 순서가 의존 방향을 드러낸다.**
 * 받는 것은 `NewsApi` 하나이고, `market/infrastructure` 의 ACL 이 그것을 우리 Port 로
 * 번역한다 (`SymbolNewsAdapter`).
 */
const market = createMarketApplication({
  assets: new PrismaMarketAssetRepository(),
  watchlist: new PrismaWatchlistRepository(),
  sentiments: new PrismaSentimentRepository(),
  whales: new PrismaWhaleTransactionRepository(),
  prices: new PrismaPriceHistoryRepository(),
  indicators: new PrismaIndicatorRepository(),
  exchange: new UpbitClient(),
  fearGreed: new FearGreedClient(),
  news: new SymbolNewsAdapter(news.api),
});

/**
 * `portfolio` 는 `market` 의 종가를 받는다. 성과 차트가 그것을 쓴다 —
 * 원문에서는 `prisma.priceHistory` 를 직접 뒤졌다.
 */
const portfolio = createPortfolioApplication({
  transactions: new PrismaTransactionRepository(),
  holdings: new PrismaHoldingRepository(),
  prices: new PriceHistoryAdapter(market.api),
});

/**
 * `coach` 는 **세 컨텍스트를 전부 읽는다** — 그래서 조립 순서의 마지막이다.
 *
 * 받는 것은 `NewsApi` · `MarketApi` · `PortfolioApi` 세 공개 API 뿐이고, 셋 다
 * `infrastructure` 의 ACL 이 코치의 Port 로 번역한다. 원문의 코치는 이 셋의
 * 테이블 여섯 개를 `prisma` 로 직접 뒤졌다 (`SRV-REQ-006` FR-32).
 */
const coach = createCoachApplication({
  profiles: new PrismaCoachProfileStore(),
  insights: new PrismaCoachInsightStore(),
  notifier: new PrismaCoachNotifier(),
  explainer: new GeminiCoachExplainer(),
  market: new MarketSignalAdapter(market.api),
  portfolio: new HoldingTradeAdapter(portfolio.api),
  news: new ArticleTextAdapter(news.api),
  judgments: new PrismaSymbolJudgmentStore(),
  tracked: new TrackedAssetAdapter(market.api, portfolio.api),
});

/**
 * `onboarding` 은 **조합 컨텍스트**다. Aggregate 가 없고 남의 사실을 읽기만 한다.
 *
 * 두 프로브가 이 슬라이스의 임시 배선이다:
 *
 * | 스텝 | REQ 가 말한 소스 | 지금 꽂는 것 | 언제 바뀌나 |
 * |---|---|---|---|
 * | `link_account` | `ledger` 거래 존재 | `portfolio` 공개 API 의 거래 건수 | F001 `ledger` |
 * | `set_plan` | `plan` 설정 존재 | `goal` 행 존재 | F003 `plan` |
 *
 * `goal` 이 아직 컨텍스트가 아니라 여기서 Prisma 를 직접 센다. **조립 지점은 구현을 아는
 * 유일한 자리**이므로 규칙 위반이 아니고(`server-architecture.md` §5), 오히려 이 한 줄이
 * "아직 주인이 없는 사실"이라는 것을 눈에 띄게 만든다. `goal` 이 서면 이 줄이 공개 API
 * 호출로 바뀐다.
 */
const onboarding = createOnboardingApplication({
  ledgerLinked: async (userId) =>
    (await portfolio.api.countTransactions(userId)) > 0,
  planConfigured: async (userId) =>
    (await prisma.goal.count({ where: { userId } })) > 0,
});

/** 다른 컨텍스트와 워커가 부르는 공개 API 모음. */
export const contextApis = {
  news: news.api,
  market: market.api,
  portfolio: portfolio.api,
};

/** 컨텍스트가 자기 유스케이스를 직접 돌려야 하는 곳(워커·관리 작업)이 쓴다. */
export const contextUseCases = {
  auth: auth.useCases,
  news: news.useCases,
  market: market.useCases,
  portfolio: portfolio.useCases,
  coach: coach.useCases,
};

/** `app.ts` 가 등록하는 라우터. 경로는 `app.ts` 가 정한다. */
export const contextRouters = {
  auth: createAuthRouter(auth.useCases),
  onboarding: createOnboardingRouter(onboarding.useCases),
  news: createNewsRouter(news.useCases),
  investment: createInvestmentRouter(market.useCases),
  marketIntelligence: createMarketIntelligenceRouter(market.useCases),
  portfolio: createPortfolioRouter(portfolio.useCases),
  aiCoach: createAICoachRouter(coach.useCases),
  behaviorCoach: createBehaviorCoachRouter(coach.useCases),
  profitPlan: createProfitPlanRouter(coach.useCases),
  tradePreflight: createTradePreflightRouter(coach.useCases),
  signalPerformance: createSignalPerformanceRouter(coach.useCases),
};
