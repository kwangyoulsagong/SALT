import { Request, Response } from "express";
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
