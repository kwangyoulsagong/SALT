import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { MarketUseCases } from "../application/api";

export class MarketIntelligenceController {
  constructor(private readonly useCases: MarketUseCases) {}

  getSentiment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.calculateSentiment.execute(
        req.params.symbol.toUpperCase()
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSmartMoney = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.trackSmartMoney.execute(
        req.params.symbol.toUpperCase()
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getSentimentHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.useCases.getSentimentHistory.execute(
        req.params.symbol.toUpperCase(),
        req.query.days ? Number(req.query.days) : 30
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getWhaleTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.useCases.listWhaleTransactions.execute(
        req.params.symbol.toUpperCase(),
        req.query.limit ? Number(req.query.limit) : 20
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 심리 + 스마트머니 통합.
   *
   * > **컨트롤러가 유스케이스를 둘 부른다.** `ddd-presentation.md` §1 은 한 번만 부르라고
   * > 하고, 둘이면 그 조합이 유스케이스라고 말한다. 여기서는 **원문 그대로 두 호출을
   * > 유지**했다 — 조합 유스케이스를 만들면 응답 모양을 다시 정해야 하고, 그건 이관이
   * > 아니라 계약 변경이다. `Promise.all` 이라 두 번 왕복도 아니다.
   * >
   * > 화면이 실제로 무엇을 쓰는지는 F004·F006 이 정한다. 그때 `homebriefing` 같은
   * > 조합 컨텍스트로 갈지 판단한다.
   */
  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const symbol = req.params.symbol.toUpperCase();

      const [sentiment, smartMoney] = await Promise.all([
        this.useCases.calculateSentiment.execute(symbol),
        this.useCases.trackSmartMoney.execute(symbol),
      ]);

      return ResponseUtil.success(res, {
        symbol,
        sentiment,
        smartMoney,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  };

  getSymbolNews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.getSymbolNews.execute(
        String(req.params.symbol).toUpperCase(),
        req.query.limit ? Number(req.query.limit) : 3
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
