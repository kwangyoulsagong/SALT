import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { PortfolioUseCases } from "../application/api";
import {
  createTransactionSchema,
  queryHoldingsSchema,
  queryTransactionsSchema,
  updateTransactionSchema,
} from "./dto/portfolio.dto";

export class PortfolioController {
  constructor(private readonly useCases: PortfolioUseCases) {}

  createTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = createTransactionSchema.parse(req.body);

      const result = await this.useCases.recordTransaction.execute({
        userId: req.user!.userId,
        symbol: data.symbol,
        transactionType: data.transactionType,
        quantity: data.quantity,
        price: data.price,
        fee: data.fee,
        note: data.note,
        transactionDate: data.transactionDate
          ? new Date(data.transactionDate)
          : undefined,
      });

      return ResponseUtil.created(
        res,
        result,
        "Transaction created successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = queryTransactionsSchema.parse(req.query);

      const result = await this.useCases.listTransactions.execute(
        req.user!.userId,
        {
          symbol: query.symbol,
          transactionType: query.transactionType,
          startDate: query.startDate ? new Date(query.startDate) : undefined,
          endDate: query.endDate ? new Date(query.endDate) : undefined,
          page: query.page,
          limit: query.limit,
        }
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getHoldings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = queryHoldingsSchema.parse(req.query);
      const result = await this.useCases.getHoldings.execute(
        req.user!.userId,
        query.symbol
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = updateTransactionSchema.parse(req.body);

      const result = await this.useCases.updateTransaction.execute(
        req.user!.userId,
        req.params.id,
        {
          quantity: data.quantity,
          price: data.price,
          fee: data.fee,
          note: data.note,
          transactionDate: data.transactionDate
            ? new Date(data.transactionDate)
            : undefined,
        }
      );

      return ResponseUtil.success(
        res,
        result,
        "Transaction updated successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  deleteTransaction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.useCases.deleteTransaction.execute(
        req.user!.userId,
        req.params.id
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPortfolioStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.useCases.getPortfolioStats.execute(
        req.user!.userId
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /** 내부 API (BFF용). 인증이 없다 — 원문 그대로다. */
  updateHoldingPrices = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await this.useCases.updateHoldingPrices.execute(req.body.priceData);
      return ResponseUtil.success(res, {
        message: "Prices updated successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 성과 차트.
   *
   * 원문 컨트롤러는 **`try/catch` 가 없어** 유스케이스가 던지면 Express 5 의 기본
   * 처리로 넘어갔다. 다른 핸들러와 같이 `next(error)` 로 맞춘다 — 에러 응답 모양이
   * `errorMiddleware` 한 곳에서 나오게 하는 것이 규칙이다 (`ddd-presentation.md` §4).
   */
  getPerformance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getPerformanceSeries.execute(
        req.user!.userId,
        (req.query.range as string) ?? "7d"
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
