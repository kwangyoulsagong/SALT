import { Request, Response, NextFunction } from "express";
import { DomainError, ErrorKind } from "../domain/DomainError";
import { logger } from "../config/logger";
import { AppError } from "./httpErrors";
import { loggableUrl } from "./loggerMiddleware";
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
  [ErrorKind.Forbidden]: 403,
  [ErrorKind.Unauthenticated]: 401,
  [ErrorKind.Unavailable]: 503,
};

interface ErrorResponse {
  status: number;
  body: Record<string, unknown>;
  /** 로그에 남길 식별 코드 */
  code: string;
  /** 로그 한 줄에 들어갈 사유. 여러 줄 원문(Zod 이슈 JSON)을 그대로 남기지 않는다 */
  reason: string;
}

/**
 * 예외 → 응답. **로그를 남기지 않는 순수 함수**라 단위로 잰다.
 */
export const toErrorResponse = (err: Error): ErrorResponse => {
  // Zod 검증 에러
  if (err instanceof ZodError) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      reason: err.issues
        .map((e) => `${e.path.join(".") || "(root)"}: ${e.message}`)
        .join("; "),
      body: {
        success: false,
        message: "Validation error",
        errors: err.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    };
  }

  // 도메인 예외 — 컨텍스트를 모르는 채로 처리한다 (`ddd-shared.md` §2)
  if (err instanceof DomainError) {
    return {
      status: ERROR_KIND_STATUS[err.kind],
      code: err.code,
      reason: err.message,
      // `details` 를 먼저 펼친다 — 상세가 `success` · `code` · `message` 를 덮지 못한다
      body: { ...err.details, success: false, code: err.code, message: err.message },
    };
  }

  // 커스텀 에러 (이관 전 모듈)
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      // 이관 전 오류는 코드가 없다 — 클래스 이름(`UnauthorizedError` 등)이 그 자리다
      code: err.constructor.name,
      reason: err.message,
      body: { success: false, message: err.message },
    };
  }

  // 기본 에러
  return {
    status: 500,
    code: err.name,
    reason: err.message,
    body: {
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    },
  };
};

/**
 * **요청이 틀린 것(4xx)은 서버 오류가 아니다.** 전에는 400 · 401 · 422 까지 `error` 레벨 + 스택으로
 * 남겨 클라이언트 실수가 서버 장애처럼 쌓였다(2026-10-28 알림 `size=500` · 무인증 요청). 4xx 는
 * `warn` 한 줄(상태 · 코드 · 경로), 5xx 와 모르는 예외만 `error` + 스택이다.
 */
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const response = toErrorResponse(err);

  if (response.status >= 500) {
    logger.error("Error:", {
      message: err.message,
      stack: err.stack,
      url: loggableUrl(req.url),
      method: req.method,
    });
  } else {
    // meta 에 `message` 키를 두면 winston 이 본문에 이어 붙인다 — 사유는 `reason` 으로
    logger.warn(`Request rejected ${response.status} ${response.code}`, {
      reason: response.reason,
      url: loggableUrl(req.url),
      method: req.method,
    });
  }

  return res.status(response.status).json(response.body);
};
