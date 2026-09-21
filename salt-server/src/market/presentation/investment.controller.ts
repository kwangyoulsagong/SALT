import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import {
  ChartPeriod,
  isChartPeriod,
  isMarketOverviewPeriod,
  isMarketOverviewSort,
  MarketOverviewPeriod,
  MarketOverviewSort,
  UnsupportedChartPeriodError,
  UnsupportedMarketPeriodError,
} from "../domain";
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

  /**
   * 차트.
   *
   * `period` 를 **조용히 기본값으로 떨어뜨리지 않는다** (`FE-REQ-010` FR-51). 없으면
   * `day` 지만, 값이 있는데 모르는 값이면 422 다 — 프론트의 `miniute` 오타가 오래
   * 살아남은 이유가 "틀린 값도 동작했기 때문"이다.
   */
  getChartData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawUnit = req.query.unit ? Number(req.query.unit) : 5;
      const rawPeriod = req.query.period;

      if (rawPeriod !== undefined && !isChartPeriod(rawPeriod)) {
        throw new UnsupportedChartPeriodError(String(rawPeriod));
      }

      const result = await this.useCases.getChartData.execute({
        symbol: req.params.symbol,
        period: rawPeriod ?? ChartPeriod.Day,
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
   * `period` 는 **원래 받기만 하고 쓰지 않았다.** 화면의 기간 버튼 7개가 변경 금지
   * 목록이라(`SRV-REQ-009` FR-11) 지우지 않고 살렸다. 빈 문자열·없음은 실시간이다 —
   * 프론트의 "실시간" 버튼이 빈 문자열을 보낸다. 그 외 모르는 값은 422 다.
   */
  getMarketOverview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { page, limit, sort, order, search, period } = req.query;

      if (period !== undefined && period !== "" && !isMarketOverviewPeriod(period)) {
        throw new UnsupportedMarketPeriodError(String(period));
      }

      const result = await this.useCases.getMarketOverview.execute({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 100,
        sort: isMarketOverviewSort(sort) ? sort : MarketOverviewSort.TradeValue,
        order: order === "asc" ? "asc" : "desc",
        search: (search as string) || undefined,
        period: isMarketOverviewPeriod(period)
          ? period
          : MarketOverviewPeriod.Realtime,
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
