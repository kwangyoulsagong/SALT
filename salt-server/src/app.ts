import express, { Application, Request, Response, NextFunction } from "express";
import cron from "node-cron";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { setupSwagger } from "./config/swagger";
import { NotFoundError } from "./utils/error.util";
import { MarketSyncWorker } from "./workers/market-sync.worker";
import { marketPriceUpdater } from "./workers/market-price-updater.worker";
import { InvestmentInsightWorker } from "./workers/investment-insight.worker";
import { PlaybookEngineWorker } from "./workers/playbook-engine.worker";

// Routes
import authRoutes from "./modules/auth/auth.routes";
import goalsRoutes from "./modules/goals/goals.routes";
import investmentRoutes from "./modules/investment/investment.routes";
import missionRoutes from "./modules/mission/mission.routes";
import userRoutes from "./modules/user/user.routes";
import portfolioRoutes from "./modules/portfolio/portfolio.routes";
import newsRoutes from "./modules/news/news.routes";
import marketIntelligenceRoutes from "./modules/market-intelligence/market-intelligence.routes";
import investmentInsightRoutes from "./modules/investment-insight/investment-insight.routes";
import investmentNotificationRoutes from "./modules/investment-notification/investment-notification.routes";

const app: Application = express();
const marketWorker = new MarketSyncWorker();
marketWorker.sync();
cron.schedule("0 */6 * * *", () => {
  marketWorker.sync();
  console.log("⏱️ Market Sync executed");
});
marketPriceUpdater.start();

const insightsWorker = new InvestmentInsightWorker();
insightsWorker.start();

const playbookEngineWorker = new PlaybookEngineWorker();
playbookEngineWorker.start();

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

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "salt-backend",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/investment", investmentRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/market-intelligence", marketIntelligenceRoutes);
app.use("/api/investment-insight", investmentInsightRoutes);
app.use("/api/investment-notifications", investmentNotificationRoutes);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Error handler (must be last)
app.use(errorMiddleware);

export default app;
