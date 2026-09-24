import { Request, Response, NextFunction } from "express";
import { appTradeRiskService, type RecordTradeInput } from "../../services/app-trade-risk.service";

/** 코치 모양 심볼(`BTC`). 서버 DTO 와 같은 규칙 — 여기서 먼저 막아 upstream 을 부르지 않는다 */
const SYMBOL_PATTERN = /^[A-Za-z0-9]{1,20}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Raw = Record<string, unknown>;
const bodyOf = (req: Request): Raw =>
  typeof req.body === "object" && req.body !== null && !Array.isArray(req.body) ? (req.body as Raw) : {};

/**
 * 화면 계약에 있는 키만 서버로 넘긴다 — 나머지는 버린다. 값 검증(양수 · 범위)은 서버 zod 가 하고
 * 400 은 error middleware 가 그대로 옮긴다(`backend-integration.md`). 여기서 규칙을 두 벌 두지 않는다.
 */
const pick = (body: Raw, keys: readonly string[]): Raw =>
  Object.fromEntries(keys.filter((key) => key in body).map((key) => [key, body[key]]));

const SIZE_CHECK_KEYS = ["symbol", "side", "quantity", "price", "stopPrice", "winRate", "payoffRatio"] as const;
const RISK_BUDGET_KEYS = ["monthlyLossBudget", "perTradeMaxLoss", "targetVolatility"] as const;
const PLAN_CREATE_KEYS = [
  "symbol",
  "side",
  "transactionId",
  "stopPrice",
  "targetPrice",
  "plannedQuantity",
  "thesis",
  "invalidation",
  "reviewAt",
  "probabilityUp",
] as const;
const PLAN_UPDATE_KEYS = PLAN_CREATE_KEYS.filter((key) => key !== "symbol" && key !== "side");

const badRequest = (res: Response, message: string) => res.status(400).json({ success: false, message });

const isPositive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/** 거래 폼 한 번의 저장. 금액 · 수량 모양만 보고 나머지는 서버가 판정한다 */
const parseRecordTrade = (body: Raw): RecordTradeInput | string => {
  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
  if (!SYMBOL_PATTERN.test(symbol)) return "symbol 형식이 아닙니다";
  if (body.side !== "buy" && body.side !== "sell") return "side 는 buy · sell 입니다";
  if (!isPositive(body.quantity) || !isPositive(body.price)) return "수량 · 단가는 0보다 커야 합니다";
  if (body.fee !== undefined && !(typeof body.fee === "number" && Number.isFinite(body.fee) && body.fee >= 0)) {
    return "수수료는 0 이상입니다";
  }
  if (body.transactionDate !== undefined && typeof body.transactionDate !== "string") {
    return "transactionDate 는 ISO 문자열입니다";
  }
  const rawPlan = typeof body.plan === "object" && body.plan !== null ? (body.plan as Raw) : {};
  if (rawPlan.stopPrice !== undefined && !isPositive(rawPlan.stopPrice)) return "손절가는 0보다 커야 합니다";
  if (rawPlan.thesis !== undefined && typeof rawPlan.thesis !== "string") return "이유는 문자열입니다";

  return {
    symbol: symbol.toUpperCase(),
    side: body.side,
    quantity: body.quantity,
    price: body.price,
    ...(typeof body.fee === "number" ? { fee: body.fee } : {}),
    ...(typeof body.transactionDate === "string" ? { transactionDate: body.transactionDate } : {}),
    plan: {
      ...(isPositive(rawPlan.stopPrice) ? { stopPrice: rawPlan.stopPrice } : {}),
      ...(typeof rawPlan.thesis === "string" ? { thesis: rawPlan.thesis } : {}),
    },
  };
};

/** 화면을 떠나면 upstream 도 끊는다(`coach.controller` 와 같은 규칙) */
const abortOnClose = (res: Response) => {
  const aborter = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) aborter.abort();
  });
  return aborter;
};

/**
 * F009 거래 기록 · 계획 · 사이즈 계산 · 리스크 예산 (`BFF-REQ-038`). `/api/app/coach/*` 아래.
 * 주문 경로가 아니다 — 사용자가 이미 한 거래를 **적는** 곳이다(수동 입력, 계좌 연동 없음).
 */
export class AppTradeRiskController {
  sizeCheck = async (req: Request, res: Response, next: NextFunction) => {
    const body = pick(bodyOf(req), SIZE_CHECK_KEYS);
    if (typeof body.symbol !== "string" || !SYMBOL_PATTERN.test(body.symbol)) {
      return badRequest(res, "symbol 형식이 아닙니다");
    }
    const aborter = abortOnClose(res);
    try {
      const data = await appTradeRiskService.sizeCheck(
        req.token!,
        { ...body, symbol: body.symbol.toUpperCase() },
        aborter.signal,
      );
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  riskBudget = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = abortOnClose(res);
    try {
      const data = await appTradeRiskService.getRiskBudget(req.token!, aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  updateRiskBudget = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appTradeRiskService.updateRiskBudget(req.token!, pick(bodyOf(req), RISK_BUDGET_KEYS));
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  listPlans = async (req: Request, res: Response, next: NextFunction) => {
    const symbol = typeof req.query.symbol === "string" ? req.query.symbol.trim() : "";
    if (!SYMBOL_PATTERN.test(symbol)) return badRequest(res, "symbol 형식이 아닙니다");
    const aborter = abortOnClose(res);
    try {
      const data = await appTradeRiskService.listPlans(req.token!, symbol.toUpperCase(), aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  createPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await appTradeRiskService.createPlan(req.token!, pick(bodyOf(req), PLAN_CREATE_KEYS));
      return res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updatePlan = async (req: Request, res: Response, next: NextFunction) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!UUID_PATTERN.test(id)) return badRequest(res, "id 형식이 아닙니다");
    try {
      const data = await appTradeRiskService.updatePlan(req.token!, id, pick(bodyOf(req), PLAN_UPDATE_KEYS));
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  recordTrade = async (req: Request, res: Response, next: NextFunction) => {
    const input = parseRecordTrade(bodyOf(req));
    if (typeof input === "string") return badRequest(res, input);
    try {
      const data = await appTradeRiskService.recordTrade(req.token!, input);
      return res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appTradeRiskController = new AppTradeRiskController();
