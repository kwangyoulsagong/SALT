import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { PortfolioUseCases } from "../application/api";
import {
  createTransactionSchema,
  positionFlowQuerySchema,
  queryHoldingsSchema,
  queryTransactionsSchema,
  previewTransactionSchema,
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
        assetType: data.assetType,
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

  /**
   * 홈 "주식" 섹션 요약.
   *
   * 한 줄에 들어갈 넷(심볼·자산군·평가금액·손익률)과 합계만 준다.
   */
  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getPortfolioSummary.execute(
        req.user!.userId
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

  /** 쓰지 않는 전후 계산 — 저장과 같은 규칙. 과매도면 저장과 같은 `PORTFOLIO_INSUFFICIENT_QUANTITY` */
  previewTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = previewTransactionSchema.parse(req.body);
      const userId = req.user!.userId;
      const toDate = (value: string | undefined) => (value ? new Date(value) : undefined);
      const result =
        "transactionId" in data
          ? await this.useCases.previewTransaction.execute({
              userId,
              kind: "update",
              transactionId: data.transactionId,
              patch: { quantity: data.quantity, price: data.price, fee: data.fee, transactionDate: toDate(data.transactionDate) },
            })
          : await this.useCases.previewTransaction.execute({
              userId,
              kind: "create",
              assetType: data.assetType,
              symbol: data.symbol,
              transactionType: data.transactionType,
              quantity: data.quantity,
              price: data.price,
              fee: data.fee,
              // 저장과 같은 기본값 — 거래일을 안 주면 지금
              transactionDate: toDate(data.transactionDate) ?? new Date(),
            });
      return ResponseUtil.success(res, result);
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

  /** 포지션 개요(F006 G절) — 금액은 여기서 원 단위로 한 번 반올림한다(`ddd-presentation.md` §2) */
  getPositionOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getPositionOverview.execute(req.user!.userId);
      if (result.empty) return ResponseUtil.success(res, result);
      const hero = result.hero;
      return ResponseUtil.success(res, {
        ...result,
        hero: {
          ...hero,
          totalValueKrw: Math.round(hero.totalValueKrw),
          unrealizedProfitKrw: Math.round(hero.unrealizedProfitKrw),
          investedKrw: Math.round(hero.investedKrw),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** 평가금 흐름(기간 버튼) — 점의 금액은 계산에서 이미 원 단위 */
  getPositionFlow = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { range } = positionFlowQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.useCases.getPositionFlow.execute(req.user!.userId, range));
    } catch (error) {
      next(error);
    }
  };
}
