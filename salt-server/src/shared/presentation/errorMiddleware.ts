import { Request, Response, NextFunction } from "express";
import { DomainError, ErrorKind } from "../domain/DomainError";
import { logger } from "../config/logger";
import { AppError } from "./httpErrors";
import { ZodError } from "zod";

/**
 * `ErrorKind` → HTTP status 매핑은 **여기서 한 번만** 한다.
 * 도메인은 404/409/400 을 모른다 — 그것은 presentation 의 판단이다.
 */
const ERROR_KIND_STATUS: Record<ErrorKind, number> = {
  [ErrorKind.NotFound]: 404,
  [ErrorKind.Conflict]: 409,
  [ErrorKind.Invalid]: 400,
  [ErrorKind.Blocked]: 422,
};

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

  // Zod 검증 에러
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // 도메인 예외 — 컨텍스트를 모르는 채로 처리한다 (`ddd-shared.md` §2)
  if (err instanceof DomainError) {
    return res.status(ERROR_KIND_STATUS[err.kind]).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  // 커스텀 에러 (이관 전 모듈)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // 기본 에러
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
};
