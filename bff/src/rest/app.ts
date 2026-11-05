import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware";
import { DORMANT_PATHS, RETIRED_PATHS, goneMiddleware, retiredMiddleware } from "./middleware/gone.middleware";
import { logger } from "../config/logger";
import { loggableUrl } from "../utils/error.util";
import { runInTrace } from "../services/server-routing/trace";
import { cookieSessionMiddleware } from "./middleware/cookieSession.middleware";

// Routes
import healthRoutes from "./routes/health.routes";
import proxyRoutes from "./routes/proxy.routes";
import appRoutes from "./routes/app.routes";
import portfolioRoutes from "./routes/portfolio.routes";
import alertsRoutes from "./routes/alerts.routes";
import marketRoutes from "./routes/market.routes";
import watchlistRoutes from "./routes/watchlist.routes";
import searchRoutes from "./routes/search.routes";
import newsRoutes from "./routes/news.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import savingsRoutes from "./routes/savings.routes";
import householdRoutes from "./routes/household.routes";
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

// 추적 ID — 요청마다 하나(들어온 traceparent 가 있으면 잇는다). 서버 호출에 그대로 실린다(`BFF-REQ-045` FR-7)
app.use((req: Request, _res: Response, next: NextFunction) => runInTrace(req.header("traceparent"), next));

// 웹 세션 쿠키 → Authorization — 라우트 전에 한 번(`BFF-REQ-009` FR-54)
app.use(cookieSessionMiddleware());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    // 첫 인자는 문자열이어야 한다 — 객체를 주면 콘솔 형식이 `[object Object]` 로 찍는다(2026-10-28)
    // `originalUrl` — 끝난 시점의 `req.url` 은 라우터 기준 상대 경로라 `/api/app/*` 요청이 전부 `/` 로 찍혔다(2026-10-30 실측)
    logger.info(`${req.method} ${loggableUrl(req.originalUrl ?? req.url)} ${res.statusCode} ${duration}ms`);
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
app.use("/api/app/search", searchRoutes);
app.use("/api/app/news", newsRoutes);
app.use("/api/app/onboarding", onboardingRoutes);
app.use("/api/app/savings", savingsRoutes);
app.use("/api/app/household", householdRoutes);
app.use("/api/app/ai-coach", aiCoachRoutes);
app.use("/api/app/coach", coachRoutes);
app.use("/api/app/trade-preflight", tradePreflightRoutes);
app.use("/api/app/behavior-coach", behaviorCoachRoutes);
app.use("/api/app/profit-plan", profitPlanRoutes);
app.use("/api/app/signal-performance", signalPerformanceRoutes);

// 동면 경로 — 404 가 아니라 410 (`BFF-REQ-007` A절). `feed.routes` 는 파일만 남아 있다
app.use([...DORMANT_PATHS], goneMiddleware);
// 은퇴 경로 — 새 계약으로 대체됐다. 1주 410 + 1회 로그로 잔여 호출을 본 뒤 지운다(`BFF-REQ-047` FR-7)
app.use(Object.keys(RETIRED_PATHS), retiredMiddleware);

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
