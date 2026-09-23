import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware";
import { DORMANT_PATHS, goneMiddleware } from "./middleware/gone.middleware";
import { logger } from "../config/logger";

// Routes
import healthRoutes from "./routes/health.routes";
import proxyRoutes from "./routes/proxy.routes";
import appRoutes from "./routes/app.routes";
import portfolioRoutes from "./routes/portfolio.routes";
import alertsRoutes from "./routes/alerts.routes";
import marketRoutes from "./routes/market.routes";
import watchlistRoutes from "./routes/watchlist.routes";
import newsRoutes from "./routes/news.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import aiCoachRoutes from "./routes/ai-coach.routes";
import coachRoutes from "./routes/coach.routes";
import tradePreflightRoutes from "./routes/trade-preflight.routes";
import behaviorCoachRoutes from "./routes/behavior-coach.routes";
import profitPlanRoutes from "./routes/profit-plan.routes";
import signalPerformanceRoutes from "./routes/signal-performance.routes";

const app: Application = express();

// Security
app.use(helmet());
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Routes
app.use("/health", healthRoutes);
app.use("/api", proxyRoutes);
app.use("/api/app", appRoutes);
app.use("/api/app/portfolio", portfolioRoutes);
app.use("/api/app/alerts", alertsRoutes);
app.use("/api/app/market", marketRoutes);
app.use("/api/app/watchlist", watchlistRoutes);
app.use("/api/app/news", newsRoutes);
app.use("/api/app/onboarding", onboardingRoutes);
app.use("/api/app/ai-coach", aiCoachRoutes);
app.use("/api/app/coach", coachRoutes);
app.use("/api/app/trade-preflight", tradePreflightRoutes);
app.use("/api/app/behavior-coach", behaviorCoachRoutes);
app.use("/api/app/profit-plan", profitPlanRoutes);
app.use("/api/app/signal-performance", signalPerformanceRoutes);

// 동면 경로 — 404 가 아니라 410 (`BFF-REQ-007` A절). `feed.routes` 는 파일만 남아 있다
app.use([...DORMANT_PATHS], goneMiddleware);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Error handler
app.use(errorMiddleware);

export default app;
