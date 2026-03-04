import { NextFunction, Request, Response } from "express";
import { InvestmentInsightService } from "./investment-insight.service";
import { ResponseUtil } from "../../utils/response.util";
import { WhaleSignalService } from "./whale-signal.service";
import { PortfolioRebalanceService } from "./portfolio-rebalance.service";

export class InvestmentInsightController {
  private investmentInsightService = new InvestmentInsightService();
  private whaleSignalService = new WhaleSignalService();
  private portfolioRebalanceService = new PortfolioRebalanceService();
  /**
   * 위험 분석 실행 (테스트용)
   */
  generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const result =
        await this.investmentInsightService.generateRiskAlerts(userId);

      return ResponseUtil.success(res, result, "Risk analysis completed");
    } catch (error) {
      next(error);
    }
  };

  /**
   * 인사이트 조회
   */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;

      const insights =
        await this.investmentInsightService.getUserInsights(userId);

      return ResponseUtil.success(res, insights);
    } catch (error) {
      console.error("Get insights error:", error);

      res.status(500).json({
        message: "Failed to fetch insights",
      });
    }
  };

  generateSmartBuyZone = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.investmentInsightService.generateSmartBuyZone();

      return ResponseUtil.success(res, result, "Smart Buy Zone generated");
    } catch (error) {
      next(error);
    }
  };

  generateWhaleSignals = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result = await this.whaleSignalService.generateWhaleSignals();

      return ResponseUtil.success(res, result, "Whale signals generated");
    } catch (error) {
      next(error);
    }
  };

  generateRebalance = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user!.userId;

      const result =
        await this.portfolioRebalanceService.generateRebalance(userId);

      return ResponseUtil.success(res, result, "Rebalance generated");
    } catch (error) {
      next(error);
    }
  };
}
