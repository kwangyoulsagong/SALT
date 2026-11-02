import { Request, Response, NextFunction } from "express";
import { AppError, isUpstreamTimeout, loggableUrl, toUpstreamClientError } from "../../utils/error.util";
import { logger } from "../../config/logger";

/**
 * **요청이 틀린 것(4xx)은 BFF 오류가 아니다.** 전에는 서버가 돌려준 400 · 401 · 422 까지 `error` +
 * 스택으로 남겨 클라이언트 실수가 장애처럼 쌓였다(2026-10-28, 서버 `errorMiddleware` 와 같은 수정).
 * 4xx 는 `warn` 한 줄, 5xx 와 모르는 예외만 `error` + 스택이다.
 */
const logFailure = (
  status: number,
  code: string,
  err: Error,
  req: Request,
) => {
  if (status >= 500) {
    logger.error("Error:", {
      message: err.message,
      stack: err.stack,
      url: loggableUrl(req.originalUrl ?? req.url),
      method: req.method,
    });
    return;
  }
  // meta 에 `message` 키를 두면 winston 이 본문에 이어 붙인다 — 사유는 `reason` 으로
  logger.warn(`Request rejected ${status} ${code}`, {
    reason: err.message,
    url: loggableUrl(req.originalUrl ?? req.url),
    method: req.method,
  });
};

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    logFailure(err.statusCode, err.code ?? err.constructor.name, err, req);
    return res.status(err.statusCode).json({
      success: false,
      ...(err.code ? { code: err.code } : {}),
      message: err.message,
    });
  }

  // 서버 4xx(429 포함)를 500 으로 바꾸지 않는다 — `Retry-After` 까지 그대로 (`BFF-REQ-025` FR-6)
  const upstream = toUpstreamClientError(err);
  if (upstream) {
    logFailure(upstream.status, upstream.code ?? "UPSTREAM_4XX", err, req);
    if (upstream.retryAfter) res.setHeader("Retry-After", upstream.retryAfter);
    return res.status(upstream.status).json({
      success: false,
      ...(upstream.code ? { code: upstream.code } : {}),
      message: upstream.message,
      ...(upstream.errors ? { errors: upstream.errors } : {}),
      ...(upstream.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: upstream.retryAfterSeconds }
        : {}),
      // 추적 상한 409 — 화면 카운터 `n / 상한`(`BFF-REQ-007` FR-73)
      ...(upstream.trackedCount !== undefined ? { trackedCount: upstream.trackedCount } : {}),
      ...(upstream.trackedLimit !== undefined ? { trackedLimit: upstream.trackedLimit } : {}),
    });
  }

  // 서버를 기다리다 예산이 끝났다 — 504 + 코드(화면은 5xx 를 다시 불러도 되는 것으로 본다 · `FE-REQ-012` retriable)
  if (isUpstreamTimeout(err)) {
    logFailure(504, "UPSTREAM_TIMEOUT", err, req);
    return res.status(504).json({ success: false, code: "UPSTREAM_TIMEOUT", message: "Upstream timeout" });
  }

  logFailure(500, err.name, err, req);
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};
