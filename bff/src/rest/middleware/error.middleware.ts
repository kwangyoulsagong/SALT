import { Request, Response, NextFunction } from "express";
import { AppError, toUpstreamClientError } from "../../utils/error.util";
import { logger } from "../../config/logger";

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // 서버 4xx(429 포함)를 500 으로 바꾸지 않는다 — `Retry-After` 까지 그대로 (`BFF-REQ-025` FR-6)
  const upstream = toUpstreamClientError(err);
  if (upstream) {
    if (upstream.retryAfter) res.setHeader("Retry-After", upstream.retryAfter);
    return res.status(upstream.status).json({
      success: false,
      ...(upstream.code ? { code: upstream.code } : {}),
      message: upstream.message,
      ...(upstream.errors ? { errors: upstream.errors } : {}),
    });
  }

  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};
