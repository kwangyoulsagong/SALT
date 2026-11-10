import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./shared/presentation/errorMiddleware";
import { healthRouter } from "./shared/presentation/healthRouter";
import { loggerMiddleware } from "./shared/presentation/loggerMiddleware";
import { setupSwagger } from "./shared/config/swagger";
import { NotFoundError } from "./shared/presentation/httpErrors";
import { DORMANT_PATHS, goneMiddleware } from "./shared/presentation/goneMiddleware";
import { InvestmentInsightWorker } from "./workers/investment-insight.worker";
import { startMarketWorkers } from "./workers/market.worker";
import { startKrStockWorkers } from "./workers/kr-stock.worker";
import { ForecastRunnerWorker } from "./workers/forecast-runner.worker";

// 이관된 컨텍스트의 라우터는 조립 지점에서 온다 (`composition.ts`)
import { contextRouters, contextUseCases } from "./composition";
import { runGuarded } from "./shared/infrastructure/scheduler";
import { onWake, startWakeWatch } from "./shared/infrastructure/wake";

// Routes (이관 전 모듈)
import userRoutes from "./modules/user/user.routes";
import investmentInsightRoutes from "./modules/investment-insight/investment-insight.routes";

const app: Application = express();

/**
 * 주기 작업 등록 — **HTTP 가 열린 뒤 `server.ts` 가 부른다**. 예전엔 이 파일을 import 하는 순간(DB 연결 · listen 전) 부팅 회차가 한꺼번에
 * 돌아 첫 요청들이 줄을 섰다(재기동 직후 판단 상세 504, 2026-11-09 `DB-REQ-017`). 스케줄과 락은 워커가, 절차는 유스케이스가 갖는다
 * (`server-architecture.md` §7)
 */
export const startWorkers = () => {
  // `market` 의 주기 작업 넷
  startMarketWorkers();
  // 국내 주식(F011) — 키가 없으면 등록하지 않는다
  startKrStockWorkers();
  // 깸 따라잡기(SRV-REQ-057 FR-6) — 지표는 맨 뒤 한 번(코인 · 국내 봉이 다 들어온 뒤). 구독 순서 = 실행 순서
  onWake("technical-indicators", () =>
    runGuarded("technical-indicators", () => contextUseCases.market.refreshTechnicalIndicators.execute())
  );
  startWakeWatch();

  const insightsWorker = new InvestmentInsightWorker();
  insightsWorker.start();

  // F008 전망 배치 — 부팅 · 매시 트리거만(판단은 배치가 한다). 개발 환경 기본 켬
  const forecastRunner = new ForecastRunnerWorker();
  forecastRunner.start();
  process.once("SIGTERM", () => forecastRunner.stop());
  process.once("SIGINT", () => forecastRunner.stop());
};

// Security
app.use(helmet());
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(loggerMiddleware);

// Swagger Documentation
setupSwagger(app);

// Health check — 서버 자신의 상태만 답한다 (`ddd-shared.md` §5)
app.use(healthRouter);

// 동면 경로 — 404 가 아니라 410 (`SRV-REQ-009` FR-7 · 8). 살아 있는 라우터 안의 경로
// (`/api/users/points` 등)를 가리려면 라우터보다 먼저 와야 한다
app.use([...DORMANT_PATHS], goneMiddleware);

// API Routes
app.use("/api/auth", contextRouters.auth);
app.use("/api/investment", contextRouters.investment);
app.use("/api/users", userRoutes);
app.use("/api/portfolio", contextRouters.portfolio);
app.use("/api/news", contextRouters.news);
app.use("/api/market-intelligence", contextRouters.marketIntelligence);
app.use("/api/market/kr", contextRouters.krStock);
app.use("/api/investment-insight", investmentInsightRoutes);
app.use("/api/ai-coach", contextRouters.aiCoach);
app.use("/api/trade-preflight", contextRouters.tradePreflight);
app.use("/api/behavior-coach", contextRouters.behaviorCoach);
app.use("/api/profit-plan", contextRouters.profitPlan);
app.use("/api/signal-performance", contextRouters.signalPerformance);
app.use("/api/coach", contextRouters.coachReport);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
