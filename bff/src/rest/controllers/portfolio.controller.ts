import { NextFunction, Request, Response } from "express";
import { appPortfolioService } from "../../services/app-portfolio.service";
import type {
  TransactionCreateInput,
  TransactionPatchInput,
  TransactionPreviewInput,
} from "../../services/position.viewmodel";
import { backendApi } from "../../services/backend-api.service";
import { AppError } from "../../utils/error.util";

export class AppPortfolioController {
  async getPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appPortfolioService.getPortfolio(req.token!));
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await appPortfolioService.getSummary(req.token!);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async getPerformance(req: Request, res: Response) {
    const token = req.token!;

    const response = await backendApi.proxyAuthRequest(
      "GET",
      "/portfolio/performance",
      token,
    );

    res.json(response.data);
  }
}

const FLOW_RANGES = new Set(["1w", "1m", "3m", "1y"]);

/** 포지션(F006 G절) — 응답은 뷰모델 그대로(같은 파일 `summary` 와 같은 모양). 기간은 넷 중 하나, 아니면 400(서버에 모르는 값을 넘기지 않는다) */
export const positionController = {
  async getPosition(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appPortfolioService.getPosition(req.token!));
    } catch (error) {
      next(error);
    }
  },
  async getFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const range = String(req.query.range ?? "1m");
      if (!FLOW_RANGES.has(range)) {
        return next(new AppError("range 는 1w · 1m · 3m · 1y 중 하나", 400, true, "INVALID_RANGE"));
      }
      res.json(await appPortfolioService.getPositionFlow(req.token!, range as "1w" | "1m" | "3m" | "1y"));
    } catch (error) {
      next(error);
    }
  },
};

type Raw = Record<string, unknown>;
const SYMBOL_PATTERN = /^[A-Za-z0-9]{1,20}$/;
const isPositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const isIsoDate = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));
const invalid = (message: string) => new AppError(message, 400, true, "VALIDATION_ERROR");
const bodyOf = (req: Request): Raw => (typeof req.body === "object" && req.body !== null ? (req.body as Raw) : {});

/** 모양만 본다 — 과매도 · 종목 존재는 서버가 판정(그 코드가 그대로 올라간다, FR-82) */
const parseCreate = (body: Raw): TransactionCreateInput | AppError => {
  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
  if (!SYMBOL_PATTERN.test(symbol)) return invalid("symbol 형식이 아닙니다");
  if (body.assetType !== "crypto" && body.assetType !== "kr_stock") return invalid("assetType 은 crypto · kr_stock 입니다");
  if (body.side !== "buy" && body.side !== "sell") return invalid("side 는 buy · sell 입니다");
  if (!isPositive(body.quantity) || !isPositive(body.price)) return invalid("수량 · 단가는 0보다 커야 합니다");
  if (body.transactionDate !== undefined && !isIsoDate(body.transactionDate)) return invalid("transactionDate 는 ISO 시각입니다");
  return {
    assetType: body.assetType,
    symbol: symbol.toUpperCase(),
    side: body.side,
    quantity: body.quantity,
    price: body.price,
    ...(isIsoDate(body.transactionDate) ? { transactionDate: body.transactionDate } : {}),
  };
};

/** 수정 — 수량 · 단가 · 거래일만. 종목 · 매수/매도를 보내면 400(조용히 버리면 "바꿨는데 안 바뀐" 성공이 된다, 서버 FR-87) */
const PATCH_KEYS = new Set(["quantity", "price", "transactionDate"]);
const parsePatch = (body: Raw): TransactionPatchInput | AppError => {
  const unknown = Object.keys(body).filter((key) => !PATCH_KEYS.has(key));
  if (unknown.length > 0) return invalid(`바꿀 수 없는 칸: ${unknown.join(", ")} — 종목 · 매수/매도는 지우고 다시 적는다`);
  if (body.quantity !== undefined && !isPositive(body.quantity)) return invalid("수량은 0보다 커야 합니다");
  if (body.price !== undefined && !isPositive(body.price)) return invalid("단가는 0보다 커야 합니다");
  if (body.transactionDate !== undefined && !isIsoDate(body.transactionDate)) return invalid("transactionDate 는 ISO 시각입니다");
  return {
    ...(isPositive(body.quantity) ? { quantity: body.quantity } : {}),
    ...(isPositive(body.price) ? { price: body.price } : {}),
    ...(isIsoDate(body.transactionDate) ? { transactionDate: body.transactionDate } : {}),
  };
};

const parsePreview = (body: Raw): TransactionPreviewInput | AppError => {
  if (body.transactionId === undefined) return parseCreate(body);
  if (typeof body.transactionId !== "string" || body.transactionId.trim() === "") return invalid("transactionId 가 비었습니다");
  const { transactionId, ...rest } = body;
  const patch = parsePatch(rest);
  return patch instanceof AppError ? patch : { ...patch, transactionId: transactionId.trim() };
};

const idOf = (req: Request): string | AppError => {
  const id = String(req.params.id ?? "").trim();
  return id ? id : invalid("거래 id 가 비었습니다");
};

/**
 * 거래 기록 중계(F006 G절 2단계 · `BFF-REQ-027` FR-80~85) — **주문이 아니다.** 이미 한 거래를 적는다(거래소로 나가는 호출 0).
 * 쓰기는 재시도 0회 · 서버 4xx(`PORTFOLIO_INSUFFICIENT_QUANTITY` · 404)는 error middleware 가 코드 그대로 옮긴다
 */
export const transactionController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page ?? 1);
      if (!Number.isInteger(page) || page < 1) return next(invalid("page 는 1 이상 정수입니다"));
      res.json({ success: true, data: await appPortfolioService.listTransactions(req.token!, page) });
    } catch (error) {
      next(error);
    }
  },
  async preview(req: Request, res: Response, next: NextFunction) {
    const input = parsePreview(bodyOf(req));
    if (input instanceof AppError) return next(input);
    try {
      res.json({ success: true, data: await appPortfolioService.previewTransaction(req.token!, input) });
    } catch (error) {
      next(error);
    }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    const input = parseCreate(bodyOf(req));
    if (input instanceof AppError) return next(input);
    try {
      res.status(201).json({ success: true, data: await appPortfolioService.createTransaction(req.token!, input) });
    } catch (error) {
      next(error);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    const id = idOf(req);
    if (id instanceof AppError) return next(id);
    const patch = parsePatch(bodyOf(req));
    if (patch instanceof AppError) return next(patch);
    try {
      res.json({ success: true, data: await appPortfolioService.updateTransaction(req.token!, id, patch) });
    } catch (error) {
      next(error);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    const id = idOf(req);
    if (id instanceof AppError) return next(id);
    try {
      await appPortfolioService.deleteTransaction(req.token!, id);
      res.json({ success: true, data: { id } });
    } catch (error) {
      next(error);
    }
  },
};

export const appPortfolioController = new AppPortfolioController();
