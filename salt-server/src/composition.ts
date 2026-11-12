import { createAuthApplication } from "./auth/application/api";
import { BcryptPasswordHasher } from "./auth/infrastructure/BcryptPasswordHasher";
import { JwtTokenIssuer } from "./auth/infrastructure/JwtTokenIssuer";
import { PrismaAccountStore } from "./auth/infrastructure/PrismaAccountStore";
import { PrismaInviteAttemptLog } from "./auth/infrastructure/PrismaInviteAttemptLog";
import { PrismaInviteCodeStore } from "./auth/infrastructure/PrismaInviteCodeStore";
import { PrismaUserCountProbe } from "./auth/infrastructure/PrismaUserCountProbe";
import { createAuthRouter } from "./auth/presentation/auth.routes";
import { BACKTEST_DISPLAY_ORIGINS, DEFAULT_ROUND_TRIP_COSTS, type RoundTripCosts } from "./coach/domain";
import { createCoachApplication } from "./coach/application/api";
import { ArticleTextAdapter } from "./coach/infrastructure/ArticleTextAdapter";
import { GeminiCoachExplainer } from "./coach/infrastructure/GeminiCoachExplainer";
import { detectLocalCli, LocalCliCoachExplainer } from "./coach/infrastructure/LocalCliCoachExplainer";
import { RoutingCoachExplainer } from "./coach/infrastructure/RoutingCoachExplainer";
import { LlmMoveSummaryWriter } from "./coach/infrastructure/LlmMoveSummaryWriter";
import { LocalCliGate } from "./coach/infrastructure/localCliGate";
import { MoveCardAdapter } from "./coach/infrastructure/MoveCardAdapter";
import { PrismaMoveSummaryStore } from "./coach/infrastructure/PrismaMoveSummaryStore";
import { HoldingTradeAdapter } from "./coach/infrastructure/HoldingTradeAdapter";
import { MarketSignalAdapter } from "./coach/infrastructure/MarketSignalAdapter";
import { PrismaCoachGenerationLogStore } from "./coach/infrastructure/PrismaCoachGenerationLogStore";
import { PrismaLlmUsageStore } from "./coach/infrastructure/PrismaLlmUsageStore";
import { PrismaCoachInsightStore } from "./coach/infrastructure/PrismaCoachInsightStore";
import { OutboxDecisionChangeNotifier } from "./coach/infrastructure/OutboxDecisionChangeNotifier";
import { PrismaCoachProfileStore } from "./coach/infrastructure/PrismaCoachProfileStore";
import { PrismaBaseRateReader, PrismaTradeCheckLedger } from "./coach/infrastructure/PrismaBaseRateReader";
import { PrismaJudgmentTierReader } from "./coach/infrastructure/PrismaJudgmentTierReader";
import { PrismaShortHorizonReader } from "./coach/infrastructure/PrismaShortHorizonReader";
import { PrismaExplanationSnapshotStore } from "./coach/infrastructure/PrismaExplanationSnapshotStore";
import { PrismaForecastReader } from "./coach/infrastructure/PrismaForecastReader";
import { PrismaGaugeTrackStore } from "./coach/infrastructure/PrismaGaugeTrackStore";
import { PrismaJudgmentLedgerStore } from "./coach/infrastructure/PrismaJudgmentLedgerStore";
import { BACKTEST_STATS_TTL_MS, PrismaSymbolJudgmentStore } from "./coach/infrastructure/PrismaSymbolJudgmentStore";
import { PrismaRecommendationSnapshotStore } from "./coach/infrastructure/PrismaRecommendationSnapshotStore";
import { PrismaTradePlanStore } from "./coach/infrastructure/PrismaTradePlanStore";
import { PrismaDecisionOutcomeStore } from "./coach/infrastructure/PrismaDecisionOutcomeStore";
import { PrismaMonthlyReviewStore } from "./coach/infrastructure/PrismaMonthlyReviewStore";
import { TrackedAssetAdapter } from "./coach/infrastructure/TrackedAssetAdapter";
import { createAICoachRouter } from "./coach/presentation/aiCoach.routes";
import { createCoachReportRouter } from "./coach/presentation/coachReport.routes";
import {
  createBehaviorCoachRouter,
  createProfitPlanRouter,
  createSignalPerformanceRouter,
  createTradePreflightRouter,
} from "./coach/presentation/coachTools.routes";
import { createMarketApplication } from "./market/application/api";
import { FearGreedClient } from "./market/infrastructure/FearGreedClient";
import { KisClient } from "./market/infrastructure/KisClient";
import { KisMasterFile } from "./market/infrastructure/KisMasterFile";
import { DartHomepageSource, LogoDevImageProbe } from "./market/infrastructure/KrLogoClients";
import { KisRealtimeClient } from "./market/infrastructure/KisRealtimeClient";
import { PrismaKrMarketCalendarStore, PrismaKrStockStore } from "./market/infrastructure/PrismaKrStockStore";
import { parseKrSummaryIndices } from "./market/domain";
import { PrismaKrSupplementStore } from "./market/infrastructure/PrismaKrSupplementStore";
import { PrismaKrMarketStatusStore } from "./market/infrastructure/PrismaKrMarketStatusStore";
import { PrismaKrMoveSourceStore } from "./market/infrastructure/PrismaKrMoveSourceStore";
import { PrismaCryptoWarningReader, PrismaMoveBetaReader } from "./market/infrastructure/PrismaForecastMoveReader";
import { PrismaPriceFillMarkStore } from "./market/infrastructure/PrismaPriceFillMarkStore";
import { PrismaUniverseSnapshotStore } from "./market/infrastructure/PrismaUniverseSnapshotStore";
import { PrismaMarketScheduleReader } from "./market/infrastructure/PrismaMarketScheduleReader";
import { PrismaIndicatorRepository } from "./market/infrastructure/PrismaIndicatorRepository";
import { PrismaMarketAssetRepository } from "./market/infrastructure/PrismaMarketAssetRepository";
import { PrismaPriceHistoryRepository } from "./market/infrastructure/PrismaPriceHistoryRepository";
import { PrismaSentimentRepository } from "./market/infrastructure/PrismaSentimentRepository";
import { PrismaWatchlistRepository } from "./market/infrastructure/PrismaWatchlistRepository";
import { HeldAssetsAdapter } from "./market/infrastructure/HeldAssetsAdapter";
import { PrismaWhaleTransactionRepository } from "./market/infrastructure/PrismaWhaleTransactionRepository";
import { SymbolNewsAdapter } from "./market/infrastructure/SymbolNewsAdapter";
import { PrismaNewsTagReader } from "./market/infrastructure/PrismaNewsTagReader";
import { ArticleBodyAdapter } from "./market/infrastructure/ArticleBodyAdapter";
import { UpbitClient } from "./market/infrastructure/UpbitClient";
import { createNewsApplication } from "./news/application/api";
import { createPortfolioApplication } from "./portfolio/application/api";
import { KrStockQuoteAdapter } from "./portfolio/infrastructure/KrStockQuoteAdapter";
import { PriceHistoryAdapter } from "./portfolio/infrastructure/PriceHistoryAdapter";
import { PrismaHoldingRepository } from "./portfolio/infrastructure/PrismaHoldingRepository";
import { PrismaTransactionRepository } from "./portfolio/infrastructure/PrismaTransactionRepository";
import { ArticlePageFetcher } from "./news/infrastructure/ArticlePageFetcher";
import { NaverNewsSearch } from "./news/infrastructure/NaverNewsSearch";
import { PrismaArticleBodyStore } from "./news/infrastructure/PrismaArticleBodyStore";
import { PrismaArticleRepository } from "./news/infrastructure/PrismaArticleRepository";
import { PrismaBookmarkRepository } from "./news/infrastructure/PrismaBookmarkRepository";
import { RssNewsFeed } from "./news/infrastructure/RssNewsFeed";
import { createNewsRouter } from "./news/presentation/news.routes";
import { createInvestmentRouter } from "./market/presentation/investment.routes";
import { createMarketIntelligenceRouter } from "./market/presentation/marketIntelligence.routes";
import { createKrStockRouter } from "./market/presentation/krStock.routes";
import { createPortfolioRouter } from "./portfolio/presentation/portfolio.routes";
import { env } from "./shared/config/env";
import { logger } from "./shared/config/logger";

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
const jwtTokens = new JwtTokenIssuer();
const auth = createAuthApplication({
  invites: new PrismaInviteCodeStore(),
  accounts: new PrismaAccountStore(),
  userCount: new PrismaUserCountProbe(),
  hasher: new BcryptPasswordHasher(),
  tokens: jwtTokens,
  guestTokens: jwtTokens,
  publicMarketGuest: env.PUBLIC_MARKET_GUEST,
  attempts: new PrismaInviteAttemptLog(),
  maxAccounts: env.INVITE_MAX_ACCOUNTS,
});

