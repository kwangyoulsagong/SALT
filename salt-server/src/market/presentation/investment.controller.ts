import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import { isMarketOverviewSort, MarketOverviewSort } from "../domain";
import type { MarketUseCases } from "../application/api";
import {
  addToWatchlistSchema,
  queryWatchlistSchema,
} from "./dto/watchlist.dto";

/** 분봉에서 거래소가 받는 단위. 그 외 값은 5분으로 떨어뜨린다(원문). */
const ALLOWED_UNITS = [1, 3, 5, 15, 30, 60, 240];

export class InvestmentController {
  constructor(private readonly useCases: MarketUseCases) {}

  addToWatchlist = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = addToWatchlistSchema.parse(req.body);
      const result = await this.useCases.addToWatchlist.execute({
        userId: req.user!.userId,
        ...data,
      });

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
      const query = queryWatchlistSchema.parse(req.query);
      const result = await this.useCases.listWatchlist.execute(
        req.user!.userId,
        query
      );
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
      const result = await this.useCases.removeFromWatchlist.execute(
        req.user!.userId,
        req.params.id
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
      const result = await this.useCases.getRealTimePrice.execute(
        req.params.symbol
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getChartData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawUnit = req.query.unit ? Number(req.query.unit) : 5;

      const result = await this.useCases.getChartData.execute({
        symbol: req.params.symbol,
        period: (req.query.period as "day" | "minute") || "day",
        count: req.query.count ? Number(req.query.count) : 30,
        unit: ALLOWED_UNITS.includes(rawUnit) ? rawUnit : 5,
      });
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 마켓 목록.
   *
   * > `period` 쿼리를 받지만 **원문에서도 쓰이지 않았다** — 서비스가 그 값을 무시한다.
   * > 계약을 깨지 않으려고 파라미터는 남겨 두되 넘기지 않는다. 살릴지 지울지는
   * > `SRV-REQ-007` 이 정한다.
   */
  getMarketOverview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page, limit, sort, order, search } = req.query;

      const result = await this.useCases.getMarketOverview.execute({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 100,
        sort: isMarketOverviewSort(sort) ? sort : MarketOverviewSort.TradeValue,
        order: order === "asc" ? "asc" : "desc",
        search: (search as string) || undefined,
      });
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // 내부 API (BFF용)
  getAllSymbols = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.listWatchlistSymbols.execute();
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  updatePrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.useCases.updateWatchlistPrices.execute(
        req.body.priceData
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getAllMarketSymbols = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await this.useCases.listMarketSymbols.execute();
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
