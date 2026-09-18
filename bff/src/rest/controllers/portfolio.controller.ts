import { NextFunction, Request, Response } from "express";
import { appPortfolioService } from "../../services/app-portfolio.service";
import { backendApi } from "../../services/backend-api.service";

export class AppPortfolioController {
  async getPortfolio(req: Request, res: Response) {
    try {
      const token = req.token!;

      const result = await appPortfolioService.getPortfolio(token);

      res.json(result);
    } catch (error) {
      console.error("Portfolio error:", error);
      res.status(500).json({
        message: "Failed to fetch portfolio",
      });
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
