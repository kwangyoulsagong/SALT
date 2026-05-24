import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware";
import { logger } from "../config/logger";

// Routes
import healthRoutes from "./routes/health.routes";
import proxyRoutes from "./routes/proxy.routes";
import appRoutes from "./routes/app.routes";
import portfolioRoutes from "./routes/portfolio.routes";
import feedRoutes from "./routes/feed.routes";
import alertsRoutes from "./routes/alerts.routes";
import marketRoutes from "./routes/market.routes";
import playbookRoutes from "./routes/playbook.routes";

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
app.use("/api/app/feed", feedRoutes);
app.use("/api/app/alerts", alertsRoutes);
app.use("/api/app/market", marketRoutes);
app.use("/api/app/playbooks", playbookRoutes);

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
