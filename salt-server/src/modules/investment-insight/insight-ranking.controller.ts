import { Request, Response } from "express";
import { InsightRankingService } from "./insight-ranking.service";
import { ResponseUtil } from "../../utils/response.util";

export class InsightRankingController {
  private service = new InsightRankingService();

  async getTopInsights(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      const insights = await this.service.getTopInsights(userId);

      return ResponseUtil.success(res, insights);
    } catch (error) {
      return ResponseUtil.error(res, "INSIGHT_RANKING_FAILED");
    }
  }
}
