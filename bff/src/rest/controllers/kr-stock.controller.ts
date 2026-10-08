import { Request, Response, NextFunction } from "express";
import { appKrStockService, type KrResult } from "../../services/app-kr-stock.service";
import {
  KR_LIST_ORDERS,
  KR_LIST_PERIODS,
  KR_LIST_SORTS,
  type KrChartPeriod,
  type KrListOrder,
  type KrListPeriod,
  type KrListSort,
} from "../../services/kr-stock.viewmodel";

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

/** 열거 쿼리 — 없으면 `""`(기본), 아는 값이 아니면 `null` */
const enumQuery = <T extends string>(raw: unknown, values: readonly T[]): T | null => {
  if (raw === undefined) return "" as T;
  return typeof raw === "string" && (values as readonly string[]).includes(raw) ? (raw as T) : null;
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
    // 코인 시세 표와 같은 필터 문자열(F011 슬라이스 3) — 모르는 값은 서버를 부르지 않고 400
    const sort = enumQuery<KrListSort>(req.query.sort, KR_LIST_SORTS);
    const order = enumQuery<KrListOrder>(req.query.order, KR_LIST_ORDERS);
    const period = enumQuery<KrListPeriod>(req.query.period, KR_LIST_PERIODS);
    if (sort === null || order === null || period === null) return badRequest(res, "sort · order · period 값이 아닙니다");
    return respond(res, next, (signal) =>
      appKrStockService.getOverview(req.token!, { limit, offset, sort, order, period }, signal),
    );
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
