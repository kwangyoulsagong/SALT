import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    // 첫 인자는 문자열이어야 한다 — 객체를 주면 콘솔 형식이 `[object Object]` 로 찍어
    // 접근 로그 내용이 통째로 사라졌다(2026-10-28 발견)
    logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`, {
      ip: req.ip,
    });
  });

  next();
};
