import { NextFunction, Request, Response } from "express";
import { appHomeMarketService } from "../../services/app-home-market.service";
import { appHomeService } from "../../services/app-home.service";

export class AppController {
  async getHome(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appHomeService.getHome(req.token!));
    } catch (error) {
      next(error);
    }
  }

  /** 홈 시장 블록(`BFF-REQ-046` FR-14) — 국내 지수 · 코인 대표 · 공개 일정 */
  async getHomeMarket(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appHomeMarketService.getMarket(req.token!));
    } catch (error) {
      next(error);
    }
  }

  async arrangeHome(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await appHomeService.arrangeHome(req.token!, req.body?.order, req.body?.hidden));
    } catch (error) {
      next(error);
    }
  }
}

export const appController = new AppController();
