import { NextFunction, Request, Response } from "express";
import { appPortfolioService } from "../../services/app-portfolio.service";
import { backendApi } from "../../services/backend-api.service";

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

export const appPortfolioController = new AppPortfolioController();
