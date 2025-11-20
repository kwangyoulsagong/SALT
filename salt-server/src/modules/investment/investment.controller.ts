import { Request, Response, NextFunction } from "express";
import { InvestmentService } from "./investment.service";
import { ResponseUtil } from "../../utils/response.util";
import { addToWatchlistSchema, queryWatchlistSchema } from "./investment.dto";

export class InvestmentController {
  private investmentService = new InvestmentService();

  addToWatchlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = addToWatchlistSchema.parse(req.body);
      const result = await this.investmentService.addToWatchlist(userId, data);

      return ResponseUtil.created(
        res,
        result,
        "Added to watchlist successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getWatchlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = queryWatchlistSchema.parse(req.query);
      const result = await this.investmentService.getWatchlist(userId, query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  removeFromWatchlist = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.investmentService.removeFromWatchlist(
        userId,
        id
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getRealTimePrice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { symbol } = req.params;
      const result = await this.investmentService.getRealTimePrice(symbol);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getChartData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { symbol } = req.params;
      const period = (req.query.period as "day" | "hour") || "day";
      const count = req.query.count ? Number(req.query.count) : 30;

      const result = await this.investmentService.getChartData(
        symbol,
        period,
        count
      );

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // Internal API (BFF용)
  getAllSymbols = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.investmentService.getAllWatchlistSymbols();
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  updatePrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { priceData } = req.body;
      const result = await this.investmentService.updateWatchlistPrices(
        priceData
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
  getMarketOverview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page, limit, sort, order, period, search } = req.query;

      const result = await this.investmentService.getMarketOverview({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 100,
        sort: (sort as any) || "trade_value",
        order: (order as any) || "desc",
        period: (period as any) || "1d",
        search: (search as string) || undefined,
      });

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