const news = createNewsApplication({
  articles: new PrismaArticleRepository(),
  bookmarks: new PrismaBookmarkRepository(),
  feed: new RssNewsFeed(),
  body: {
    search: new NaverNewsSearch({ id: env.NAVER_CLIENT_ID, secret: env.NAVER_CLIENT_SECRET }),
    pages: new ArticlePageFetcher(),
    bodies: new PrismaArticleBodyStore(),
  },
});

/**
 * `market` 은 `news` 의 공개 API 를 받는다 — **조립 순서가 의존 방향을 드러낸다.**
 * 받는 것은 `NewsApi` 하나이고, `market/infrastructure` 의 ACL 이 그것을 우리 Port 로
 * 번역한다 (`SymbolNewsAdapter`).
 */
// 거래소 클라이언트는 한 벌 — 시세 조회와 체결 이력 수집이 같은 페이서(프로세스 한도)를 나눈다
const upbit = new UpbitClient();
/**
 * 국내 주식(F011) — 키가 없으면 통째로 꺼진다(FR-6). KIS 클라이언트도 한 벌: 한도(앱 키 단위)를
 * 페이서 하나가 지킨다
 */
const kis =
  env.KIS_APP_KEY && env.KIS_APP_SECRET
    ? new KisClient({ appKey: env.KIS_APP_KEY, appSecret: env.KIS_APP_SECRET, baseUrl: env.KIS_BASE_URL, requestsPerSecond: env.KIS_REQUESTS_PER_SECOND, maxInFlight: env.KIS_MAX_IN_FLIGHT })
    : null;
