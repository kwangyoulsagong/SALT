import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

/**
 * 로그에 남길 주소 — 검색어(`q`) 값을 `*` 로 가린다. 관심 종목 · 검색어는 투자 의도라 로그에 남기지 않는다
 * (`SRV-REQ-008` FR-86). 종목 검색 · 국내 검색 둘 다 `q` 를 쓴다
 */
export const loggableUrl = (url: string): string => url.replace(/([?&]q=)[^&#]*/g, "$1*");

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
    logger.info(`${req.method} ${loggableUrl(req.url)} ${res.statusCode} ${duration}ms`, {
      ip: req.ip,
    });
  });

  next();
};
