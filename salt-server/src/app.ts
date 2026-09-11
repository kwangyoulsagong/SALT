import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./shared/presentation/errorMiddleware";
import { healthRouter } from "./shared/presentation/healthRouter";
import { loggerMiddleware } from "./shared/presentation/loggerMiddleware";
import { setupSwagger } from "./shared/config/swagger";
import { NotFoundError } from "./shared/presentation/httpErrors";
import { InvestmentInsightWorker } from "./workers/investment-insight.worker";
import { NotificationCleanupWorker } from "./workers/notification-cleanup.worker";
import { startMarketWorkers } from "./workers/market.worker";

// 이관된 컨텍스트의 라우터는 조립 지점에서 온다 (`composition.ts`)
import { contextRouters } from "./composition";

// Routes (이관 전 모듈)
import authRoutes from "./modules/auth/auth.routes";
import goalsRoutes from "./modules/goals/goals.routes";
import missionRoutes from "./modules/mission/mission.routes";
import userRoutes from "./modules/user/user.routes";
import investmentInsightRoutes from "./modules/investment-insight/investment-insight.routes";
import investmentNotificationRoutes from "./modules/investment-notification/investment-notification.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import investmentFeedRoutes from "./modules/feed/feed.routes";
import aiInvestmentCoachRoutes from "./modules/investment-insight/ai-coach/ai-coach.routes";
import tradePreflightRoutes from "./modules/trade-preflight/trade-preflight.routes";
import behaviorCoachRoutes from "./modules/behavior-coach/behavior-coach.routes";
import profitPlanRoutes from "./modules/profit-plan/profit-plan.routes";
import signalPerformanceRoutes from "./modules/signal-performance/signal-performance.routes";

const app: Application = express();

// `market` 의 주기 작업 넷을 등록한다. 스케줄과 락은 워커가, 절차는 유스케이스가 갖는다
// (`server-architecture.md` §7).
startMarketWorkers();

const insightsWorker = new InvestmentInsightWorker();
insightsWorker.start();

const notificationCleanupWorker = new NotificationCleanupWorker();
notificationCleanupWorker.start();

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

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/investment", contextRouters.investment);
app.use("/api/missions", missionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/portfolio", contextRouters.portfolio);
app.use("/api/news", contextRouters.news);
app.use("/api/market-intelligence", contextRouters.marketIntelligence);
app.use("/api/investment-insight", investmentInsightRoutes);
app.use("/api/investment-notifications", investmentNotificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/feed", investmentFeedRoutes);
app.use("/api/ai-coach", aiInvestmentCoachRoutes);
app.use("/api/trade-preflight", tradePreflightRoutes);
app.use("/api/behavior-coach", behaviorCoachRoutes);
app.use("/api/profit-plan", profitPlanRoutes);
app.use("/api/signal-performance", signalPerformanceRoutes);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
