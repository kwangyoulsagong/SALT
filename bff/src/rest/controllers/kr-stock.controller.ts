import { Request, Response, NextFunction } from "express";
import { appKrStockService, type KrResult } from "../../services/app-kr-stock.service";
import type { KrChartPeriod } from "../../services/kr-stock.viewmodel";

/**
 * 국내 주식 (F011 슬라이스 2 · `BFF-REQ-040`).
 *
 * 형식 검증은 서버 DTO(`krStock.dto.ts`)와 같은 규칙으로 **여기서 먼저** 막는다 — 경로에 들어가는 `code` 를
 * 검증 없이 넘기면 `../` 로 다른 서버 경로를 부를 수 있다(`config-security.md` SSRF). 숫자 범위도 서버와 같다.
 */
const CODE_PATTERN = /^[0-9A-Z]{6}$/;
const CHART_PERIODS: readonly KrChartPeriod[] = ["1d", "5m"];

const badRequest = (res: Response, message: string) => res.status(400).json({ success: false, message });

/** 쿼리 정수 — 없으면 기본값, 범위 밖 · 정수 아님이면 `null` */
const intQuery = (raw: unknown, fallback: number, min: number, max: number): number | null => {
  if (raw === undefined || raw === "") return fallback;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
};

/** 화면을 떠나면 upstream 도 끊는다(`judgment-scoreboard.controller` 와 같은 규칙) */
const respond = async (
  res: Response,
  next: NextFunction,
  call: (signal: AbortSignal) => Promise<KrResult<object>>,
) => {
  const aborter = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) aborter.abort();
  });
  try {
    const data = await call(aborter.signal);
    return res.json({ success: true, data });
  } catch (error) {
    if (aborter.signal.aborted) return;
    next(error);
  }
};

export class AppKrStockController {
  session = (req: Request, res: Response, next: NextFunction) =>
    respond(res, next, (signal) => appKrStockService.getSession(req.token!, signal));

  overview = (req: Request, res: Response, next: NextFunction) => {
    const limit = intQuery(req.query.limit, 50, 1, 100);
    const offset = intQuery(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    if (limit === null || offset === null) return badRequest(res, "limit 은 1~100, offset 은 0 이상 정수입니다");
    return respond(res, next, (signal) => appKrStockService.getOverview(req.token!, { limit, offset }, signal));
  };

  search = (req: Request, res: Response, next: NextFunction) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2 || q.length > 30) return badRequest(res, "q 는 2~30자입니다");
    return respond(res, next, (signal) => appKrStockService.search(req.token!, q, signal));
  };

  detail = (req: Request, res: Response, next: NextFunction) => {
    const code = String(req.params.code ?? "").toUpperCase();
    if (!CODE_PATTERN.test(code)) return badRequest(res, "종목 코드 형식이 아닙니다");
    return respond(res, next, (signal) => appKrStockService.getDetail(req.token!, code, signal));
  };

  chart = (req: Request, res: Response, next: NextFunction) => {
    const code = String(req.params.code ?? "").toUpperCase();
    if (!CODE_PATTERN.test(code)) return badRequest(res, "종목 코드 형식이 아닙니다");
    const period = (req.query.period ?? "1d") as KrChartPeriod;
    if (!CHART_PERIODS.includes(period)) return badRequest(res, "period 는 1d · 5m 입니다");
    const count = intQuery(req.query.count, 120, 1, 500);
    if (count === null) return badRequest(res, "count 는 1~500 정수입니다");
    return respond(res, next, (signal) => appKrStockService.getChart(req.token!, code, { period, count }, signal));
  };
}

export const appKrStockController = new AppKrStockController();
