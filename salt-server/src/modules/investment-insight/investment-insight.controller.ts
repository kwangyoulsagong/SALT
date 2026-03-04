import { NextFunction, Request, Response } from "express";
import { InvestmentInsightService } from "./investment-insight.service";
import { ResponseUtil } from "../../utils/response.util";

export class InvestmentInsightController {
  private investmentInsightService = new InvestmentInsightService();
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
}