const krStock =
  kis
    ? {
        kis,
        health: kis,
        realtime: new KisRealtimeClient({
          url: env.KIS_WS_URL,
          approvalKey: (force) => kis.approvalKey(force),
          secrets: [env.KIS_APP_KEY, env.KIS_APP_SECRET],
        }),
        master: new KisMasterFile(),
        store: new PrismaKrStockStore(),
        calendar: new PrismaKrMarketCalendarStore(),
        /**
         * 보유는 `portfolio` 의 사실인데 `portfolio` 가 `market` 뒤에 조립된다(종가를 받는다). 그래서 **부를 때**
         * 공개 API 를 찾는다 — 부르는 것은 워커 회차라 조립이 끝난 뒤다. 순서를 뒤집으면 성과 차트가 끊긴다
         */
        held: { heldCodes: () => portfolio.api.heldSymbols("kr_stock") },
        universeTopN: env.KIS_UNIVERSE_TOP_N,
        logoDevToken: env.KR_LOGO_DEV_TOKEN,
        logoImages: new LogoDevImageProbe(),
        homepages: env.DART_API_KEY ? new DartHomepageSource(env.DART_API_KEY) : null,
        supplementSource: kis,
        supplement: new PrismaKrSupplementStore(),
        statusSource: kis,
        status: new PrismaKrMarketStatusStore(),
        moveSourceSource: kis,
        moveSources: new PrismaKrMoveSourceStore(),
        newsPromoPatterns: env.KR_NEWS_PROMO_PATTERNS ? [new RegExp(env.KR_NEWS_PROMO_PATTERNS, "i")] : [],
        articleBody: new ArticleBodyAdapter(news.api),
        // 요약 띠 지수도 수집한다 — 설정에서 빠뜨려도 대표 칸 선이 비지 않게(`SRV-REQ-042`)
        summaryIndices: parseKrSummaryIndices(
          [env.KIS_SUMMARY_INDICES, env.KR_SUMMARY_FEATURED, env.KR_SUMMARY_ITEMS].join(",")
        ),
        summaryPolicy: {
          featured: parseKrSummaryIndices(env.KR_SUMMARY_FEATURED)[0] ?? "0001",
          indexItems: parseKrSummaryIndices(env.KR_SUMMARY_ITEMS),
          wideMoveRate: env.KR_SUMMARY_WIDE_MOVE_RATE,
        },
      }
    : null;
