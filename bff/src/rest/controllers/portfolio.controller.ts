import { Request, Response } from "express";
import { appPortfolioService } from "../../services/app-portfolio.service";

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
}

export const appPortfolioController = new AppPortfolioController();