const market = createMarketApplication({
  assets: new PrismaMarketAssetRepository(),
  watchlist: new PrismaWatchlistRepository(),
  sentiments: new PrismaSentimentRepository(),
  whales: new PrismaWhaleTransactionRepository(),
  prices: new PrismaPriceHistoryRepository(),
  indicators: new PrismaIndicatorRepository(),
  exchange: upbit,
  trades: upbit,
  fearGreed: new FearGreedClient(),
  news: new SymbolNewsAdapter(news.api),
  summaryPolicy: {
    symbols: env.MARKET_SUMMARY_SYMBOLS,
    wideMoveRate: env.MARKET_SUMMARY_WIDE_MOVE_RATE,
  },
  krStock,
  schedule: new PrismaMarketScheduleReader(),
  // 보유는 `portfolio` 공개 API 로 — `portfolio` 가 아래에서 조립되므로 부를 때 찾는다(`held` 와 같은 이유)
  tracking: { held: new HeldAssetsAdapter(() => portfolio.api), limit: env.TRACKED_ASSET_LIMIT },
  // 오늘 왜 움직였나(F016 단계 C) — 예측 배치 뷰 둘 · 카드 문턱(설정)
  // 수집 따라잡기 · 추적 목록 스냅샷(SRV-REQ-057) — 코인 보유도 `held` 와 같은 이유로 부를 때 찾는다
  collection: {
    fillMarks: new PrismaPriceFillMarkStore(),
    universeSnapshots: new PrismaUniverseSnapshotStore(),
    heldCryptoSymbols: () => portfolio.api.heldSymbols("crypto"),
  },
  // 소식 측정 태그(F017 단계 6) — 예측 뷰 셋
  newsTags: new PrismaNewsTagReader(),
  move: {
    betas: new PrismaMoveBetaReader(),
    warnings: new PrismaCryptoWarningReader(),
    policy: { k: env.MOVE_CARD_K, minRate: env.MOVE_CARD_MIN_RATE },
  },
});

/**
 * `portfolio` 는 `market` 의 종가를 받는다. 성과 차트가 그것을 쓴다 —
 * 원문에서는 `prisma.priceHistory` 를 직접 뒤졌다.
 */
const portfolio = createPortfolioApplication({
  transactions: new PrismaTransactionRepository(),
  holdings: new PrismaHoldingRepository(),
  prices: new PriceHistoryAdapter(market.api),
  krStock: new KrStockQuoteAdapter(market.api),
});

/**
 * `coach` 는 **세 컨텍스트를 전부 읽는다** — 그래서 조립 순서의 마지막이다.
 *
 * 받는 것은 `NewsApi` · `MarketApi` · `PortfolioApi` 세 공개 API 뿐이고, 셋 다
 * `infrastructure` 의 ACL 이 코치의 Port 로 번역한다. 원문의 코치는 이 셋의
 * 테이블 여섯 개를 `prisma` 로 직접 뒤졌다 (`SRV-REQ-006` FR-32).
 */
const llmUsage = new PrismaLlmUsageStore();
/**
 * 해설 다듬기 라우터(`SRV-REQ-050`) — 로컬 CLI 가 있으면 로컬, 아니면 Gemini. 부르는 곳은 해설 스냅샷 배치 하나(`SRV-REQ-053` FR-3) —
 * 로컬 CLI 자체는 오늘 등락 한 줄 배치도 쓴다(같은 게이트 · 같은 감지 결과). 감지는 부팅 때 한 번, 끝나면 꽂는다.
 * 기동 로그 한 줄: 버전 · 경로만(계정 · 토큰 0)
 */
/** 로컬 CLI 상태 하나 — 해설 라우터와 오늘 등락 한 줄 작성기가 같이 쓴다(연속 실패 · 쉬기 · 동시 상한, F016 단계 D) */
const localCliGate = new LocalCliGate();
const explainer = new RoutingCoachExplainer(null, new GeminiCoachExplainer(llmUsage), { gate: localCliGate });
/** 오늘 등락 한 줄(F016 단계 D) — 해설과 같은 로컬 CLI → Gemini. 감지 결과를 같이 꽂는다 */
const moveSummaryWriter = new LlmMoveSummaryWriter(llmUsage, { localModel: env.COACH_LLM_LOCAL_MODEL, gate: localCliGate });
if (env.COACH_EXPLAIN_LLM === "on") {
  void detectLocalCli(env.COACH_LLM_LOCAL)
    .then((found) => {
      if (!found) {
        logger.info(`해설 로컬 CLI 없음(${env.COACH_LLM_LOCAL}) — 전부 Gemini`);
        return;
      }
      explainer.useLocal(
        new LocalCliCoachExplainer(found.provider, found.bin, llmUsage, { model: env.COACH_LLM_LOCAL_MODEL })
      );
      moveSummaryWriter.useLocal({ provider: found.provider, bin: found.bin });
      logger.info(`해설 로컬 CLI ${found.provider} ${found.version} (${found.bin})`);
    })
    .catch((error: unknown) => logger.warn(`해설 로컬 CLI 감지 실패 — 전부 Gemini: ${(error as Error).message}`));
}
// 판단 채점 · 기저율 · 사이즈 비용 — 코인은 도메인 상수, 국내 주식은 수수료 설정값 + 매도일 거래세 표(F011 FR-44)
const roundTripCosts: RoundTripCosts = {
  ...DEFAULT_ROUND_TRIP_COSTS,
  krStockCommissionPerSide: env.KR_STOCK_COMMISSION_RATE_PER_SIDE,
};

const coach = createCoachApplication({
  profiles: new PrismaCoachProfileStore(),
  insights: new PrismaCoachInsightStore(),
  // 판단 변화 = 이벤트 `coach.DecisionChanged`(coach.outbox → 플랫폼 릴레이 → notification, `SRV-REQ-048` FR-5)
  notifier: new OutboxDecisionChangeNotifier(),
  explainer,
  // 해설 스냅샷 — 배치가 쓰고 화면 읽기가 읽는다(F017 v2 단계 3)
  explanations: new PrismaExplanationSnapshotStore(),
  llmUsage,
  // 기본 켜짐. `COACH_EXPLAIN_LLM=off` 면 배치가 해설을 만들지 않는다 — 화면은 사실표 문장(`SRV-REQ-037` FR-16 · `SRV-REQ-053` FR-3)
  llmEnabled: env.COACH_EXPLAIN_LLM === "on",
  // 비운 칸은 코드 기준(`DEFAULT_LLM_BUDGET`)
  llmLimits: {
    totalCalls: env.LLM_DAILY_CALL_LIMIT,
    totalTokens: env.LLM_DAILY_TOKEN_LIMIT,
  },
  market: new MarketSignalAdapter(market.api),
  portfolio: new HoldingTradeAdapter(portfolio.api),
  news: new ArticleTextAdapter(news.api),
  // 실측 성적은 live 만. 로컬 시드로 렌더 경로를 볼 때만 synthetic 을 더한다(운영에서는 env 가 막는다)
  judgments: new PrismaSymbolJudgmentStore(
    env.JUDGMENT_COUNT_SYNTHETIC ? ["live", "synthetic"] : ["live"],
    undefined,
    roundTripCosts
  ),
  // 판단 과거 검산(`backtest_full` · `backtest_price_only`) — 라이브 표본이 모자랄 동안 3종을 채운다(사전등록 kr-judgment-backtest@2 ·
  // signal-skill@1, ADR-010 v2). `backtest_seen`(규칙을 고를 때 본 기간)은 세지 않는다
  backtestJudgments: new PrismaSymbolJudgmentStore(BACKTEST_DISPLAY_ORIGINS, undefined, roundTripCosts, BACKTEST_STATS_TTL_MS),
  roundTripCosts,
  ledger: new PrismaJudgmentLedgerStore(),
  recommendations: new PrismaRecommendationSnapshotStore(
    env.JUDGMENT_COUNT_SYNTHETIC ? ["live", "synthetic"] : ["live"]
  ),
  tracked: new TrackedAssetAdapter(market.api, portfolio.api),
  // 오늘 등락 한 줄(③) — 재료는 market 카드(공개 API), 문장 · 스냅샷은 coach(`SRV-REQ-052`). `MOVE_SUMMARY=off` 면 배치 0 · 읽기 disabled
  moveSummary: {
    cards: new MoveCardAdapter(market.api),
    store: new PrismaMoveSummaryStore(),
    writer: moveSummaryWriter,
    names: async (symbols) => new Map((await market.api.assetLabels(symbols)).map((l) => [l.symbol, l.name])),
    // 해설 LLM 을 끄면 이것도 — LLM 두 길을 따로 켜 두는 경우가 없다
    enabled: env.MOVE_SUMMARY === "on" && env.COACH_EXPLAIN_LLM === "on",
  },
  gauges: new PrismaGaugeTrackStore(),
  generationLogs: new PrismaCoachGenerationLogStore(),
  regenerateCooldownSeconds: env.COACH_REGENERATE_COOLDOWN_SECONDS,
  forecasts: new PrismaForecastReader(),
  baseRates: new PrismaBaseRateReader(),
  judgmentTiers: new PrismaJudgmentTierReader(),
  shortHorizons: new PrismaShortHorizonReader(),
  tradeCheckLedger: new PrismaTradeCheckLedger(),
  tradePlans: new PrismaTradePlanStore(),
  decisionOutcomes: new PrismaDecisionOutcomeStore(),
  monthlyReviews: new PrismaMonthlyReviewStore(),
  forecastOwnerEmails: env.FORECAST_OWNER_EMAILS,
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
  news: createNewsRouter(news.useCases, env.FORECAST_OWNER_EMAILS),
  investment: createInvestmentRouter(market.useCases),
  marketIntelligence: createMarketIntelligenceRouter(market.useCases),
  krStock: createKrStockRouter(market.useCases.krStock, market.useCases.getKrMarketSchedule),
  portfolio: createPortfolioRouter(portfolio.useCases),
  aiCoach: createAICoachRouter(coach.useCases),
  behaviorCoach: createBehaviorCoachRouter(coach.useCases),
  profitPlan: createProfitPlanRouter(coach.useCases),
  tradePreflight: createTradePreflightRouter(coach.useCases),
  signalPerformance: createSignalPerformanceRouter(coach.useCases),
  coachReport: createCoachReportRouter(coach.useCases),
};
